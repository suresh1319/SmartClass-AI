# SmartClass AI - Face Registration Prototype

This is the prototype web application for **SmartClass AI**, an AI-powered classroom attendance system using Computer Vision and CCTV cameras. 

This portal allows students to register and capture a high-quality facial dataset. The captured frames are validated in real-time, saved, and processed to generate face embeddings for attendance model training.

---

## Project Structure

```text
smartclass-ai/
├── frontend/                  # React (Vite + TypeScript + Tailwind)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/             # Home, Register, Capture, UploadProgress, Success
│   │   ├── services/          # api.ts for API requests
│   │   └── App.tsx            # Routes configurations
│   ├── tailwind.config.js
│   └── package.json
│
├── backend/                   # FastAPI Backend
│   ├── routes/                # API router handlers
│   ├── services/              # db_service, face_service
│   ├── models/                # Pydantic schema models
│   ├── dataset/               # Auto-created student face dataset
│   ├── embeddings/            # NPY embedding files
│   ├── models_cache/          # Cached ONNX ArcFace/MobileFaceNet model
│   ├── app.py                 # FastAPI application main entry
│   └── requirements.txt       # Python backend dependencies
│
└── README.md                  # Setup & Run documentation
```

---

## Tech Stack

- **Frontend:** React (Vite), TypeScript, Tailwind CSS, React Router, Axios, Lucide Icons
- **Backend:** Python FastAPI, OpenCV, ONNX Runtime (ArcFace/MobileFaceNet), Pillow, NumPy
- **Database:** MongoDB
- **Storage:** Local filesystem (for student datasets)

---

## Features

1. **Student Registration Form:** Validates name, roll number (unique), email, department, branch, year, and section.
2. **Guided Face Capture:** Captures 100 images sequentially using the webcam across 7 poses:
   - *Look Straight* (20 images)
   - *Turn Left* (15 images)
   - *Turn Right* (15 images)
   - *Look Up* (15 images)
   - *Look Down* (15 images)
   - *Smile* (10 images)
   - *Neutral Expression* (10 images)
3. **Real-time Quality Filtering:** The backend checks each webcam frame dynamically:
   - Rejects if 0 or multiple faces are detected.
   - Rejects if the image is blurry (Laplacian variance < 35).
   - Rejects if lighting is too dark or bright (mean intensity < 40 or > 245).
   - Rejects if the face is too far (area < 8%) or out of frame.
4. **Embedding Generation:** Automatically crops, aligns, and generates a 128-dimensional embedding vector (using MobileFaceNet/ArcFace) for each face, saving them locally (`.npy`) and in MongoDB.

---

## Database Schemas (MongoDB)

Student documents are stored in the `students` collection:

```json
{
  "fullName": "John Doe",
  "rollNumber": "21CS004",
  "email": "john.doe@college.edu",
  "department": "Engineering",
  "branch": "Computer Science",
  "year": 3,
  "section": "A",
  "status": "enrolled",
  "imageCount": 100,
  "embeddingsCount": 100,
  "faceEmbeddings": [
    [0.024, -0.012, 0.089, ...], 
    ...
  ],
  "averageEmbedding": [0.021, -0.011, 0.084, ...],
  "createdAt": "2026-07-17T17:19:00Z",
  "updatedAt": "2026-07-17T17:22:00Z"
}
```

---

## Setup & Running the Application

### Prerequisites
- Python 3.11+
- Node.js v18+ & npm
- MongoDB Server running locally on `localhost:27017`

### 1. Start the Backend API
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create virtual environment and install packages (pre-configured during installation):
   ```bash
   python -m venv .venv
   .\.venv\Scripts\pip install -r requirements.txt
   ```
3. Run the FastAPI application using the virtual environment:
   ```bash
   .\.venv\Scripts\python app.py
   ```
   The backend API will run on `http://localhost:8000`. You can inspect documentation at `http://localhost:8000/docs`.

### 2. Start the React Frontend
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Run the Vite development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## Future Compatibility Features
The backend has been structured to easily scale:
- **CCTV streams:** The `FaceService` accepts generic OpenCV images and can be integrated with `cv2.VideoCapture` streams for real-time corridor processing.
- **Docker deployment:** A simple Dockerfile can containerize the FastAPI service, using MongoDB Atlas for cloud storage.
- **Analytics & Dashboards:** The MongoDB schemas contain academic metadata (branch, year, section) facilitating class-wise and student-wise attendance report aggregations.
