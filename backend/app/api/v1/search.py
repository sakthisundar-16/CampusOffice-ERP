from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional
from sqlalchemy import or_, and_, desc
from datetime import datetime
from ...database import SessionLocal
from ...models import (
    User, Student, Department, PaymentRequest, Semester, FeeStructure,
    DocumentRequest, DocumentType, BonafideRequest, Staff, UnifiedRequest
)
from ...core.security import get_current_active_user
from ...dependencies.rbac import require_staff_or_admin
from ...core.redis_client import get_cache, set_cache
import json

router = APIRouter(prefix="/api/v1/search", tags=["search"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/")
async def unified_search(
    q: Optional[str] = None,
    limit: int = 20,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    cache_key = f"search:{q}:{limit}"
    cached = await get_cache(cache_key)
    if cached:
        return cached

    results = {
        "students": [],
        "payments": [],
        "documents": [],
        "bonafides": [],
        "staff": [],
        "unified_requests": []
    }

    if not q or len(q.strip()) < 2:
        await set_cache(cache_key, results, 60)
        return results

    search_term = f"%{q}%"

    # Search Students
    students = db.query(Student).join(User, Student.user_id == User.id).join(Department, Student.department_id == Department.id).filter(
        or_(
            User.full_name.ilike(search_term),
            User.email.ilike(search_term),
            Student.roll_number.ilike(search_term)
        )
    ).limit(limit).all()

    results["students"] = [
        {
            "id": s.id,
            "user_id": s.user_id,
            "roll_number": s.roll_number,
            "full_name": s.user.full_name,
            "email": s.user.email,
            "department": s.department.name if s.department else None,
            "current_semester": s.current_semester,
            "gpa": s.gpa,
        }
        for s in students
    ]

    # Search Payments (by request_id, receipt_number, student name, roll number)
    payments = db.query(PaymentRequest).join(User, PaymentRequest.user_id == User.id).outerjoin(Student, Student.user_id == User.id).outerjoin(Department, Student.department_id == Department.id).filter(
        or_(
            PaymentRequest.request_id.ilike(search_term),
            PaymentRequest.receipt_number.ilike(search_term),
            User.full_name.ilike(search_term),
            Student.roll_number.ilike(search_term)
        )
    ).order_by(desc(PaymentRequest.created_at)).limit(limit).all()

    results["payments"] = [
        {
            "id": p.id,
            "request_id": p.request_id,
            "receipt_number": p.receipt_number,
            "student_name": p.user.full_name if p.user else "N/A",
            "roll_number": p.user.student_profile.roll_number if p.user and p.user.student_profile else "N/A",
            "department": p.department.name if p.department else (p.user.department.name if p.user and p.user.department else "N/A"),
            "amount_paid": p.amount_paid,
            "status": p.status,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in payments
    ]

    # Search Documents (by request_number, certificate_number, student name, roll number)
    docs = db.query(DocumentRequest).join(User, DocumentRequest.user_id == User.id).outerjoin(Student, Student.user_id == User.id).outerjoin(Department, Student.department_id == Department.id).outerjoin(DocumentType, DocumentRequest.document_type_id == DocumentType.id).filter(
        or_(
            DocumentRequest.request_number.ilike(search_term),
            DocumentRequest.certificate_number.ilike(search_term),
            User.full_name.ilike(search_term),
            Student.roll_number.ilike(search_term)
        )
    ).order_by(desc(DocumentRequest.created_at)).limit(limit).all()

    results["documents"] = [
        {
            "id": d.id,
            "request_number": d.request_number,
            "certificate_number": d.certificate_number,
            "student_name": d.requester.full_name if d.requester else "N/A",
            "roll_number": d.requester.student_profile.roll_number if d.requester and d.requester.student_profile else "N/A",
            "department": d.requester.department.name if d.requester and d.requester.department else "N/A",
            "document_type": d.document_type.name if d.document_type else "N/A",
            "status": d.status,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in docs
    ]

    # Search Bonafides
    bonafides = db.query(BonafideRequest).join(User, BonafideRequest.user_id == User.id).outerjoin(Student, Student.user_id == User.id).filter(
        or_(
            User.full_name.ilike(search_term),
            Student.roll_number.ilike(search_term),
            BonafideRequest.purpose.ilike(search_term)
        )
    ).order_by(desc(BonafideRequest.created_at)).limit(limit).all()

    results["bonafides"] = [
        {
            "id": b.id,
            "user_id": b.user_id,
            "student_name": b.user.full_name if b.user else "N/A",
            "roll_number": b.user.student_profile.roll_number if b.user and b.user.student_profile else "N/A",
            "purpose": b.purpose,
            "status": b.status,
            "created_at": b.created_at.isoformat() if b.created_at else None,
        }
        for b in bonafides
    ]

    # Search Staff (by employee_id, name)
    staff = db.query(Staff).join(User, Staff.user_id == User.id).join(Department, Staff.department_id == Department.id).filter(
        or_(
            User.full_name.ilike(search_term),
            User.email.ilike(search_term),
            Staff.staff_id.ilike(search_term)
        )
    ).limit(limit).all()

    results["staff"] = [
        {
            "id": s.id,
            "user_id": s.user_id,
            "staff_id": s.staff_id,
            "full_name": s.user.full_name,
            "email": s.user.email,
            "department": s.department.name if s.department else None,
        }
        for s in staff
    ]

    # Search Unified Requests (by request_number)
    unified = db.query(UnifiedRequest).join(User, UnifiedRequest.user_id == User.id).filter(
        or_(
            UnifiedRequest.request_number.ilike(search_term),
            User.full_name.ilike(search_term)
        )
    ).order_by(desc(UnifiedRequest.submitted_at)).limit(limit).all()

    results["unified_requests"] = [
        {
            "id": u.id,
            "request_number": u.request_number,
            "request_type": u.request_type,
            "user_name": u.user.full_name if u.user else "N/A",
            "status": u.status,
            "submitted_at": u.submitted_at.isoformat() if u.submitted_at else None,
        }
        for u in unified
    ]

    await set_cache(cache_key, results, 60)
    return results

@router.get("/payments")
async def search_payments(
    request_id: Optional[str] = None,
    student_name: Optional[str] = None,
    roll_number: Optional[str] = None,
    department: Optional[str] = None,
    semester_id: Optional[int] = None,
    academic_year: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    export: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    query = db.query(PaymentRequest).join(User, PaymentRequest.user_id == User.id).outerjoin(Student, Student.user_id == User.id).outerjoin(Department, Student.department_id == Department.id)

    if request_id:
        query = query.filter(PaymentRequest.request_id.ilike(f"%{request_id}%"))
    if student_name:
        query = query.filter(User.full_name.ilike(f"%{student_name}%"))
    if roll_number:
        query = query.filter(Student.roll_number.ilike(f"%{roll_number}%"))
    if department:
        query = query.filter(Department.name.ilike(f"%{department}%"))
    if semester_id:
        query = query.filter(Student.current_semester == semester_id)
    if academic_year:
        query = query.filter(PaymentRequest.academic_year == academic_year)
    if status:
        query = query.filter(PaymentRequest.status == status)
    if date_from:
        try:
            from datetime import datetime as dt
            query = query.filter(PaymentRequest.created_at >= dt.fromisoformat(date_from))
        except ValueError:
            pass
    if date_to:
        try:
            from datetime import datetime as dt
            query = query.filter(PaymentRequest.created_at <= dt.fromisoformat(date_to + "T23:59:59"))
        except ValueError:
            pass

    if export == "csv":
        all_payments = query.order_by(desc(PaymentRequest.created_at)).all()
        import csv
        import io
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Request ID", "Student Name", "Roll Number", "Department", "Amount Paid", "Status", "Payment Date", "Created At"])
        for p in all_payments:
            writer.writerow([
                p.request_id,
                p.user.full_name if p.user else "N/A",
                p.user.student_profile.roll_number if p.user and p.user.student_profile else "N/A",
                p.department.name if p.department else (p.user.department.name if p.user and p.user.department else "N/A"),
                p.amount_paid,
                p.status,
                p.payment_date.isoformat() if p.payment_date else "",
                p.created_at.isoformat() if p.created_at else "",
            ])
        return Response(content=output.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=payment_history.csv"})

    payments = query.order_by(desc(PaymentRequest.created_at)).offset(skip).limit(limit).all()

    return {
        "payments": [
            {
                "id": p.id,
                "request_id": p.request_id,
                "student_name": p.user.full_name if p.user else "N/A",
                "roll_number": p.user.student_profile.roll_number if p.user and p.user.student_profile else "N/A",
                "department": p.department.name if p.department else (p.user.department.name if p.user and p.user.department else "N/A"),
                "amount_paid": p.amount_paid,
                "status": p.status,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in payments
        ],
        "total": query.count(),
        "skip": skip,
        "limit": limit,
    }
