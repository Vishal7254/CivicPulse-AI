import os
import hashlib
from dotenv import load_dotenv
load_dotenv()

import urllib.request
import resend
import urllib.parse
import json

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import secrets
from pathlib import Path
from PIL import Image
from io import BytesIO

from ultralytics import YOLO

from fastapi import (
    FastAPI,
    Depends,
    File,
    UploadFile,
    Form,
    HTTPException
)

from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .database import Base, engine, SessionLocal
from fastapi.staticfiles import StaticFiles

from . import models

from .auth import (
    hash_password,
    get_current_user,
    verify_password,
    create_access_token
)

from pydantic import BaseModel


Base.metadata.create_all(bind=engine)

os.makedirs("app/uploads", exist_ok=True)

app = FastAPI()

# =========================
# HEALTH CHECK
# =========================

@app.get("/health")
def health_check():
    return {
        "status": "ok"
    }

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
resend.api_key = RESEND_API_KEY


# =========================
# TIMEZONE HELPER
# =========================

IST = ZoneInfo("Asia/Kolkata")


def to_ist(dt):
    if dt is None:
        return None

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    return dt.astimezone(IST).isoformat()

app.mount("/uploads", StaticFiles(directory="app/uploads"), name="uploads")
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
cors_origins_env = os.getenv("CORS_ORIGINS", "")
if cors_origins_env:
    allowed_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
else:
    allowed_origins = list({frontend_url, "http://localhost:3000", "http://127.0.0.1:3000"})

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
)
def reverse_geocode(latitude: float, longitude: float):
    params = urllib.parse.urlencode({
        "lat": latitude,
        "lon": longitude,
        "format": "jsonv2",
        "addressdetails": 1,
        "zoom": 18
    })

    url = f"https://nominatim.openstreetmap.org/reverse?{params}"

    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "CivicPulse-AI/1.0"
        }
    )

    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            data = json.loads(response.read().decode("utf-8"))

        address_data = data.get("address", {})

        return {
            "road": address_data.get("road"),
            "city": (
                address_data.get("city")
                or address_data.get("town")
                or address_data.get("village")
                or address_data.get("municipality")
            ),
            "state": address_data.get("state"),
            "country": address_data.get("country")
        }

    except Exception as e:
        print("Reverse geocoding failed:", e)

        return {
            "road": None,
            "city": None,
            "state": None,
            "country": None
        }

# =========================
# YOLO MODEL
# =========================

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "models" / "best.pt"

yolo_model = YOLO(str(MODEL_PATH))

# =========================================================
# ANTI-SPAM / DUPLICATE PROTECTION
# =========================================================

DUPLICATE_DISTANCE_METERS = 50
DUPLICATE_ATTEMPT_LIMIT = 3
DUPLICATE_BLOCK_HOURS = 24


def calculate_distance_meters(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float
):
    from math import radians, sin, cos, sqrt, atan2

    earth_radius = 6371000

    lat1_rad = radians(lat1)
    lat2_rad = radians(lat2)

    delta_lat = radians(lat2 - lat1)
    delta_lon = radians(lon2 - lon1)

    a = (
        sin(delta_lat / 2) ** 2
        + cos(lat1_rad)
        * cos(lat2_rad)
        * sin(delta_lon / 2) ** 2
    )

    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return earth_radius * c


def calculate_image_hash(file_bytes: bytes):
    return hashlib.sha256(file_bytes).hexdigest()


def find_duplicate_complaint(
    db: Session,
    latitude: float,
    longitude: float,
    category: str,
    image_hash: str | None
):
    complaints = (
        db.query(models.Complaint)
        .filter(
            models.Complaint.status.in_([
                "pending",
                "verified",
                "assigned",
                "in_progress"
            ]),
            models.Complaint.category == category
        )
        .all()
    )

    for complaint in complaints:

        # Exact same image
        if (
            image_hash
            and complaint.image_hash
            and complaint.image_hash == image_hash
        ):
            return complaint

        # Same category + nearby location
        distance = calculate_distance_meters(
            latitude,
            longitude,
            complaint.latitude,
            complaint.longitude
        )

        if distance <= DUPLICATE_DISTANCE_METERS:
            return complaint

    return None


# =========================
# YOLO POTHOLE DETECTION
# =========================

@app.post("/detect-pothole")
async def detect_pothole(
    image: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user)
):
    upload_dir = BASE_DIR / "app" / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_bytes = await image.read()

    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/webp",
    }

    if image.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Only JPEG, PNG, and WEBP images are allowed."
        )

    MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB

    if len(file_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image size must be 5 MB or less."
        )

    try:
        image_check = Image.open(BytesIO(file_bytes))
        image_check.verify()
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid image file."
        )

    safe_filename = f"{secrets.token_hex(16)}_{Path(image.filename).name}"
    file_path = upload_dir / safe_filename

    with open(file_path, "wb") as buffer:
        buffer.write(file_bytes)

    detections = []

    try:
        results = yolo_model(
            str(file_path),
            conf=0.40
        )

        for result in results:
            for box in result.boxes:

                class_id = int(box.cls[0])
                confidence = float(box.conf[0])

                x1, y1, x2, y2 = box.xyxy[0].tolist()

                class_name = yolo_model.names[class_id]

                detections.append({
                    "class": class_name,
                    "confidence": round(confidence, 3),
                    "bounding_box": {
                        "x1": round(x1, 2),
                        "y1": round(y1, 2),
                        "x2": round(x2, 2),
                        "y2": round(y2, 2)
                    }
                })

    finally:
        if file_path.exists():
            file_path.unlink()

    potholes = [
        d for d in detections
        if d["class"] == "pothole"
    ]

    return {
        "message": "Detection completed",
        "pothole_detected": len(potholes) > 0,
        "pothole_count": len(potholes),
        "detections": detections
    }

# =========================
# REQUEST SCHEMAS
# =========================

class LoginRequest(BaseModel):
    email: str
    password: str

class ComplaintRequest(BaseModel):
    title: str
    description: str
    category: str
    latitude: float
    longitude: float
    address: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    phone: str
    role: str = "citizen"
    city: str
    address: str
    password: str


class UpdateUserRequest(BaseModel):
    name: str
    phone: str
    city: str
    address: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

# =========================
# HOME & HEALTH
# =========================

@app.get("/")
def home():
    return {
        "message": "CivicPulse AI Backend is Running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok"
    }

# =========================
# CREATE users
# =========================

@app.post("/users")
def create_user(data: RegisterRequest):
    db = SessionLocal()

    existing_user = db.query(models.User).filter(
        models.User.email == data.email
    ).first()

    if existing_user:
        db.close()
        return {
            "message": "Email already registered"
        }

    user = models.User(
    name=data.name,
    email=data.email,
    phone=data.phone,
    role="citizen",
    city=data.city,
    address=data.address,
    password=hash_password(data.password)
)

    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()

    return {
        "message": "User registered successfully",
        "user_id": user.id
    }


# =========================
# GET USERS
# =========================

@app.get("/users")
def get_users(
    current_user=Depends(get_current_user)
):
    if current_user is None:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    db = SessionLocal()

    users = db.query(models.User).all()

    result = []

    for user in users:
        result.append({
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "city": user.city,
            "address": user.address
        })

    db.close()

    return result

    # =========================
# UPDATE USER
# =========================

@app.put("/users/{user_id}")
def update_user(
    user_id: int,
    user_data: dict,
    current_user=Depends(get_current_user)
):
    if current_user is None:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(
            status_code=403,
            detail="You can only update your own profile"
        )

    db = SessionLocal()

    try:
        user = (
            db.query(models.User)
            .filter(models.User.id == user_id)
            .first()
        )

        if user is None:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        user.name = user_data.get("name", user.name)
        user.phone = user_data.get("phone", user.phone)
        user.city = user_data.get("city", user.city)
        user.address = user_data.get("address", user.address)

        db.commit()
        db.refresh(user)

        return {
            "message": "User updated successfully",
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "phone": user.phone,
                "role": user.role,
                "city": user.city,
                "address": user.address
            }
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update user."
        )

    finally:
        db.close()


# =========================
# DELETE USER
# =========================

@app.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_user=Depends(get_current_user)
):
    if current_user is None:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    if current_user.id == user_id:
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own account"
        )

    db = SessionLocal()

    try:
        user = (
            db.query(models.User)
            .filter(models.User.id == user_id)
            .first()
        )

        if user is None:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        # Check whether user is linked to complaints
        complaint_count = (
            db.query(models.Complaint)
            .filter(
                (models.Complaint.user_id == user_id) |
                (models.Complaint.verified_by == user_id) |
                (models.Complaint.assigned_to == user_id)
            )
            .count()
        )

        if complaint_count > 0:
            raise HTTPException(
                status_code=409,
                detail="This user is linked to existing complaint records and cannot be deleted."
            )

        # Delete related notifications
        db.query(models.Notification).filter(
            models.Notification.user_id == user_id
        ).delete(synchronize_session=False)

        # Delete related feedback
        db.query(models.Feedback).filter(
            models.Feedback.user_id == user_id
        ).delete(synchronize_session=False)

        # Delete password reset tokens
        db.query(models.PasswordResetToken).filter(
            models.PasswordResetToken.user_id == user_id
        ).delete(synchronize_session=False)

        db.delete(user)
        db.commit()

        return {
            "message": "User deleted successfully",
            "user_id": user_id
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to delete user."
        )

    finally:
        db.close()
#===================
# CREATE COMPLAINT + AI
# =========================

@app.post("/complaints")
async def create_complaint(
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    address: str = Form(...),
    current_user=Depends(get_current_user),
    image: UploadFile = File(None)
):

    if current_user is None:
        raise HTTPException(
        status_code=401,
        detail="Unauthorized"
    )
    db = SessionLocal()

    image_url = None
    ai_detections = []
    pothole_detected = False
    pothole_count = 0
    priority = "normal"
    image_hash = None
    ai_detected = False
    ai_detection_type = None
    ai_detection_count = 0

    # =========================
    # REVERSE GEOCODING
    # =========================

    location_data = reverse_geocode(latitude, longitude)

    road = location_data["road"]
    city = location_data["city"]
    state = location_data["state"]
    country = location_data["country"]

       # =========================
    # SAVE IMAGE
    # =========================

    if image:

        # Read image once
        file_bytes = await image.read()

        allowed_types = {
            "image/jpeg",
            "image/png",
            "image/webp",
        }

        if image.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail="Only JPEG, PNG, and WEBP images are allowed."
            )

        MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB

        if len(file_bytes) > MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="Image size must be 5 MB or less."
            )

        try:
            image_check = Image.open(BytesIO(file_bytes))
            image_check.verify()
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="Invalid image file."
            )

        # Generate image hash for duplicate detection
        image_hash = calculate_image_hash(file_bytes)

        safe_filename = f"{secrets.token_hex(16)}_{Path(image.filename).name}"
        file_path = f"app/uploads/{safe_filename}"

        with open(file_path, "wb") as buffer:
            buffer.write(file_bytes)

        image_url = file_path

        # =========================
        # YOLO AI DETECTION
        # =========================

        # Current best.pt is a road-damage model.
        # Supported classes:
        # pothole, crocodile crack, longitudinal crack

        road_categories = [
            "Road",
            "Road Damage",
            "Pothole",
            "Road/Pothole"
        ]

        use_road_ai = category.strip() in road_categories

        if use_road_ai:

            results = yolo_model(
                file_path,
                conf=0.40
            )

            for result in results:

                for box in result.boxes:

                    class_id = int(box.cls[0])
                    confidence = float(box.conf[0])
                    class_name = yolo_model.names[class_id]

                    x1, y1, x2, y2 = box.xyxy[0].tolist()

                    ai_detections.append({
                        "class": class_name,
                        "confidence": round(confidence, 3),
                        "bounding_box": {
                            "x1": round(x1, 2),
                            "y1": round(y1, 2),
                            "x2": round(x2, 2),
                            "y2": round(y2, 2)
                        }
                    })

                    # Generic AI detection
                    if class_name in [
                        "pothole",
                        "crocodile crack",
                        "longitudinal crack"
                    ]:
                        ai_detected = True

                        if ai_detection_type is None:
                            ai_detection_type = class_name

                    # Backward-compatible pothole detection
                    if class_name == "pothole":
                        pothole_detected = True
                        pothole_count += 1

            # Total number of AI-detected objects
            ai_detection_count = len(ai_detections)


        # =========================
        # PRIORITY CALCULATION
        # =========================

        if pothole_count >= 3:
            priority = "critical"
        elif pothole_count >= 1:
            priority = "high"
        else:
            priority = "normal"


           # =========================
    # DUPLICATE COMPLAINT CHECK
    # =========================

    now = datetime.utcnow()

    # Check 24-hour restriction
    if (
        current_user.duplicate_blocked_until
        and current_user.duplicate_blocked_until > now
    ):
        remaining = current_user.duplicate_blocked_until - now

        remaining_hours = max(
            1,
            int(remaining.total_seconds() // 3600)
        )

        db.close()

        raise HTTPException(
            status_code=429,
            detail=(
                "Your account is temporarily restricted because "
                "of repeated duplicate complaints. "
                f"Please try again after approximately "
                f"{remaining_hours} hour(s)."
            )
        )

    # Reset duplicate attempts after 24 hours
    if (
        current_user.last_duplicate_attempt_at
        and (
            now - current_user.last_duplicate_attempt_at
        ) > timedelta(hours=24)
    ):
        current_user.duplicate_attempts = 0
        current_user.last_duplicate_attempt_at = None
        db.commit()

    # Find existing duplicate complaint
    duplicate_complaint = find_duplicate_complaint(
        db=db,
        latitude=latitude,
        longitude=longitude,
        category=category,
        image_hash=image_hash
    )

    print(
        "DUPLICATE DEBUG:",
        "user=", current_user.id,
        "lat=", latitude,
        "lon=", longitude,
        "category=", repr(category),
        "image_hash=", image_hash
    )

    print(
        "DUPLICATE FOUND:",
        duplicate_complaint.id if duplicate_complaint else None
    )

    if duplicate_complaint:

        current_user.duplicate_attempts += 1
        current_user.last_duplicate_attempt_at = now

        attempts = current_user.duplicate_attempts
        duplicate_complaint_id = duplicate_complaint.id

        # 4th duplicate attempt = 24-hour restriction
        if attempts > DUPLICATE_ATTEMPT_LIMIT:

            current_user.duplicate_blocked_until = (
                now + timedelta(hours=DUPLICATE_BLOCK_HOURS)
            )

            db.commit()
            db.close()

            raise HTTPException(
                status_code=429,
                detail=(
                    "Repeated duplicate complaint attempts detected. "
                    "Your account has been restricted for 24 hours."
                )
            )

        db.commit()
        db.close()

        remaining_attempts = (
            DUPLICATE_ATTEMPT_LIMIT - attempts
        )

        raise HTTPException(
            status_code=409,
            detail=(
                f"A similar complaint already exists "
                f"(Complaint #{duplicate_complaint_id}). "
                f"Duplicate attempt {attempts} detected. "
                f"You have {remaining_attempts} duplicate "
                f"attempt(s) remaining before a 24-hour restriction."
            )
        )

     # =========================
    # CREATE COMPLAINT RECORD
    # =========================

    complaint = models.Complaint(
        user_id=current_user.id,
        title=title,
        description=description,
        category=category,
        latitude=latitude,
        longitude=longitude,
        address=address,

        road=road,
        city=city,
        state=state,
        country=country,

        image_url=image_url,
        image_hash=image_hash,

        status="pending",
        priority=priority,

        pothole_count=pothole_count,

        ai_confidence=max(
            [d["confidence"] for d in ai_detections],
            default=None
        ),

        ai_detected=ai_detected,
        ai_detection_type=ai_detection_type,
        ai_detection_count=ai_detection_count,

        ai_detections=(
            json.dumps(ai_detections)
            if ai_detections
            else None
        )
    )

    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    return {
        "message": "Complaint submitted successfully",
        "complaint_id": complaint.id,
        "title": complaint.title,
        "status": complaint.status,
        "priority": complaint.priority,
        "ai_detected": complaint.ai_detected,
        "ai_detection_type": complaint.ai_detection_type,
        "ai_detection_count": complaint.ai_detection_count,
        "pothole_count": complaint.pothole_count,
        "ai_confidence": complaint.ai_confidence
    }

# =========================
# GET COMPLAINTS
# =========================

@app.get("/complaints")
def get_complaints(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user is None:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

    if current_user.role == "admin":
        complaints = (
            db.query(models.Complaint)
            .all()
        )
    else:
        complaints = (
            db.query(models.Complaint)
            .filter(
                models.Complaint.user_id == current_user.id
            )
            .all()
        )

    result = []

    for complaint in complaints:

        complaint_feedbacks = (
            db.query(models.Feedback)
            .filter(
                models.Feedback.complaint_id == complaint.id
            )
            .all()
        )

        result.append({
            "id": complaint.id,
            "user_id": complaint.user_id,
            "title": complaint.title,
            "description": complaint.description,
            "category": complaint.category,
            "latitude": complaint.latitude,
            "longitude": complaint.longitude,
            "address": complaint.address,
            "road": complaint.road,
            "city": complaint.city,
            "state": complaint.state,
            "country": complaint.country,
            "image_url": complaint.image_url,
            "status": complaint.status,
            "priority": complaint.priority,
            "pothole_count": complaint.pothole_count,
            "ai_confidence": complaint.ai_confidence,
            "ai_detected": complaint.ai_detected,
            "ai_detection_type": complaint.ai_detection_type,
            "ai_detection_count": complaint.ai_detection_count,
            "ai_detections": complaint.ai_detections,
            "verified_by": complaint.verified_by,
            "verified_at": to_ist(complaint.verified_at),
            "department_assigned_at": to_ist(
                complaint.department_assigned_at
            ),
            "officer_assigned_at": to_ist(
                complaint.officer_assigned_at
            ),
            "in_progress_at": to_ist(
                complaint.in_progress_at
            ),
            "action_taken_at": to_ist(
                complaint.action_taken_at
            ),
            "department": complaint.department,
            "assigned_to": complaint.assigned_to,
            "rejection_reason": complaint.rejection_reason,
            "action_taken": complaint.action_taken,
            "resolved_at": to_ist(complaint.resolved_at),
            "created_at": to_ist(complaint.created_at),
            "updated_at": to_ist(complaint.updated_at),

            "feedback": [
                {
                    "id": feedback.id,
                    "rating": feedback.rating,
                    "comment": feedback.comment,
                    "user_id": feedback.user_id,
                    "created_at": to_ist(feedback.created_at)
                }
                for feedback in complaint_feedbacks
            ]
        })

    return result
# =========================================================
# CITIZEN COMPLAINT TRACKING
# =========================================================

@app.get("/complaints/{complaint_id}/track")
def track_complaint(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user is None:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

    complaint = (
        db.query(models.Complaint)
        .filter(models.Complaint.id == complaint_id)
        .first()
    )

    if complaint is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )

    # Only complaint owner can track the complaint
    if complaint.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to view this complaint"
        )

    return {
        "complaint_id": complaint.id,
        "title": complaint.title,
        "category": complaint.category,
        "status": complaint.status,
        "priority": complaint.priority,
        "department": complaint.department,
        "assigned_to": complaint.assigned_to,
        "verified_at": to_ist(complaint.verified_at),
        "action_taken": complaint.action_taken,
        "resolved_at": to_ist(complaint.resolved_at),
        "created_at": to_ist(complaint.created_at),
        "updated_at": to_ist(complaint.updated_at)
    }

# =========================
# VERIFY COMPLAINT
# =========================

@app.patch("/complaints/{complaint_id}/verify")
def verify_complaint(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):

    if current_user is None:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admin can verify complaints"
        )

    complaint = (
        db.query(models.Complaint)
        .filter(models.Complaint.id == complaint_id)
        .first()
    )

    if complaint is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )

    if complaint.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot verify complaint with status '{complaint.status}'. Only pending complaints can be verified."
        )

    complaint.status = "verified"
    complaint.verified_by = current_user.id
    complaint.verified_at = datetime.utcnow()
    create_notification(
    db=db,
    user_id=complaint.user_id,
    complaint_id=complaint.id,
    message=f"Your complaint #{complaint.id} has been verified by the administration.",
    notification_type="complaint_verified"
)

    db.commit()
    db.refresh(complaint)

    return {
        "message": "Complaint verified successfully",
        "complaint_id": complaint.id,
        "status": complaint.status,
        "verified_by": complaint.verified_by,
        "verified_at": complaint.verified_at
    }
# =========================
# REJECT COMPLAINT
# =========================


class RejectComplaintRequest(BaseModel):
    rejection_reason: str


@app.patch("/complaints/{complaint_id}/reject")
def reject_complaint(
    complaint_id: int,
    data: RejectComplaintRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):

    if current_user is None:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admin can reject complaints"
        )

    complaint = (
        db.query(models.Complaint)
        .filter(models.Complaint.id == complaint_id)
        .first()
    )

    if complaint is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )

    if complaint.status not in ["pending", "verified"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reject complaint with status '{complaint.status}'. Only pending or verified complaints can be rejected."
        )

    if not data.rejection_reason.strip():
        raise HTTPException(
            status_code=400,
            detail="Rejection reason is required"
        )

    complaint.status = "rejected"
    complaint.rejection_reason = data.rejection_reason.strip()
    create_notification(
    db=db,
    user_id=complaint.user_id,
    complaint_id=complaint.id,
    message=f"Your complaint #{complaint.id} has been rejected. Reason: {complaint.rejection_reason}",
    notification_type="complaint_rejected"
)
    db.commit()
    db.refresh(complaint)

    return {
        "message": "Complaint rejected successfully",
        "complaint_id": complaint.id,
        "status": complaint.status,
        "rejection_reason": complaint.rejection_reason
    }
# =========================
# ASSIGN DEPARTMENT
# =========================

class DepartmentAssignmentRequest(BaseModel):
    department: str


@app.patch("/complaints/{complaint_id}/department")
def assign_department(
    complaint_id: int,
    data: DepartmentAssignmentRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):

    if current_user is None:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admin can assign department"
        )

    complaint = (
        db.query(models.Complaint)
        .filter(models.Complaint.id == complaint_id)
        .first()
    )

    if complaint is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )

    allowed_departments = [
        "Roads",
        "Sanitation",
        "Water",
        "Electrical"
    ]

    if data.department not in allowed_departments:
        raise HTTPException(
            status_code=400,
            detail="Invalid department"
        )

    complaint.department = data.department
    complaint.department_assigned_at = datetime.utcnow()
    create_notification(
    db=db,
    user_id=complaint.user_id,
    complaint_id=complaint.id,
    message=f"Your complaint #{complaint.id} has been assigned to the {complaint.department} department.",
    notification_type="department_assigned"
)

    db.commit()
    db.refresh(complaint)

    return {
        "message": "Department assigned successfully",
        "complaint_id": complaint.id,
        "department": complaint.department
    }

# =========================
# ASSIGN OFFICER
# =========================

class OfficerAssignmentRequest(BaseModel):
    officer_id: int


@app.patch("/complaints/{complaint_id}/officer")
def assign_officer(
    complaint_id: int,
    data: OfficerAssignmentRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):

    if current_user is None:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admin can assign officer"
        )

    complaint = (
        db.query(models.Complaint)
        .filter(models.Complaint.id == complaint_id)
        .first()
    )

    if complaint is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )

    officer = (
        db.query(models.User)
        .filter(models.User.id == data.officer_id)
        .first()
    )

    if officer is None:
        raise HTTPException(
            status_code=404,
            detail="Officer not found"
        )

    if officer.role != "officer":
        raise HTTPException(
            status_code=400,
            detail="Selected user is not an officer"
        )

    complaint.assigned_to = officer.id
    complaint.officer_assigned_at = datetime.utcnow()
    complaint.status = "assigned"
    create_notification(
    db=db,
    user_id=complaint.user_id,
    complaint_id=complaint.id,
    message=f"Officer has been assigned to your complaint #{complaint.id}.",
    notification_type="officer_assigned"
)

    db.commit()
    db.refresh(complaint)

    return {
        "message": "Officer assigned successfully",
        "complaint_id": complaint.id,
        "assigned_to": complaint.assigned_to
    }

# =========================
# WORKFLOW STATUS UPDATE
# =========================

class WorkflowStatusRequest(BaseModel):
    status: str


@app.patch("/complaints/{complaint_id}/workflow-status")
def update_workflow_status(
    complaint_id: int,
    data: WorkflowStatusRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user is None:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admin can update workflow status"
        )

    complaint = (
        db.query(models.Complaint)
        .filter(models.Complaint.id == complaint_id)
        .first()
    )

    if complaint is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )

    allowed_statuses = [
        "pending",
        "verified",
        "assigned",
        "in_progress",
        "resolved",
        "rejected"
    ]

    if data.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid workflow status"
        )

    current_status = complaint.status

    valid_transitions = {
        "pending": ["verified", "rejected"],
        "verified": ["assigned", "rejected"],
        "assigned": ["in_progress"],
        "in_progress": ["resolved"],
        "resolved": [],
        "rejected": []
    }

    if data.status not in valid_transitions.get(current_status, []):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status transition: {current_status} -> {data.status}"
        )

    if data.status == "resolved" and not (
    complaint.action_taken and complaint.action_taken.strip()
):
        raise HTTPException(
            status_code=400,
            detail="Action taken must be recorded before resolving complaint"
    )
    complaint.status = data.status

    if data.status == "in_progress":
        complaint.in_progress_at = datetime.utcnow()

    if data.status == "resolved":
        complaint.resolved_at = datetime.utcnow()

    create_notification(
        db=db,
        user_id=complaint.user_id,
        complaint_id=complaint.id,
        message=f"Your complaint #{complaint.id} status has been updated to '{complaint.status}'.",
        notification_type="status_update"
    )

    db.commit()
    db.refresh(complaint)

    return {
        "message": "Workflow status updated successfully",
        "complaint_id": complaint.id,
        "old_status": current_status,
        "new_status": complaint.status
    }

@app.patch("/complaints/{complaint_id}/status")
def update_status_alias(
    complaint_id: int,
    status: str | None = None,
    data: WorkflowStatusRequest | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    target_status = status or (data.status if data else None)
    if not target_status:
        raise HTTPException(
            status_code=400,
            detail="Status parameter is required"
        )
    return update_workflow_status(
        complaint_id=complaint_id,
        data=WorkflowStatusRequest(status=target_status),
        db=db,
        current_user=current_user
    )


# =========================================================
# ADMIN ANALYTICS — COMPLAINT STATISTICS
# =========================================================

@app.get("/admin/analytics/complaints")
def get_complaint_statistics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user is None:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admin can view analytics"
        )

    total = db.query(models.Complaint).count()

    pending = db.query(models.Complaint).filter(
        models.Complaint.status == "pending"
    ).count()

    verified = db.query(models.Complaint).filter(
        models.Complaint.status == "verified"
    ).count()

    assigned = db.query(models.Complaint).filter(
        models.Complaint.status == "assigned"
    ).count()

    in_progress = db.query(models.Complaint).filter(
        models.Complaint.status == "in_progress"
    ).count()

    resolved = db.query(models.Complaint).filter(
        models.Complaint.status == "resolved"
    ).count()

    rejected = db.query(models.Complaint).filter(
        models.Complaint.status == "rejected"
    ).count()

    return {
        "total_complaints": total,
        "pending": pending,
        "verified": verified,
        "assigned": assigned,
        "in_progress": in_progress,
        "resolved": resolved,
        "rejected": rejected
    }
    # =========================================================
# ADMIN ANALYTICS — CATEGORY-WISE COMPLAINTS
# =========================================================

@app.get("/admin/analytics/categories")
def get_category_statistics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user is None:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admin can view analytics"
        )

    complaints = db.query(models.Complaint).all()

    category_counts = {}

    for complaint in complaints:
        
        category = (complaint.category or "Unknown").strip()

        if category not in category_counts:
            category_counts[category] = 0

        category_counts[category] += 1

    return {
        "category_wise_complaints": category_counts
    }

    # =========================================================
# ADMIN ANALYTICS — PRIORITY-WISE COMPLAINTS
# =========================================================

@app.get("/admin/analytics/priorities")
def get_priority_statistics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user is None:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admin can view analytics"
        )

    complaints = db.query(models.Complaint).all()

    priority_counts = {}

    for complaint in complaints:
        priority = (complaint.priority or "Unknown").strip()

        if priority not in priority_counts:
            priority_counts[priority] = 0

        priority_counts[priority] += 1

    return {
        "priority_wise_complaints": priority_counts
    }

    # =========================================================
# ADMIN ANALYTICS — DEPARTMENT-WISE COMPLAINTS
# =========================================================

@app.get("/admin/analytics/departments")
def get_department_statistics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user is None:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admin can view analytics"
        )

    complaints = db.query(models.Complaint).all()

    department_counts = {}

    for complaint in complaints:
        department = (complaint.department or "Unassigned").strip()

        if department not in department_counts:
            department_counts[department] = 0

        department_counts[department] += 1

    return {
        "department_wise_complaints": department_counts
    }

    # =========================================================
# ADMIN ANALYTICS — RESOLUTION RATE
# =========================================================

@app.get("/admin/analytics/resolution-rate")
def get_resolution_rate(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user is None:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admin can view analytics"
        )

    total = db.query(models.Complaint).count()

    resolved = db.query(models.Complaint).filter(
        models.Complaint.status == "resolved"
    ).count()

    resolution_rate = 0

    if total > 0:
        resolution_rate = round((resolved / total) * 100, 2)

    return {
        "total_complaints": total,
        "resolved_complaints": resolved,
        "resolution_rate_percent": resolution_rate
    }
    # =========================================================
# ADMIN ANALYTICS — AVERAGE RESOLUTION TIME
# =========================================================

@app.get("/admin/analytics/average-resolution-time")
def get_average_resolution_time(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user is None:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admin can view analytics"
        )

    resolved_complaints = db.query(models.Complaint).filter(
        models.Complaint.status == "resolved",
        models.Complaint.created_at.isnot(None),
        models.Complaint.resolved_at.isnot(None)
    ).all()

    if not resolved_complaints:
        return {
            "resolved_complaints": 0,
            "average_resolution_time_hours": 0
        }

    total_seconds = 0

    for complaint in resolved_complaints:
        resolution_time = (
            complaint.resolved_at - complaint.created_at
        )

        total_seconds += resolution_time.total_seconds()

    average_seconds = total_seconds / len(resolved_complaints)
    average_hours = round(average_seconds / 3600, 2)

    return {
        "resolved_complaints": len(resolved_complaints),
        "average_resolution_time_hours": average_hours
    }
    # =========================================================
# ADMIN ANALYTICS — MONTHLY COMPLAINT TREND
# =========================================================

@app.get("/admin/analytics/monthly")
def get_monthly_complaint_statistics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user is None:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admin can view analytics"
        )

    complaints = db.query(models.Complaint).all()

    monthly_counts = {}

    for complaint in complaints:
        if complaint.created_at is None:
            continue

        month = complaint.created_at.strftime("%Y-%m")

        if month not in monthly_counts:
            monthly_counts[month] = 0

        monthly_counts[month] += 1

    return {
        "monthly_complaints": monthly_counts
    }

    # =========================================================
# ADMIN ANALYTICS — COMPLETE SUMMARY
# =========================================================

@app.get("/admin/analytics/summary")
def get_analytics_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user is None:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admin can view analytics"
        )

    complaints = db.query(models.Complaint).all()

    total = len(complaints)

    status_counts = {
        "pending": 0,
        "verified": 0,
        "assigned": 0,
        "in_progress": 0,
        "resolved": 0,
        "rejected": 0
    }

    category_counts = {}
    priority_counts = {}
    department_counts = {}

    total_resolution_seconds = 0
    resolved_count = 0

    for complaint in complaints:

        # Status
        if complaint.status in status_counts:
            status_counts[complaint.status] += 1

        # Category
        category = (complaint.category or "Unknown").strip()
        category_counts[category] = category_counts.get(category, 0) + 1

        # Priority
        priority = (complaint.priority or "Unknown").strip()
        priority_counts[priority] = priority_counts.get(priority, 0) + 1

        # Department
        department = (complaint.department or "Unassigned").strip()
        department_counts[department] = department_counts.get(department, 0) + 1

        # Resolution time
        if complaint.status == "resolved":
            if complaint.created_at and complaint.resolved_at:
                resolution_time = (
                    complaint.resolved_at - complaint.created_at
                )

                total_resolution_seconds += resolution_time.total_seconds()
                resolved_count += 1

    resolution_rate = 0

    if total > 0:
        resolution_rate = round(
            (status_counts["resolved"] / total) * 100,
            2
        )

    average_resolution_hours = 0

    if resolved_count > 0:
        average_resolution_hours = round(
            (total_resolution_seconds / resolved_count) / 3600,
            2
        )

    return {
        "total_complaints": total,
        "status_counts": status_counts,
        "category_wise_complaints": category_counts,
        "priority_wise_complaints": priority_counts,
        "department_wise_complaints": department_counts,
        "resolved_complaints": status_counts["resolved"],
        "resolution_rate_percent": resolution_rate,
        "average_resolution_time_hours": average_resolution_hours
    }

 # =========================================================
# ADMIN ANALYTICS — AI DETECTION STATISTICS
# =========================================================

@app.get("/admin/analytics/ai")
def get_ai_statistics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user is None:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admin can view analytics"
        )

    ai_complaints = db.query(models.Complaint).filter(
        models.Complaint.ai_detected == True
    ).all()

    total_ai_complaints = len(ai_complaints)

    total_potholes = sum(
        complaint.pothole_count or 0
        for complaint in ai_complaints
    )

    average_confidence = 0

    if ai_complaints:
        confidence_values = [
            complaint.ai_confidence
            for complaint in ai_complaints
            if complaint.ai_confidence is not None
        ]

        if confidence_values:
            average_confidence = round(
                sum(confidence_values) / len(confidence_values),
                2
            )

    # =====================================================
    # AI DETECTION TYPE BREAKDOWN
    # =====================================================

    detection_type_breakdown = {}

    for complaint in ai_complaints:
        detection_type = complaint.ai_detection_type

        if detection_type:
            detection_type_breakdown[detection_type] = (
                detection_type_breakdown.get(detection_type, 0) + 1
            )

    return {
        "ai_detected_complaints": total_ai_complaints,
        "total_potholes_detected": total_potholes,
        "average_ai_confidence_percent": round(
            average_confidence * 100,
            2
        ),
        "detection_type_breakdown": detection_type_breakdown
    }

# =========================
# ACTION TAKEN
# =========================

class ActionTakenRequest(BaseModel):
    action_taken: str


@app.patch("/complaints/{complaint_id}/action")
def record_action_taken(
    complaint_id: int,
    data: ActionTakenRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):

    if current_user is None:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admin can record action taken"
        )

    complaint = (
        db.query(models.Complaint)
        .filter(models.Complaint.id == complaint_id)
        .first()
    )

    if complaint is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )

    if not data.action_taken.strip():
        raise HTTPException(
            status_code=400,
            detail="Action taken is required"
        )

    complaint.action_taken = data.action_taken.strip()
    complaint.action_taken_at = datetime.utcnow()
    create_notification(
    db=db,
    user_id=complaint.user_id,
    complaint_id=complaint.id,
    message=f"Action has been taken on your complaint #{complaint.id}: {complaint.action_taken}",
    notification_type="action_taken"
)
    db.commit()
    db.refresh(complaint)

    return {
        "message": "Action taken recorded successfully",
        "complaint_id": complaint.id,
        "action_taken": complaint.action_taken
    }

# =========================
# DELETE COMPLAINT
# =========================

@app.delete("/complaints/{complaint_id}")
def delete_complaint(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user is None:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

    complaint = (
        db.query(models.Complaint)
        .filter(models.Complaint.id == complaint_id)
        .first()
    )

    if complaint is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )

        if complaint.user_id != current_user.id and current_user.role != "admin":
            raise HTTPException(
            status_code=403,
            detail="You are not authorized to delete this complaint"
        )

    if complaint.status in ["resolved", "rejected"]:
        raise HTTPException(
            status_code=400,
            detail="Resolved or rejected complaints cannot be deleted"
        )

    db.delete(complaint)
    db.commit()

    return {
        "message": "Complaint deleted successfully",
        "complaint_id": complaint_id
    }
# =========================
#  LOGIN
# =========================

@app.post("/login")
def login(data: LoginRequest):
    db = SessionLocal()

    user = db.query(models.User).filter(
        models.User.email == data.email
    ).first()

    if user is None:
        db.close()
        return {
            "message": "Invalid email or password"
        }

    if not verify_password(
        data.password,
        user.password
    ):
        db.close()
        return {
            "message": "Invalid email or password"
        }

    access_token = create_access_token({
        "user_id": user.id
    })

    db.close()

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "name": user.name
    }
    # =========================
# SWAGGER LOGIN / TOKEN
# =========================

@app.post("/token")
def login_for_swagger(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(
        models.User.email == form_data.username
    ).first()

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not verify_password(
        form_data.password,
        user.password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    access_token = create_access_token({
        "user_id": user.id
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "name": user.name
    }


# =========================
# FORGOT PASSWORD
# =========================

class ForgotPasswordRequest(BaseModel):
    email: str


@app.post("/forgot-password")
def forgot_password(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(
        models.User.email == data.email
    ).first()

    # Same response for existing/non-existing email
    if not user:
        return {
            "message": "If the email exists, a password reset link has been sent."
        }

    # Invalidate previous unused reset tokens for this user
    db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.user_id == user.id,
        models.PasswordResetToken.used == False
    ).update(
        {"used": True},
        synchronize_session=False
    )

    # Generate secure random token
    reset_token = secrets.token_urlsafe(32)

    # Store only hashed token in database
    reset_token_hash = hashlib.sha256(
        reset_token.encode()
    ).hexdigest()

    # Token valid for 15 minutes
    expires_at = datetime.utcnow() + timedelta(minutes=15)

    # Save hashed token in database
    password_reset = models.PasswordResetToken(
        user_id=user.id,
        token=reset_token_hash,
        expires_at=expires_at,
        used=False
    )

    db.add(password_reset)
    db.commit()
    db.refresh(password_reset)

    frontend_url = os.getenv(
        "FRONTEND_URL",
        "http://localhost:3000"
    ).rstrip("/")

    # Raw token goes only into the email link
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"

    from_email = os.getenv(
        "FROM_EMAIL",
        "CivicPulse AI <onboarding@resend.dev>"
    )

    # Send email using Resend
    try:
        resend.Emails.send({
            "from": from_email,
            "to": [user.email],
            "subject": "CivicPulse AI - Password Reset",
            "html": f"""
                <h2>CivicPulse AI</h2>

                <p>Hello {user.name},</p>

                <p>
                    We received a request to reset your
                    CivicPulse AI password.
                </p>

                <p>
                    <a href="{reset_link}">
                        Reset Password
                    </a>
                </p>

                <p>
                    This link will expire in 15 minutes.
                </p>

                <p>
                    If you did not request a password reset,
                    you can safely ignore this email.
                </p>
            """
        })

    except Exception as e:
        db.delete(password_reset)
        db.commit()

        print("RESEND ERROR:", e)

        raise HTTPException(
            status_code=500,
            detail="Unable to send password reset email at this time. Please try again later."
        )

    return {
        "message": "If the email exists, a password reset link has been sent."
    }
    # =========================================================
# RESET PASSWORD
# =========================================================

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@app.post("/reset-password")
def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    # Check password length
    if len(data.new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters."
        )

    # Hash received reset token before database lookup
    token_hash = hashlib.sha256(
        data.token.encode()
    ).hexdigest()

    # Find reset token
    reset_record = db.query(
        models.PasswordResetToken
    ).filter(
        models.PasswordResetToken.token == token_hash
    ).first()

    # Token not found
    if not reset_record:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token."
        )

    # Token already used
    if reset_record.used:
        raise HTTPException(
            status_code=400,
            detail="This reset link has already been used."
        )

    # Token expired
    if datetime.utcnow() > reset_record.expires_at:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token."
        )

    # Find user
    user = db.query(models.User).filter(
        models.User.id == reset_record.user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User account not found."
        )

    # Prevent setting the same password again
    if verify_password(data.new_password, user.password):
        raise HTTPException(
            status_code=400,
            detail="New password must be different from your current password."
        )

    # Hash new password
    user.password = hash_password(data.new_password)

    # Mark token as used
    reset_record.used = True

    db.commit()

    return {
        "message": "Password reset successfully. You can now login with your new password."
    }
    # =========================
# CREATE NOTIFICATION HELPER
# =========================

def create_notification(
    db: Session,
    user_id: int,
    message: str,
    notification_type: str = "status_update",
    complaint_id: int = None
):
    notification = models.Notification(
        user_id=user_id,
        complaint_id=complaint_id,
        message=message,
        type=notification_type,
        is_read=False
    )

    db.add(notification)
    db.flush()
    return notification

# =========================
# GET MY NOTIFICATIONS
# =========================

@app.get("/notifications")
def get_my_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user is None:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

    notifications = (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id == current_user.id
        )
        .order_by(
            models.Notification.created_at.desc()
        )
        .all()
    )

    return [
        {
            "id": notification.id,
            "complaint_id": notification.complaint_id,
            "message": notification.message,
            "type": notification.type,
            "is_read": notification.is_read,
            "created_at": to_ist(notification.created_at)
        }
        for notification in notifications
    ]

@app.patch("/notifications/read-all")
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    notifications = (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id == current_user.id,
            models.Notification.is_read == False,
        )
        .all()
    )

    for notification in notifications:
        notification.is_read = True

    db.commit()

    return {
        "message": "All notifications marked as read",
        "updated_count": len(notifications),
    }
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    notification = (
        db.query(models.Notification)
        .filter(
            models.Notification.id == notification_id,
            models.Notification.user_id == current_user.id,
        )
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found",
        )

    notification.is_read = True
    db.commit()
    db.refresh(notification)

    return {
        "message": "Notification marked as read",
        "notification_id": notification.id,
        "is_read": notification.is_read,
    }


# =========================
# MARK NOTIFICATION AS READ
# =========================

@app.patch("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user is None:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

    notification = (
        db.query(models.Notification)
        .filter(
            models.Notification.id == notification_id,
            models.Notification.user_id == current_user.id
        )
        .first()
    )

    if notification is None:
        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    notification.is_read = True

    db.commit()
    db.refresh(notification)

    return {
        "message": "Notification marked as read",
        "notification_id": notification.id,
        "is_read": notification.is_read
    }

    # =========================
# SUBMIT FEEDBACK
# =========================

class FeedbackRequest(BaseModel):
    rating: int
    comment: str | None = None


@app.post("/complaints/{complaint_id}/feedback")
def submit_feedback(
    complaint_id: int,
    request: FeedbackRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user is None:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

    # Find complaint
    complaint = (
        db.query(models.Complaint)
        .filter(models.Complaint.id == complaint_id)
        .first()
    )

    if complaint is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )

    # Only complaint owner can submit feedback
    if complaint.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only submit feedback for your own complaint"
        )

    # Feedback only after resolution
    if complaint.status != "resolved":
        raise HTTPException(
            status_code=400,
            detail="Feedback can only be submitted after complaint is resolved"
        )

    # Validate rating
    if request.rating < 1 or request.rating > 5:
        raise HTTPException(
            status_code=400,
            detail="Rating must be between 1 and 5"
        )

    # Prevent duplicate feedback
    existing_feedback = (
        db.query(models.Feedback)
        .filter(
            models.Feedback.complaint_id == complaint_id,
            models.Feedback.user_id == current_user.id
        )
        .first()
    )

    if existing_feedback is not None:
        raise HTTPException(
            status_code=400,
            detail="Feedback already submitted for this complaint"
        )

    feedback = models.Feedback(
        complaint_id=complaint_id,
        user_id=current_user.id,
        rating=request.rating,
        comment=request.comment
    )

    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    return {
        "message": "Feedback submitted successfully",
        "feedback_id": feedback.id,
        "complaint_id": feedback.complaint_id,
        "rating": feedback.rating,
        "comment": feedback.comment,
        "created_at": to_ist(feedback.created_at)
    }
    # =========================
# GET FEEDBACK FOR COMPLAINT
# =========================

@app.get("/complaints/{complaint_id}/feedback")
def get_complaint_feedback(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user is None:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

    complaint = (
        db.query(models.Complaint)
        .filter(models.Complaint.id == complaint_id)
        .first()
    )

    if complaint is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )

    # Only complaint owner or admin can view feedback
    if (
        complaint.user_id != current_user.id
        and current_user.role not in ["admin", "government"]
    ):
        raise HTTPException(
            status_code=403,
            detail="You are not allowed to view this feedback"
        )

    feedback = (
        db.query(models.Feedback)
        .filter(
            models.Feedback.complaint_id == complaint_id
        )
        .order_by(
            models.Feedback.created_at.desc()
        )
        .all()
    )

    return [
        {
            "id": item.id,
            "complaint_id": item.complaint_id,
            "user_id": item.user_id,
            "rating": item.rating,
            "comment": item.comment,
            "created_at": to_ist(item.created_at)
        }
        for item in feedback
    ]
# =========================
# CURRENT USER
# =========================

@app.get("/me")
def get_my_profile(
    current_user: models.User = Depends(get_current_user)
):
    if current_user is None:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role
    }


# =========================
# CHANGE PASSWORD
# =========================

@app.put("/change-password")
def change_password(
    data: ChangePasswordRequest,
    current_user=Depends(get_current_user)
):
    if current_user is None:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

    # Verify old password
    if not verify_password(
        data.old_password,
        current_user.password
    ):
        raise HTTPException(
            status_code=400,
            detail="Old password is incorrect"
        )
        # New password must be at least 8 characters
    if len(data.new_password) < 8:
        raise HTTPException(
        status_code=400,
        detail="New password must be at least 8 characters"
    )

    # New password must be different from old password
    if verify_password(
        data.new_password,
        current_user.password
    ):
        raise HTTPException(
            status_code=400,
            detail="New password must be different from old password"
        )

    new_hashed_password = hash_password(
        data.new_password
    )

    db = SessionLocal()

    user = db.query(models.User).filter(
        models.User.id == current_user.id
    ).first()

    if user is None:
        db.close()
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    user.password = new_hashed_password

    db.commit()
    db.close()

    return {
        "message": "Password changed successfully"
    }
    @app.get("/admin/analytics")
    def get_admin_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
        if current_user.role != "admin":
            raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    complaints = db.query(models.Complaint).all()

    total = len(complaints)

    pending = sum(1 for c in complaints if c.status == "pending")
    verified = sum(1 for c in complaints if c.status == "verified")
    assigned = sum(1 for c in complaints if c.status == "assigned")
    in_progress = sum(1 for c in complaints if c.status == "in_progress")
    resolved = sum(1 for c in complaints if c.status == "resolved")
    rejected = sum(1 for c in complaints if c.status == "rejected")

    critical = sum(1 for c in complaints if c.priority == "critical")
    high = sum(1 for c in complaints if c.priority == "high")
    normal = sum(1 for c in complaints if c.priority == "normal")

    departments = {}

    for complaint in complaints:
        if complaint.department:
            departments[complaint.department] = (
                departments.get(complaint.department, 0) + 1
            )

    return {
        "total": total,
        "status": {
            "pending": pending,
            "verified": verified,
            "assigned": assigned,
            "in_progress": in_progress,
            "resolved": resolved,
            "rejected": rejected,
        },
        "priority": {
            "critical": critical,
            "high": high,
            "normal": normal,
        },
        "departments": departments,
    }