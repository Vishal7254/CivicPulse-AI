from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Float,
    DateTime,
    ForeignKey,
    Boolean
)

from sqlalchemy.orm import relationship

from datetime import datetime

from .database import Base


# =========================================================
# USER MODEL
# =========================================================

class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String,
        nullable=False
    )

    email = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    phone = Column(
        String,
        unique=True,
        nullable=True
    )

    role = Column(
        String,
        nullable=False,
        default="citizen"
    )

    city = Column(
        String,
        nullable=True
    )

    address = Column(
        String,
        nullable=True
    )

    password = Column(
        String,
        nullable=False
    )

    # =====================================================
    # ANTI-SPAM / DUPLICATE PROTECTION
    # =====================================================

    # Number of duplicate complaint attempts made by user
    duplicate_attempts = Column(
        Integer,
        nullable=False,
        default=0
    )

    # If user reaches the limit, account is blocked until this time
    duplicate_blocked_until = Column(
        DateTime,
        nullable=True
    )

    # Time of the latest duplicate complaint attempt
    last_duplicate_attempt_at = Column(
        DateTime,
        nullable=True
    )


# =========================================================
# COMPLAINT MODEL
# =========================================================

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    title = Column(
        String,
        nullable=False
    )

    description = Column(
        Text,
        nullable=False
    )

    category = Column(
        String,
        nullable=False
    )

    latitude = Column(
        Float,
        nullable=False
    )

    longitude = Column(
        Float,
        nullable=False
    )

    address = Column(
        String,
        nullable=True
    )

    road = Column(
        String,
        nullable=True
    )

    city = Column(
        String,
        nullable=True
    )

    state = Column(
        String,
        nullable=True
    )

    country = Column(
        String,
        nullable=True
    )

    image_url = Column(
        String,
        nullable=True
    )

    # =====================================================
    # IMAGE DUPLICATE PROTECTION
    # =====================================================

    # SHA-256 hash of uploaded image
    image_hash = Column(
        String,
        nullable=True,
        index=True
    )

    status = Column(
        String,
        default="pending"
    )

    priority = Column(
        String,
        default="normal"
    )

    pothole_count = Column(
        Integer,
        default=0
    )

    ai_confidence = Column(
        Float,
        nullable=True
    )
        # =====================================================
    # GENERIC AI DETECTION
    # =====================================================

    # Whether AI detected a relevant issue in the uploaded image
    ai_detected = Column(
        Boolean,
        nullable=False,
        default=False
    )

    # Type of issue detected by AI
    # Example: pothole, garbage, water_leakage, street_light
    ai_detection_type = Column(
        String,
        nullable=True
    )

    # Number of detected objects/issues
    ai_detection_count = Column(
        Integer,
        nullable=False,
        default=0
    )

    # Detailed AI detection results
    # Stored as JSON text for compatibility
    ai_detections = Column(
        Text,
        nullable=True
    )



    # =====================================================
    # GOVERNMENT WORKFLOW FIELDS
    # =====================================================

    verified_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    verified_at = Column(
        DateTime,
        nullable=True
    )

    department = Column(
        String,
        nullable=True
    )

    # Department assignment time
    department_assigned_at = Column(
        DateTime,
        nullable=True
    )

    assigned_to = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    # Officer assignment time
    officer_assigned_at = Column(
        DateTime,
        nullable=True
    )

    # Work started time
    in_progress_at = Column(
        DateTime,
        nullable=True
    )

    rejection_reason = Column(
        Text,
        nullable=True
    )

    action_taken = Column(
        Text,
        nullable=True
    )

    # Action recorded time
    action_taken_at = Column(
        DateTime,
        nullable=True
    )

    resolved_at = Column(
        DateTime,
        nullable=True
    )

    # =====================================================
    # CREATED / UPDATED TIMESTAMPS
    # =====================================================

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

# =========================================================
# NOTIFICATION MODEL
# =========================================================

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    complaint_id = Column(
        Integer,
        ForeignKey("complaints.id"),
        nullable=True
    )

    message = Column(
        Text,
        nullable=False
    )

    type = Column(
        String,
        nullable=False,
        default="status_update"
    )

    is_read = Column(
        Boolean,
        nullable=False,
        default=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


# =========================================================
# FEEDBACK MODEL
# =========================================================

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    complaint_id = Column(
        Integer,
        ForeignKey("complaints.id"),
        nullable=False
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    rating = Column(
        Integer,
        nullable=False
    )

    comment = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


# =========================================================
# PASSWORD RESET TOKEN MODEL
# =========================================================

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(
        Integer,
        primary_key=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    token = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    expires_at = Column(
        DateTime,
        nullable=False
    )

    used = Column(
        Boolean,
        default=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )