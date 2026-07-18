import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.student_routes import router as student_router
from routes.attendance_routes import router as attendance_router

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("backend.log", encoding="utf-8")
    ]
)
logger = logging.getLogger("smartclass_backend")

app = FastAPI(
    title="SmartClass AI - Face Registration API",
    description="Backend API for student registration, face frame quality validation, dataset collection, and face embedding generation.",
    version="1.0.0"
)

# CORS configurations
# Allow connections from Vite default dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root Endpoint
@app.get("/")
def read_root():
    return {
        "app": "SmartClass AI Face Registration System",
        "status": "Online",
        "version": "1.0.0"
    }

# Mount Routers
app.include_router(student_router)
app.include_router(attendance_router)

# Ensure directories exist
os.makedirs("dataset", exist_ok=True)
os.makedirs("embeddings", exist_ok=True)

if __name__ == "__main__":
    import uvicorn
    # Startup on localhost:8000
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
