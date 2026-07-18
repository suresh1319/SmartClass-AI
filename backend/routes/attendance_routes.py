import base64
import logging
from fastapi import APIRouter, HTTPException, status
from models.attendance import MarkFaceAttendanceRequest, MarkManualAttendanceRequest
from services.db_service import db_service
from services.face_service import face_service

logger = logging.getLogger("smartclass_backend")

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.post("/mark-by-face")
def mark_attendance_by_face(payload: MarkFaceAttendanceRequest):
    """
    Accepts a base64 webcam frame, runs face recognition against all enrolled
    students, and marks attendance for the best match if confidence is high enough.
    """
    # Decode base64 image
    try:
        header, encoded = payload.image.split(",", 1) if "," in payload.image else ("", payload.image)
        image_bytes = base64.b64decode(encoded)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid base64 image data")

    # Fetch all enrolled students with embeddings
    enrolled_students = db_service.get_enrolled_students()
    if not enrolled_students:
        return {
            "success": False,
            "reason": "No enrolled students found. Please enroll students first.",
            "student": None,
            "confidence": 0.0,
        }

    # Run face recognition
    matches = face_service.recognize_multiple_faces(image_bytes, enrolled_students)

    if not matches:
        return {
            "success": False,
            "alreadyMarked": False,
            "reason": "No face detected. Look at the camera.",
            "student": None,
            "confidence": 0.0,
            "results": []
        }

    results = []
    reasons = []
    marked_any = False

    for match in matches:
        if not match["recognized"]:
            results.append({
                "success": False,
                "alreadyMarked": False,
                "reason": match["reason"],
                "student": None,
                "confidence": match["confidence"]
            })
            reasons.append(match["reason"])
            continue

        roll_number = match["rollNumber"]
        confidence = match["confidence"]
        student = match["student"]

        # Mark attendance (prevents duplicate for same day)
        marked, message = db_service.mark_attendance(
            roll_number=roll_number,
            full_name=student["fullName"],
            department=student.get("department", ""),
            branch=student.get("branch", ""),
            year=student.get("year", 0),
            section=student.get("section", ""),
            method="face",
            confidence=confidence,
        )

        results.append({
            "success": True,
            "alreadyMarked": not marked,
            "reason": message,
            "student": {
                "rollNumber": roll_number,
                "fullName": student["fullName"],
                "department": student.get("department", ""),
                "branch": student.get("branch", ""),
                "year": student.get("year", 0),
                "section": student.get("section", ""),
            },
            "confidence": round(confidence, 4),
        })
        reasons.append(message)

    # For backward compatibility, map main result to root fields
    recognized_any = any(r["success"] for r in results)
    main_result = None
    for r in results:
        if r["success"]:
            main_result = r
            break
    if not main_result and results:
        main_result = results[0]

    response = {
        "success": recognized_any,
        "reason": "; ".join(reasons) if reasons else "No faces processed",
        "results": results
    }

    if main_result:
        response["alreadyMarked"] = main_result["alreadyMarked"]
        response["student"] = main_result["student"]
        response["confidence"] = main_result["confidence"]
    else:
        response["alreadyMarked"] = False
        response["student"] = None
        response["confidence"] = 0.0

    return response


@router.post("/mark-manual")
def mark_attendance_manual(payload: MarkManualAttendanceRequest):
    """Mark a student present manually by roll number."""
    roll_number = payload.rollNumber.strip().upper()
    student = db_service.get_student(roll_number)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    marked, message = db_service.mark_attendance(
        roll_number=roll_number,
        full_name=student["fullName"],
        department=student.get("department", ""),
        branch=student.get("branch", ""),
        year=student.get("year", 0),
        section=student.get("section", ""),
        method="manual",
        confidence=1.0,
    )

    return {
        "success": True,
        "alreadyMarked": not marked,
        "reason": message,
        "student": {
            "rollNumber": roll_number,
            "fullName": student["fullName"],
        },
    }


@router.get("/today")
def get_today_attendance():
    """Get all attendance records for today."""
    records = db_service.get_today_attendance()
    return {"records": records, "count": len(records)}


@router.get("/stats")
def get_attendance_stats():
    """Get summary stats: total enrolled, present today, absent today, percentage."""
    stats = db_service.get_attendance_stats()
    return stats


@router.get("/student/{rollNumber}")
def get_student_attendance(rollNumber: str):
    """Get full attendance history for a specific student."""
    roll_number = rollNumber.strip().upper()
    student = db_service.get_student(roll_number)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    records = db_service.get_student_attendance(roll_number)
    return {
        "student": {
            "rollNumber": student["rollNumber"],
            "fullName": student["fullName"],
            "department": student.get("department", ""),
            "branch": student.get("branch", ""),
            "year": student.get("year", 0),
            "section": student.get("section", ""),
        },
        "records": records,
        "totalPresent": len(records),
    }


@router.post("/clear-today")
def clear_today_attendance():
    """Clear today's attendance records."""
    try:
        deleted_count = db_service.clear_today_attendance()
        return {
            "success": True,
            "message": f"Successfully cleared today's attendance. Deleted {deleted_count} records.",
            "deletedCount": deleted_count
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error: {e}")

