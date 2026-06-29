from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, text, desc
from typing import List, Optional
from datetime import datetime
from ...database import SessionLocal
from ...models import User, Student, Staff, Admin as AdminModel, Department, Semester, FeeStructure, PaymentRequest, BonafideRequest, DocumentRequest, AuditLog, Notification
from ...models.user import UserRole
from ...core.config import settings
from ...schemas import (
    UserCreate, UserUpdate, UserResponse,
    StudentCreate, StudentUpdate, StudentResponse, StudentFullCreate,
    StaffCreate, StaffUpdate, StaffResponse, StaffFullCreate,
    AdminUserCreate, AdminUserUpdate, AdminUserResponse,
    ResetPasswordRequest,
    DepartmentCreate, DepartmentUpdate, DepartmentResponse,
    SemesterCreate, SemesterUpdate, SemesterResponse,
    FeeStructureCreate, FeeStructureUpdate, FeeStructureResponse
)
from ...crud.user import UserCRUD
from ...crud.student import StudentCRUD
from ...crud.staff import StaffCRUD
from ...crud.department import DepartmentCRUD
from ...services.request_engine_service import RequestEngineService
from ...core.security import get_current_active_user, get_password_hash
from ...dependencies.rbac import require_admin
import os
import redis.asyncio as aioredis

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def require_admin(current_user: User = Depends(require_admin)):
    return current_user

# ============================================================================
# DASHBOARD
# ============================================================================
@router.get("/dashboard")
async def get_dashboard(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    request_engine = RequestEngineService(db)
    
    total_users = db.query(User).count()
    total_students = db.query(Student).count()
    total_staff = db.query(Staff).count()
    total_admins = db.query(AdminModel).count()
    total_payments = db.query(PaymentRequest).count()
    total_bonafides = db.query(BonafideRequest).count()
    total_documents = db.query(DocumentRequest).count()
    total_departments = db.query(Department).count()
    total_semesters = db.query(Semester).count()
    total_notifications = db.query(Notification).count()

    paid_payments = db.query(PaymentRequest).filter(PaymentRequest.status == "completed").all()
    total_collected = sum(p.amount_paid for p in paid_payments if p.amount_paid)
    pending_payments = db.query(PaymentRequest).filter(PaymentRequest.status == "pending").count()
    pending_amount = db.query(func.sum(PaymentRequest.amount_paid)).filter(PaymentRequest.status == "pending").scalar() or 0

    approved_documents = db.query(DocumentRequest).filter(DocumentRequest.status == "approved").count()
    pending_documents = db.query(DocumentRequest).filter(DocumentRequest.status == "pending").count()
    rejected_documents = db.query(DocumentRequest).filter(DocumentRequest.status == "rejected").count()

    active_students = db.query(User).filter(User.role == "student", User.is_active == True).count()
    active_staff = db.query(User).filter(User.role == "staff", User.is_active == True).count()
    active_admins = db.query(User).filter(User.role == "admin", User.is_active == True).count()
    inactive_users = db.query(User).filter(User.is_active == False).count()

    departments = db.query(Department).all()
    dept_stats = []
    for dept in departments:
        dept_students = db.query(Student).filter(Student.department_id == dept.id).count()
        dept_staff = db.query(Staff).filter(Staff.department_id == dept.id).count()
        dept_payments = db.query(PaymentRequest).join(User, PaymentRequest.user_id == User.id).join(Student, Student.user_id == User.id).filter(Student.department_id == dept.id, PaymentRequest.status == "completed").count()
        dept_stats.append({
            "department_name": dept.name,
            "department_code": dept.code,
            "students": dept_students,
            "staff": dept_staff,
            "completed_payments": dept_payments,
        })

    recent_users = db.query(User).order_by(desc(User.created_at)).limit(5).all()
    recent_user_list = []
    for u in recent_users:
        recent_user_list.append({
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role.value if isinstance(u.role, UserRole) else u.role,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })

    recent_requests = []
    recent_payments = db.query(PaymentRequest).order_by(desc(PaymentRequest.created_at)).limit(5).all()
    for p in recent_payments:
        recent_requests.append({
            "type": "payment",
            "id": p.id,
            "request_id": p.request_id,
            "status": p.status,
            "amount": p.amount_paid,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })
    recent_docs = db.query(DocumentRequest).order_by(desc(DocumentRequest.created_at)).limit(5).all()
    for dr in recent_docs:
        recent_requests.append({
            "type": "document",
            "id": dr.id,
            "request_id": dr.request_number,
            "status": dr.status,
            "created_at": dr.created_at.isoformat() if dr.created_at else None,
        })
    recent_requests.sort(key=lambda x: x.get("created_at") or "", reverse=True)

    # Get unified request stats
    unified_stats = request_engine.get_work_queue_stats()
    
    # Get recent audit logs
    recent_audit_logs = db.query(AuditLog).order_by(desc(AuditLog.created_at)).limit(10).all()
    audit_log_list = []
    for log in recent_audit_logs:
        user = db.query(User).filter(User.id == log.user_id).first() if log.user_id else None
        audit_log_list.append({
            "id": log.id,
            "action": log.action,
            "details": log.details,
            "user_name": user.full_name if user else "System",
            "ip_address": log.ip_address,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        })

    # System health checks - query from database
    from ...models import SystemHealth
    system_health_data = db.query(SystemHealth).all()
    system_health = {}
    for sh in system_health_data:
        system_health[sh.service_name] = sh.status

    return {
        "total_users": total_users,
        "total_students": total_students,
        "total_staff": total_staff,
        "total_admins": total_admins,
        "total_payments": total_payments,
        "total_bonafides": total_bonafides,
        "total_documents": total_documents,
        "total_departments": total_departments,
        "total_semesters": total_semesters,
        "total_notifications": total_notifications,
        "total_collected": total_collected,
        "pending_payments": pending_payments,
        "pending_amount": pending_amount,
        "approved_documents": approved_documents,
        "pending_documents": pending_documents,
        "rejected_documents": rejected_documents,
        "active_students": active_students,
        "active_staff": active_staff,
        "active_admins": active_admins,
        "inactive_users": inactive_users,
        "departments": dept_stats,
        "recent_users": recent_user_list,
        "recent_requests": recent_requests[:10],
        "unified_stats": unified_stats,
        "recent_audit_logs": audit_log_list,
        "system_health": system_health,
    }

# ============================================================================
# USER MANAGEMENT
# ============================================================================
@router.get("/users", response_model=List[AdminUserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    role: Optional[str] = None,
    department: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    from sqlalchemy.orm import joinedload

    query = db.query(User).options(
        joinedload(User.department),
        joinedload(User.student_profile),
        joinedload(User.staff_profile),
        joinedload(User.admin_profile),
    )

    if search:
        query = query.outerjoin(Student, Student.user_id == User.id).outerjoin(Staff, Staff.user_id == User.id).outerjoin(AdminModel, AdminModel.user_id == User.id)
        query = query.filter(
            or_(
                User.full_name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
                Student.roll_number.ilike(f"%{search}%"),
                Staff.staff_id.ilike(f"%{search}%"),
                AdminModel.employee_id.ilike(f"%{search}%"),
            )
        )

    if role:
        query = query.filter(User.role == role)

    if status:
        is_active = status.lower() == "active"
        query = query.filter(User.is_active == is_active)

    if department:
        query = query.join(Department, User.department_id == Department.id).filter(Department.name.ilike(f"%{department}%"))

    users = query.offset(skip).limit(limit).all()

    result = []
    for user in users:
        dept_name = user.department.name if user.department else "N/A"
        register_number = user.student_profile.roll_number if user.student_profile else None
        employee_id = user.staff_profile.staff_id if user.staff_profile else (user.admin_profile.employee_id if user.admin_profile else None)
        current_semester = user.student_profile.current_semester if user.student_profile else None
        user_status = "Active" if user.is_active else "Inactive"

        result.append({
            "id": user.id,
            "user_id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role.value if isinstance(user.role, UserRole) else user.role,
            "phone": user.phone,
            "department": dept_name,
            "department_id": user.department_id,
            "status": user_status,
            "register_number": register_number,
            "employee_id": employee_id,
            "current_semester": current_semester,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        })
    return result

@router.get("/users/{user_id}", response_model=AdminUserResponse)
async def get_user(user_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload

    user = db.query(User).options(
        joinedload(User.department),
        joinedload(User.student_profile),
        joinedload(User.staff_profile),
        joinedload(User.admin_profile),
    ).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    dept_name = user.department.name if user.department else "N/A"
    register_number = user.student_profile.roll_number if user.student_profile else None
    employee_id = user.staff_profile.staff_id if user.staff_profile else (user.admin_profile.employee_id if user.admin_profile else None)
    current_semester = user.student_profile.current_semester if user.student_profile else None
    user_status = "Active" if user.is_active else "Inactive"

    return {
        "id": user.id,
        "user_id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role.value if isinstance(user.role, UserRole) else user.role,
        "phone": user.phone,
        "department": dept_name,
        "department_id": user.department_id,
        "status": user_status,
        "register_number": register_number,
        "employee_id": employee_id,
        "current_semester": current_semester,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None,
    }

@router.post("/users", response_model=AdminUserResponse)
async def create_user(user_in: AdminUserCreate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    existing_email = db.query(User).filter(User.email == user_in.user.get("email")).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    role = user_in.user.get("role", "student")

    if role == "student":
        if not user_in.register_number:
            raise HTTPException(status_code=400, detail="Register Number is required for students")
        existing_roll = db.query(Student).filter(Student.roll_number == user_in.register_number).first()
        if existing_roll:
            raise HTTPException(status_code=400, detail="Register Number already exists")

    if role in ("staff", "admin"):
        if not user_in.employee_id:
            raise HTTPException(status_code=400, detail="Employee ID is required for staff and admin")
        existing_emp = db.query(Staff).filter(Staff.staff_id == user_in.employee_id).first()
        if existing_emp:
            raise HTTPException(status_code=400, detail="Employee ID already exists for staff")
        existing_admin_emp = db.query(AdminModel).filter(AdminModel.employee_id == user_in.employee_id).first()
        if existing_admin_emp:
            raise HTTPException(status_code=400, detail="Employee ID already exists for admin")

    user_crud = UserCRUD()
    user_data = user_in.user.copy()
    user_data["is_active"] = user_in.is_active
    new_user = user_crud.create(db, UserCreate(**user_data))

    try:
        if role == "student":
            admission_dt = datetime.utcnow()
            if user_in.admission_date:
                admission_dt = datetime.fromisoformat(user_in.admission_date)
            student_create = StudentCreate(
                user_id=new_user.id,
                roll_number=user_in.register_number,
                admission_date=admission_dt,
                current_semester=user_in.current_semester,
                department_id=user_in.department_id,
            )
            student_crud = StudentCRUD()
            student_crud.create(db, student_create)

        elif role == "staff":
            hire_dt = datetime.utcnow()
            if user_in.hire_date:
                hire_dt = datetime.fromisoformat(user_in.hire_date)
            staff_create = StaffCreate(
                user_id=new_user.id,
                staff_id=user_in.employee_id,
                hire_date=hire_dt,
                department_id=user_in.department_id,
            )
            staff_crud = StaffCRUD()
            staff_crud.create(db, staff_create)

        elif role == "admin":
            hire_dt = datetime.utcnow()
            if user_in.hire_date:
                hire_dt = datetime.fromisoformat(user_in.hire_date)
            db_admin = AdminModel(
                user_id=new_user.id,
                employee_id=user_in.employee_id,
                hire_date=hire_dt,
            )
            db.add(db_admin)
            db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating profile: {str(e)}")

    dept_name = new_user.department.name if new_user.department else "N/A"
    register_number = new_user.student_profile.roll_number if new_user.student_profile else None
    employee_id = new_user.staff_profile.staff_id if new_user.staff_profile else (new_user.admin_profile.employee_id if new_user.admin_profile else None)
    current_semester = new_user.student_profile.current_semester if new_user.student_profile else None
    user_status = "Active" if new_user.is_active else "Inactive"

    return {
        "id": new_user.id,
        "user_id": new_user.id,
        "full_name": new_user.full_name,
        "email": new_user.email,
        "role": new_user.role.value if isinstance(new_user.role, UserRole) else new_user.role,
        "phone": new_user.phone,
        "department": dept_name,
        "department_id": new_user.department_id,
        "status": user_status,
        "register_number": register_number,
        "employee_id": employee_id,
        "current_semester": current_semester,
        "created_at": new_user.created_at.isoformat() if new_user.created_at else None,
        "updated_at": new_user.updated_at.isoformat() if new_user.updated_at else None,
    }

@router.put("/users/{user_id}", response_model=AdminUserResponse)
async def update_user(user_id: int, user_in: AdminUserUpdate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload

    user = db.query(User).options(
        joinedload(User.department),
        joinedload(User.student_profile),
        joinedload(User.staff_profile),
        joinedload(User.admin_profile),
    ).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_in.user:
        user_data = user_in.user.copy()
    else:
        user_data = {}
    flat_fields = ['full_name', 'email', 'password', 'role', 'phone', 'address', 'department_id']
    for field in flat_fields:
        if getattr(user_in, field) is not None:
            user_data[field] = getattr(user_in, field)

    if "email" in user_data and user_data["email"] != user.email:
        existing = db.query(User).filter(User.email == user_data["email"]).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
    if "password" in user_data and user_data["password"]:
        user_data["hashed_password"] = get_password_hash(user_data.pop("password"))

    for field, value in user_data.items():
        if hasattr(user, field):
            setattr(user, field, value)

    if user_in.is_active is not None:
        user.is_active = user_in.is_active

    db.commit()
    db.refresh(user)

    if user.student_profile and (user_in.register_number is not None or user_in.current_semester is not None or user_in.department_id is not None):
        if user_in.register_number is not None:
            existing_roll = db.query(Student).filter(Student.roll_number == user_in.register_number, Student.id != user.student_profile.id).first()
            if existing_roll:
                raise HTTPException(status_code=400, detail="Register Number already exists")
            user.student_profile.roll_number = user_in.register_number
        if user_in.current_semester is not None:
            user.student_profile.current_semester = user_in.current_semester
        if user_in.department_id is not None:
            user.student_profile.department_id = user_in.department_id
            user.department_id = user_in.department_id
        if user_in.quota is not None:
            user.student_profile.quota = user_in.quota
        if user_in.transport_route is not None:
            user.student_profile.transport_route = user_in.transport_route
        if user_in.transport_fee is not None:
            user.student_profile.transport_fee = user_in.transport_fee
        db.commit()
        db.refresh(user.student_profile)

    if user.staff_profile and user_in.employee_id is not None:
        user.staff_profile.staff_id = user_in.employee_id
        db.commit()
        db.refresh(user.staff_profile)

    if user.admin_profile and user_in.employee_id is not None:
        user.admin_profile.employee_id = user_in.employee_id
        db.commit()
        db.refresh(user.admin_profile)

    dept_name = user.department.name if user.department else "N/A"
    register_number = user.student_profile.roll_number if user.student_profile else None
    employee_id = user.staff_profile.staff_id if user.staff_profile else (user.admin_profile.employee_id if user.admin_profile else None)
    current_semester = user.student_profile.current_semester if user.student_profile else None
    user_status = "Active" if user.is_active else "Inactive"
    quota = user.student_profile.quota if user.student_profile else None
    transport_route = user.student_profile.transport_route if user.student_profile else None
    transport_fee = user.student_profile.transport_fee if user.student_profile else 0.0

    return {
        "id": user.id,
        "user_id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role.value if isinstance(user.role, UserRole) else user.role,
        "phone": user.phone,
        "department": dept_name,
        "department_id": user.department_id,
        "status": user_status,
        "register_number": register_number,
        "employee_id": employee_id,
        "current_semester": current_semester,
        "quota": quota,
        "transport_route": transport_route,
        "transport_fee": transport_fee,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None,
    }

@router.delete("/users/{user_id}")
async def delete_user(user_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    user.is_active = False
    db.commit()
    return {"message": "User deactivated successfully"}

@router.post("/users/{user_id}/activate")
async def activate_user(user_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = True
    db.commit()
    return {"message": "User activated successfully"}

@router.post("/users/{user_id}/deactivate")
async def deactivate_user(user_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    user.is_active = False
    db.commit()
    return {"message": "User deactivated successfully"}

@router.post("/users/{user_id}/reset-password")
async def reset_password(user_id: int, password_in: ResetPasswordRequest, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.hashed_password = get_password_hash(password_in.new_password)
    db.commit()
    return {"message": "Password reset successfully"}

# ============================================================================
# STUDENT CRUD (existing, kept for backward compatibility)
# ============================================================================
@router.get("/students")
async def get_students(skip: int = 0, limit: int = 100, search: Optional[str] = None, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    query = db.query(Student).options(joinedload(Student.user), joinedload(Student.department)).join(User, Student.user_id == User.id).outerjoin(Department, Student.department_id == Department.id)
    if search:
        query = query.filter(
            or_(
                User.full_name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
                Student.roll_number.ilike(f"%{search}%")
            )
        )
    students = query.offset(skip).limit(limit).all()
    result = []
    for student in students:
        result.append({
            "id": student.id,
            "user_id": student.user_id,
            "roll_number": student.roll_number,
            "admission_date": student.admission_date.isoformat() if student.admission_date else None,
            "current_semester": student.current_semester,
            "department_id": student.department_id,
            "gpa": student.gpa,
            "full_name": student.user.full_name if student.user else "",
            "email": student.user.email if student.user else "",
            "role": student.user.role.value if student.user and student.user.role else "student",
            "student_id": student.user.student_id if student.user else "",
            "phone": student.user.phone if student.user else "",
            "address": student.user.address if student.user else "",
            "department": student.department.name if student.department else "",
            "quota": student.quota,
            "transport_route": student.transport_route,
            "transport_fee": student.transport_fee,
            "created_at": student.created_at.isoformat() if student.created_at else None,
            "updated_at": student.updated_at.isoformat() if student.updated_at else None,
        })
    return result

# Combined Student creation (creates User + Student)
@router.post("/students", response_model=StudentResponse)
async def create_student_full(student_in: StudentFullCreate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == student_in.user.get("email")).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check for duplicate student_id in the User table
    student_id = student_in.user.get("student_id")
    if student_id:
        existing_student_id = db.query(User).filter(User.student_id == student_id).first()
        if existing_student_id:
            raise HTTPException(status_code=400, detail="Student ID already exists")

    # Convert empty string optional fields to None to avoid unique constraint violations
    user_data = {k: (v if v != '' else None) for k, v in student_in.user.items()}

    try:
        admission_dt = datetime.fromisoformat(student_in.admission_date)
    except (ValueError, TypeError):
        admission_dt = datetime.utcnow()

    try:
        user_crud = UserCRUD()
        new_user = user_crud.create(db, UserCreate(**user_data))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating user: {str(e)}")

    try:
        student_create = StudentCreate(
            user_id=new_user.id,
            roll_number=student_in.roll_number,
            admission_date=admission_dt,
            current_semester=student_in.current_semester,
            department_id=student_in.department_id,
            quota=student_in.quota,
            transport_route=student_in.transport_route,
            transport_fee=student_in.transport_fee,
        )
        student_crud = StudentCRUD()
        new_student = student_crud.create(db, student_create)
    except Exception as e:
        db.rollback()
        db.delete(new_user)
        db.commit()
        raise HTTPException(status_code=400, detail=f"Error creating student profile: {str(e)}")

    return new_student

# Staff CRUD
@router.get("/staff")
async def get_staff(skip: int = 0, limit: int = 100, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    staffs = db.query(Staff).options(joinedload(Staff.user), joinedload(Staff.department)).offset(skip).limit(limit).all()
    result = []
    for staff in staffs:
        result.append({
            "id": staff.id,
            "user_id": staff.user_id,
            "staff_id": staff.staff_id,
            "hire_date": staff.hire_date.isoformat() if staff.hire_date else None,
            "department_id": staff.department_id,
            "full_name": staff.user.full_name if staff.user else "",
            "email": staff.user.email if staff.user else "",
            "department": staff.department.name if staff.department else "N/A",
            "created_at": staff.created_at.isoformat() if staff.created_at else None,
            "updated_at": staff.updated_at.isoformat() if staff.updated_at else None,
        })
    return result

# Combined Staff creation (creates User + Staff)
@router.post("/staff", response_model=StaffResponse)
async def create_staff_full(staff_in: StaffFullCreate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == staff_in.user.get("email")).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check for duplicate staff_id
    existing_staff_id = db.query(Staff).filter(Staff.staff_id == staff_in.staff_id).first()
    if existing_staff_id:
        raise HTTPException(status_code=400, detail="Staff ID already exists")

    # Convert empty string optional fields to None
    user_data = {k: (v if v != '' else None) for k, v in staff_in.user.items()}

    try:
        hire_dt = datetime.fromisoformat(staff_in.hire_date)
    except (ValueError, TypeError):
        hire_dt = datetime.utcnow()

    try:
        user_crud = UserCRUD()
        new_user = user_crud.create(db, UserCreate(**user_data))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating user: {str(e)}")

    try:
        staff_create = StaffCreate(
            user_id=new_user.id,
            staff_id=staff_in.staff_id,
            hire_date=hire_dt,
            department_id=staff_in.department_id,
        )
        staff_crud = StaffCRUD()
        new_staff = staff_crud.create(db, staff_create)
    except Exception as e:
        db.rollback()
        db.delete(new_user)
        db.commit()
        raise HTTPException(status_code=400, detail=f"Error creating staff profile: {str(e)}")

    return new_staff

@router.put("/staff/{staff_id}", response_model=StaffResponse)
async def update_staff(staff_id: int, staff_in: StaffUpdate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    staff_crud = StaffCRUD()
    staff = staff_crud.get_by_id(db, staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    updated_staff = staff_crud.update(db, staff, staff_in.dict(exclude_unset=True))
    return updated_staff

@router.delete("/staff/{staff_id}")
async def delete_staff(staff_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    staff_crud = StaffCRUD()
    result = staff_crud.delete(db, staff_id)
    if not result:
        raise HTTPException(status_code=404, detail="Staff not found")
    return {"message": "Staff deleted successfully"}

# ============================================================================
# DEPARTMENT CRUD
# ============================================================================
@router.get("/departments", response_model=List[DepartmentResponse])
async def get_departments(skip: int = 0, limit: int = 100, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    dept_crud = DepartmentCRUD()
    departments = dept_crud.get_all(db, skip, limit)
    return departments

@router.post("/departments", response_model=DepartmentResponse)
async def create_department(dept_in: DepartmentCreate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    dept_crud = DepartmentCRUD()
    department = dept_crud.create(db, dept_in)
    return department

@router.put("/departments/{dept_id}", response_model=DepartmentResponse)
async def update_department(dept_id: int, dept_in: DepartmentUpdate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    dept_crud = DepartmentCRUD()
    department = dept_crud.get_by_id(db, dept_id)
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    updated_dept = dept_crud.update(db, department, dept_in.dict(exclude_unset=True))
    return updated_dept

@router.delete("/departments/{dept_id}")
async def delete_department(dept_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    dept_crud = DepartmentCRUD()
    result = dept_crud.delete(db, dept_id)
    if not result:
        raise HTTPException(status_code=404, detail="Department not found")
    return {"message": "Department deleted successfully"}

# ============================================================================
# SEMESTER CRUD
# ============================================================================
@router.get("/semesters", response_model=List[SemesterResponse])
async def get_semesters(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(Semester).order_by(Semester.start_date.desc()).all()

@router.post("/semesters", response_model=SemesterResponse)
async def create_semester(semester_in: SemesterCreate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    db_semester = Semester(**semester_in.dict())
    db.add(db_semester)
    db.commit()
    db.refresh(db_semester)
    return db_semester

@router.put("/semesters/{semester_id}", response_model=SemesterResponse)
async def update_semester(semester_id: int, semester_in: SemesterUpdate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    semester = db.query(Semester).filter(Semester.id == semester_id).first()
    if not semester:
        raise HTTPException(status_code=404, detail="Semester not found")
    update_data = semester_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(semester, field, value)
    db.commit()
    db.refresh(semester)
    return semester

@router.delete("/semesters/{semester_id}")
async def delete_semester(semester_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    semester = db.query(Semester).filter(Semester.id == semester_id).first()
    if not semester:
        raise HTTPException(status_code=404, detail="Semester not found")
    db.delete(semester)
    db.commit()
    return {"message": "Semester deleted successfully"}

# ============================================================================
# FEE STRUCTURE CRUD
# ============================================================================
@router.get("/fee-structures", response_model=List[FeeStructureResponse])
async def get_fee_structures(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(FeeStructure).order_by(FeeStructure.due_date.desc()).all()

@router.post("/fee-structures", response_model=FeeStructureResponse)
async def create_fee_structure(fee_in: FeeStructureCreate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    db_fee = FeeStructure(**fee_in.dict())
    db.add(db_fee)
    db.commit()
    db.refresh(db_fee)
    return db_fee

@router.put("/fee-structures/{fee_id}", response_model=FeeStructureResponse)
async def update_fee_structure(fee_id: int, fee_in: FeeStructureUpdate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    fee = db.query(FeeStructure).filter(FeeStructure.id == fee_id).first()
    if not fee:
        raise HTTPException(status_code=404, detail="Fee structure not found")
    update_data = fee_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(fee, field, value)
    db.commit()
    db.refresh(fee)
    return fee

@router.delete("/fee-structures/{fee_id}")
async def delete_fee_structure(fee_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    fee = db.query(FeeStructure).filter(FeeStructure.id == fee_id).first()
    if not fee:
        raise HTTPException(status_code=404, detail="Fee structure not found")
    db.delete(fee)
    db.commit()
    return {"message": "Fee structure deleted successfully"}

# ============================================================================
# SYSTEM HEALTH
# ============================================================================
@router.get("/system/health")
async def get_system_health(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    db_status = "healthy"
    db_error = None
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = "unhealthy"
        db_error = str(e)

    redis_status = "unknown"
    try:
        from ...core.redis_client import redis_client
        import asyncio
        pong = asyncio.run(redis_client.ping())
        redis_status = "healthy" if pong else "unhealthy"
    except Exception:
        redis_status = "unhealthy"

    uploads_dir = settings.UPLOAD_DIR
    storage_status = "healthy"
    try:
        os.makedirs(uploads_dir, exist_ok=True)
        test_file = os.path.join(uploads_dir, ".health_check")
        with open(test_file, "w") as f:
            f.write("ok")
        os.remove(test_file)
    except Exception:
        storage_status = "unhealthy"

    active_departments = db.query(Department).count()
    audit_logs_count = db.query(AuditLog).count()
    pending_payments = db.query(PaymentRequest).filter(PaymentRequest.status == "pending").count()
    pending_documents = db.query(DocumentRequest).filter(DocumentRequest.status == "pending").count()

    return {
        "database": {
            "status": db_status,
            "error": db_error,
        },
        "redis": {
            "status": redis_status,
        },
        "storage": {
            "status": storage_status,
            "path": os.path.abspath(uploads_dir),
        },
        "active_departments": active_departments,
        "audit_logs_count": audit_logs_count,
        "pending_payments": pending_payments,
        "pending_documents": pending_documents,
        "timestamp": datetime.utcnow().isoformat(),
    }
