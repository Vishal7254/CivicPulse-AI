# CivicPulse AI

> An AI-powered smart-city civic complaint management platform for reporting, managing, and resolving road-related civic issues.

## 📌 Overview

CivicPulse AI connects citizens with an administrative workflow for handling civic complaints.

Citizens can submit complaints with location details and optional images. The system uses AI-based image analysis to detect supported road damage and helps administrators verify, assign, track, and resolve complaints.

## 🚀 Key Features

### Citizen Complaint Reporting

- Submit complaints with title and description
- Capture location using browser GPS
- Automatically obtain road and city information
- Upload an optional complaint image
- Track complaint status

### 🤖 AI-Powered Road Damage Detection

The current AI model supports:

- Potholes
- Longitudinal cracks
- Crocodile cracks

AI analysis provides:

- Detected damage type
- Detection count
- Detection confidence
- AI-based complaint priority

### 🏛️ Complaint Management

- Complaint verification and rejection
- Department assignment
- Officer assignment
- Status-based complaint workflow
- Action tracking before resolution
- Duplicate complaint detection

### 📍 Location & Map

- Browser-based GPS detection
- Reverse geocoding
- Road and city information
- Bihar road complaint map using OpenStreetMap
- Complaint markers with priority and AI information

## 🔄 Complaint Workflow

```text
Citizen
   ↓
Submit Complaint
   ↓
AI Image Analysis
   ↓
Priority Calculation
   ↓
Pending
   ↓
Verified / Rejected
   ↓
Department Assignment
   ↓
Officer Assignment
   ↓
In Progress
   ↓
Resolved

🛠️ Technology Stack
Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
Backend
- FastAPI
- Python
- Uvicorn
- SQLAlchemy
- JWT Authentication
Database
- PostgreSQL
AI
- Ultralytics YOLO
Maps & Location
- Leaflet
- React Leaflet
- OpenStreetMap
- Browser Geolocation API
- Nominatim Reverse Geocoding
Development Tools
- Git
- GitHub
- VS Code
🧠 AI Detection
The current AI model focuses on supported road-damage categories:
Detection Type	Description
Pothole	Road surface depression or hole
Longitudinal Crack	Crack extending along the road
Crocodile Crack	Interconnected surface cracking


Each detected bounding box is treated as one AI detection.
🔐 Security
- JWT-based authentication
- Protected API endpoints
- Role-based complaint workflows
- Environment variables for sensitive configuration
- Uploaded files excluded from Git
- Local environment files excluded from Git
📂 Project Structure
CivicPulse-AI/
├── backend/
│   ├── app/
│   └── models/
│
├── frontend/
│   ├── app/
│   ├── components/
│   └── lib/
│
├── openapi.json
└── .gitignore
🔮 Future Scope
- Additional civic issue detection models
- More city and region-specific map support
- Advanced analytics
- Mobile application
- Real-time notifications
- Expanded government department workflows
👨‍💻 Author
Vishal Kumar
B.Tech Computer Science & Engineering Student
- GitHub: Vishal7254
- LinkedIn: Vishal Kumar
- LeetCode: Vishal_72

