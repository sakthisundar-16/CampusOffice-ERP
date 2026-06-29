from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import Optional
from ...database import SessionLocal
from ...models import User, Student, Department
from ...schemas import UserUpdate
from ...core.config import settings
from ...core.security import get_current_active_user
import os
import uuid

router = APIRouter(prefix="/api/v1/profile", tags=["profile"])

UPLOAD_DIR = f"{settings.UPLOAD_DIR}/photos"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/me")
async def get_profile(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    department = db.query(Department).filter(Department.id == current_user.department_id).first() if current_user.department_id else None
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "student_id": current_user.student_id,
        "phone": current_user.phone,
        "address": current_user.address,
        "photo": current_user.photo,
        "department": department.name if department else None,
        "department_code": department.code if department else None,
        "roll_number": student.roll_number if student else None,
        "current_semester": student.current_semester if student else None,
        "gpa": student.gpa if student else None,
        "admission_date": student.admission_date.isoformat() if student and student.admission_date else None,
    }

@router.put("/me")
async def update_profile(
    full_name: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    user_to_update = db.query(User).filter(User.id == current_user.id).first()
    if not user_to_update:
        raise HTTPException(status_code=404, detail="User not found")

    if full_name:
        user_to_update.full_name = full_name
    if phone:
        user_to_update.phone = phone
    if address:
        user_to_update.address = address
    
    if photo:
        file_extension = photo.filename.split(".")[-1].lower()
        if file_extension not in ["jpg", "jpeg", "png"]:
            raise HTTPException(status_code=400, detail="Only jpg, jpeg, png files are allowed.")
        
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        with open(file_path, "wb") as f:
            f.write(photo.file.read())
        user_to_update.photo = file_path
    
    db.commit()
    db.refresh(user_to_update)
    
    return {"message": "Profile updated successfully"}