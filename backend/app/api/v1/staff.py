from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy import desc
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
from ...database import SessionLocal
from ...models import User, Result, BonafideRequest, PaymentRequest, DocumentRequest, Notification, DocumentType, Student, Department
from ...schemas import ResultCreate, ResultUpdate
from ...core.config import settings
from ...schemas import BonafideRequestUpdate
from ...services.result_service import ResultService
from ...services.bonafide_service import BonafideService
from ...services.pdf_service import PDFService
from ...services.request_engine_service import RequestEngineService
from ...core.security import get_current_active_user
from ...dependencies.rbac import require_staff
import os

router = APIRouter(prefix="/api/v1/staff", tags=["staff"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def _get_work_queue_stats(db: Session) -> dict:
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    request_engine = RequestEngineService(db)

    pending_payments = db.query(PaymentRequest).filter(PaymentRequest.status == "pending").count()
    pending_bonafides = db.query(BonafideRequest).filter(BonafideRequest.status == "pending").count()
    pending_results = db.query(Result).count()
    pending_documents = db.query(DocumentRequest).filter(DocumentRequest.status == "pending").count()
    pending_profile_corrections = 0  # Can be implemented later

    completed_today_payments = db.query(PaymentRequest).filter(
        PaymentRequest.status == "completed",
        PaymentRequest.verified_at >= today_start
    ).count()
    rejected_today_payments = db.query(PaymentRequest).filter(
        PaymentRequest.status == "rejected",
        PaymentRequest.verified_at >= today_start
    ).count()

    completed_today_docs = db.query(DocumentRequest).filter(
        DocumentRequest.status == "approved",
        DocumentRequest.updated_at >= today_start
    ).count()
    rejected_today_docs = db.query(DocumentRequest).filter(
        DocumentRequest.status == "rejected",
        DocumentRequest.updated_at >= today_start
    ).count()

    total_bonafides = db.query(BonafideRequest).count()

    recent_activities = []
    recent_payments = db.query(PaymentRequest).order_by(desc(PaymentRequest.updated_at)).limit(10).all()
    for p in recent_payments:
        recent_activities.append({
            "type": "payment",
            "event": f"Payment {p.status.title()}",
            "timestamp": p.updated_at.isoformat() if p.updated_at else None,
            "details": f"{p.user.full_name if p.user else 'Student'} - {p.request_id}",
            "status": p.status,
        })
    recent_docs = db.query(DocumentRequest).order_by(desc(DocumentRequest.updated_at)).limit(10).all()
    for dr in recent_docs:
        doc_type = db.query(DocumentType).filter(DocumentType.id == dr.document_type_id).first()
        recent_activities.append({
            "type": "document",
            "event": f"Document {dr.status.title()}",
            "timestamp": dr.updated_at.isoformat() if dr.updated_at else None,
            "details": f"{dr.requester.full_name if dr.requester else 'Student'} - {doc_type.name if doc_type else 'Document'}",
            "status": dr.status,
        })

    today_notifications = db.query(Notification).filter(
        Notification.created_at >= today_start
    ).order_by(desc(Notification.created_at)).limit(20).all()

    recent_activities.sort(key=lambda x: x.get("timestamp") or "", reverse=True)

    # Get unified work queue stats
    unified_stats = request_engine.get_work_queue_stats()

    return {
        "pending_payments": pending_payments,
        "pending_bonafides": pending_bonafides,
        "pending_results": pending_results,
        "pending_documents": pending_documents,
        "pending_profile_corrections": pending_profile_corrections,
        "completed_today": completed_today_payments + completed_today_docs,
        "rejected_today": rejected_today_payments + rejected_today_docs,
        "completed_today_payments": completed_today_payments,
        "rejected_today_payments": rejected_today_payments,
        "completed_today_documents": completed_today_docs,
        "rejected_today_documents": rejected_today_docs,
        "total_bonafides": total_bonafides,
        "recent_activities": recent_activities[:20],
        "today_notifications": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "category": n.category,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in today_notifications
        ],
        "unified_stats": unified_stats
    }

@router.get("/dashboard")
async def get_dashboard(current_user: User = Depends(require_staff), db: Session = Depends(get_db)):
    stats = _get_work_queue_stats(db)
    return stats

@router.get("/dashboard/work-queue")
async def get_work_queue(current_user: User = Depends(require_staff), db: Session = Depends(get_db)):
    stats = _get_work_queue_stats(db)
    return stats

@router.get("/search/students")
async def search_students(q: Optional[str] = None, department: Optional[str] = None, semester: Optional[int] = None, skip: int = 0, limit: int = 10, current_user: User = Depends(require_staff), db: Session = Depends(get_db)):
    from sqlalchemy import or_
    query = db.query(Student).join(User, Student.user_id == User.id).join(Department, Student.department_id == Department.id)
    if q:
        query = query.filter(
            or_(
                User.full_name.ilike(f"%{q}%"),
                User.email.ilike(f"%{q}%"),
                Student.roll_number.ilike(f"%{q}%")
            )
        )
    if department:
        query = query.filter(Department.name.ilike(f"%{department}%"))
    if semester:
        query = query.filter(Student.current_semester == semester)
    students = query.offset(skip).limit(limit).all()
    result = []
    for student in students:
        result.append({
            "id": student.id,
            "user_id": student.user_id,
            "roll_number": student.roll_number,
            "full_name": student.user.full_name,
            "email": student.user.email,
            "department": student.department.name if student.department else None,
            "current_semester": student.current_semester,
            "gpa": student.gpa,
        })
    return {"results": result, "count": len(result)}

@router.get("/payments/recent")
async def get_recent_payments(current_user: User = Depends(require_staff), db: Session = Depends(get_db)):
    from sqlalchemy import desc
    payments = db.query(PaymentRequest).order_by(desc(PaymentRequest.updated_at)).limit(10).all()
    result = []
    for p in payments:
        student = p.user.student_profile if p.user else None
        result.append({
            "id": p.id,
            "request_id": p.request_id,
            "student_name": p.user.full_name if p.user else "N/A",
            "roll_number": student.roll_number if student else "N/A",
            "amount_paid": p.amount_paid,
            "status": p.status,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        })
    return result

@router.post("/results", response_model=dict)
async def create_result(result_in: ResultCreate, current_user: User = Depends(require_staff), db: Session = Depends(get_db)):

    result_service = ResultService(db)
    result = result_service.create_result(result_in, current_user.id)
    return result

@router.get("/results")
async def get_all_results(
    search: Optional[str] = None,
    semester: Optional[str] = None,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):

    result_service = ResultService(db)
    results = result_service.get_all_results(search=search, semester=semester)
    return results

@router.post("/results/csv")
async def upload_results_csv(file: UploadFile = File(...), current_user: User = Depends(require_staff), db: Session = Depends(get_db)):

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    try:
        content = await file.read()
        csv_content = content.decode("utf-8")
        result_service = ResultService(db)
        result = result_service.upload_csv(csv_content, current_user.id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing CSV: {str(e)}")

@router.get("/bonafides")
async def get_all_bonafides(current_user: User = Depends(require_staff), db: Session = Depends(get_db)):

    bonafide_service = BonafideService(db)
    
    department_id = None
    if current_user.role == "staff" and current_user.department_id:
        department_id = current_user.department_id
        
    requests = bonafide_service.get_all_requests(department_id=department_id)
    return requests

@router.put("/bonafides/{request_id}")
async def update_bonafide(request_id: int, request_in: BonafideRequestUpdate, current_user: User = Depends(require_staff), db: Session = Depends(get_db)):

    bonafide_service = BonafideService(db)
    request = bonafide_service.update_request(request_id, request_in, current_user.id)
    if not request:
        raise HTTPException(status_code=404, detail="Bonafide request not found")
        
    # Send WebSocket notification to the student
    from ...core.websocket import websocket_manager
    await websocket_manager.send_notification_to_user(request.user_id, {
        "type": "REQUEST_UPDATED",
        "category": "bonafide",
        "title": f"Bonafide Request {request.status.upper()}",
        "message": f"Your bonafide request has been {request.status}.",
        "request_id": request.id,
        "status": request.status
    })
    
    return request

@router.get("/results/{result_id}/pdf")
async def get_result_pdf(result_id: int, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    result = db.query(Result).filter(Result.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")

    if current_user.role == "student" and result.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    pdf_path = f"{settings.PDF_STORAGE_PATH}/result_{result_id}.pdf"
    os.makedirs(settings.PDF_STORAGE_PATH, exist_ok=True)

    if not os.path.exists(pdf_path):
        student = db.query(User).filter(User.id == result.user_id).first()
        PDFService.generate_result_pdf({
            "id": result.id,
            "student_name": student.full_name if student else "N/A",
            "roll_number": student.student_id if student else "N/A",
            "semester": result.semester,
            "gpa": result.gpa,
            "total_marks": result.total_marks,
            "percentage": result.percentage,
            "grade": result.grade,
            "pass_fail": result.pass_fail,
            "published_at": result.published_at.strftime("%Y-%m-%d") if result.published_at else "",
        }, pdf_path)

    return FileResponse(pdf_path, filename=f"result_{result_id}.pdf", media_type="application/pdf")
