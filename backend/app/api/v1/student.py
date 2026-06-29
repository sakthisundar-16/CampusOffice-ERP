from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
from datetime import datetime
from ...database import SessionLocal
from ...models import User, Student, PaymentRequest, Result, BonafideRequest, Notification, FeeStructure, Semester, Department, DocumentRequest, DocumentType
from ...schemas import PaymentRequestCreate, BonafideRequestCreate, NotificationResponse, BonafideRequestResponse
from ...core.config import settings
from ...services.payment_service import PaymentService
from ...services.result_service import ResultService
from ...services.bonafide_service import BonafideService
from ...services.notification_service import NotificationService
from ...services.pdf_service import PDFService
from ...services.request_engine_service import RequestEngineService
from ...core.security import get_current_active_user
from ...dependencies.rbac import require_student

router = APIRouter(prefix="/api/v1/student", tags=["student"])

class CustomFeeStructure:
    def __init__(self, semester_id, fee_name, amount, due_date, is_active=True, id=None):
        self.semester_id = semester_id
        self.fee_name = fee_name
        self.amount = amount
        self.due_date = due_date
        self.is_active = is_active
        self.id = id

def _get_student_custom_fees(db, student, all_fee_structures):
    custom_fees = []
    for f in all_fee_structures:
        amount = f.amount
        name_lower = f.fee_name.lower()
        is_academic_fee = any(x in name_lower for x in ["tuition", "academic", "exam", "admission", "library", "lab", "college"])
        
        if is_academic_fee:
            if student.quota == "7.5 Scheme":
                amount = 0.0
            elif student.quota == "Sports Quota":
                amount = f.amount * 0.5

        custom_fees.append(
            CustomFeeStructure(
                semester_id=f.semester_id,
                fee_name=f.fee_name,
                amount=amount,
                due_date=f.due_date,
                is_active=f.is_active,
                id=f.id
            )
        )

    if student.transport_route and student.transport_fee > 0:
        curr_sem_id = student.current_semester
        if curr_sem_id:
            due_dt = datetime.utcnow()
            sem_fees = [f for f in all_fee_structures if f.semester_id == curr_sem_id]
            if sem_fees:
                due_dt = sem_fees[0].due_date
            custom_fees.append(
                CustomFeeStructure(
                    semester_id=curr_sem_id,
                    fee_name=f"Transport Fee ({student.transport_route})",
                    amount=student.transport_fee,
                    due_date=due_dt,
                    is_active=True,
                    id=-999
                )
            )

    return custom_fees

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/fee-ledger")
async def get_fee_ledger(current_user: User = Depends(require_student), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        # Auto-create a minimal student profile so the dashboard doesn't crash
        from datetime import date
        student = Student(
            user_id=current_user.id,
            roll_number=current_user.student_id or f"STU{current_user.id:06d}",
            admission_date=datetime.utcnow(),
            current_semester=1,
        )
        db.add(student)
        db.commit()
        db.refresh(student)

    semesters = db.query(Semester).order_by(Semester.start_date.desc()).all()
    raw_fee_structures = db.query(FeeStructure).filter(FeeStructure.is_active == True).all()
    all_fee_structures = _get_student_custom_fees(db, student, raw_fee_structures)
    all_payments = db.query(PaymentRequest).filter(
        PaymentRequest.user_id == current_user.id
    ).all()

    ledger = []
    total_fee = 0
    total_paid = 0
    total_pending = 0
    latest_payment = None
    latest_payment_date = None

    for semester in semesters:
        semester_fee_structures = [f for f in all_fee_structures if f.semester_id == semester.id]
        semester_total_fee = sum(f.amount for f in semester_fee_structures)

        semester_paid = 0
        semester_all_payments = []
        for p in all_payments:
            if p.semester_id == semester.id and p.status == "completed":
                semester_paid += p.amount_paid or 0
                semester_all_payments.append(p)

        semester_pending = semester_total_fee - semester_paid

        if semester_pending < 0:
            semester_pending = 0

        total_fee += semester_total_fee
        total_paid += semester_paid
        total_pending += semester_pending

        if semester_pending == 0 and semester_total_fee > 0:
            payment_status = "paid"
        elif semester_pending < semester_total_fee:
            payment_status = "partially_paid"
        else:
            payment_status = "not_paid"

        fee_breakdown = {}
        for f in semester_fee_structures:
            fee_breakdown[f.fee_name] = f.amount

        semester_percentage = round((semester_paid / semester_total_fee * 100), 2) if semester_total_fee > 0 else 0

        last_payment = None
        if semester_all_payments:
            semester_all_payments.sort(key=lambda x: x.payment_date or datetime.min, reverse=True)
            last_payment = semester_all_payments[0]
            if latest_payment_date is None or (last_payment.payment_date and last_payment.payment_date > latest_payment_date):
                latest_payment = last_payment
                latest_payment_date = last_payment.payment_date

        ledger.append({
            "semester_id": semester.id,
            "semester_name": semester.name,
            "academic_year": semester.academic_year,
            "fee_breakdown": fee_breakdown,
            "total_fee": semester_total_fee,
            "paid_amount": semester_paid,
            "pending_amount": semester_pending,
            "payment_percentage": semester_percentage,
            "payment_status": payment_status,
            "last_payment_date": last_payment.payment_date.isoformat() if last_payment and last_payment.payment_date else None,
        })

    payment_percentage = round((total_paid / total_fee * 100), 2) if total_fee > 0 else 0

    latest_receipt = None
    if latest_payment and latest_payment.receipt_path:
        latest_receipt = latest_payment.receipt_path

    current_semester_fee = 0
    for semester in semesters:
        if semester.id == student.current_semester:
            current_semester_fee = sum(f.amount for f in all_fee_structures if f.semester_id == semester.id)
            break

    return {
        "student_id": student.id,
        "roll_number": student.roll_number,
        "current_semester": student.current_semester,
        "ledger": ledger,
        "total_fee": total_fee,
        "total_paid": total_paid,
        "total_pending": total_pending,
        "payment_percentage": payment_percentage,
        "outstanding_balance": total_pending,
        "current_semester_fee": current_semester_fee,
        "latest_receipt": latest_receipt,
    }

@router.get("/dashboard")
async def get_dashboard(current_user: User = Depends(require_student), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        # Auto-create a minimal student profile so the dashboard doesn't crash
        student = Student(
            user_id=current_user.id,
            roll_number=current_user.student_id or f"STU{current_user.id:06d}",
            admission_date=datetime.utcnow(),
            current_semester=1,
        )
        db.add(student)
        db.commit()
        db.refresh(student)

    request_engine = RequestEngineService(db)
    
    payments = db.query(PaymentRequest).filter(
        PaymentRequest.user_id == current_user.id,
    ).all()
    results = db.query(Result).filter(Result.user_id == current_user.id).all()
    bonafides = db.query(BonafideRequest).filter(BonafideRequest.user_id == current_user.id).all()
    doc_requests = db.query(DocumentRequest).filter(DocumentRequest.user_id == current_user.id).all()
    notifications = db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read == False, Notification.is_archived == False).order_by(Notification.created_at.desc()).limit(5).all()
    all_notifications = db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_archived == False).order_by(Notification.created_at.desc()).limit(10).all()

    semesters = db.query(Semester).order_by(Semester.start_date.desc()).all()
    raw_fee_structures = db.query(FeeStructure).filter(FeeStructure.is_active == True).all()
    all_fee_structures = _get_student_custom_fees(db, student, raw_fee_structures)

    total_fee = 0
    total_paid = 0
    latest_receipt = None
    latest_payment_date = None

    for semester in semesters:
        semester_fee_structures = [f for f in all_fee_structures if f.semester_id == semester.id]
        semester_total_fee = sum(f.amount for f in semester_fee_structures)
        total_fee += semester_total_fee

    for p in payments:
        if p.status == "completed":
            total_paid += p.amount_paid or 0
            if p.payment_date:
                if latest_payment_date is None or p.payment_date > latest_payment_date:
                    latest_payment_date = p.payment_date
                    latest_receipt = p.receipt_path

    total_pending = total_fee - total_paid
    if total_pending < 0:
        total_pending = 0

    payment_percentage = round((total_paid / total_fee * 100), 2) if total_fee > 0 else 0

    current_semester_fee = 0
    for semester in semesters:
        if semester.id == student.current_semester:
            current_semester_fee = sum(f.amount for f in all_fee_structures if f.semester_id == semester.id)
            break

    latest_status = "no_payments"
    latest_completed = None
    for p in sorted(payments, key=lambda x: x.created_at or datetime.min, reverse=True):
        if p.status == "completed":
            latest_status = "completed"
            latest_completed = p
            break
        elif p.status == "pending":
            latest_status = "pending"
            break
        elif p.status == "rejected":
            latest_status = "rejected"

    current_semester = db.query(Semester).filter(Semester.id == student.current_semester).first()

    recent_doc_requests = sorted(doc_requests, key=lambda x: x.created_at or datetime.min, reverse=True)[:5]
    recent_results = sorted(results, key=lambda x: x.published_at or datetime.min, reverse=True)[:5]
    recent_bonafides = sorted(bonafides, key=lambda x: x.created_at or datetime.min, reverse=True)[:3]

    upcoming_due_dates = []
    for f in all_fee_structures:
        sem = db.query(Semester).filter(Semester.id == f.semester_id).first()
        if sem:
            upcoming_due_dates.append({
                "fee_name": f.fee_name,
                "amount": f.amount,
                "due_date": f.due_date.isoformat() if f.due_date else None,
                "semester_name": sem.name,
                "academic_year": getattr(sem, 'academic_year', None),
            })
    upcoming_due_dates.sort(key=lambda x: x.get("due_date") or "")

    # Get activity history from RequestEngine
    activity_history = request_engine.get_user_activity_history(current_user.id, limit=30)
    
    recent_activities = []
    for p in sorted(payments, key=lambda x: x.created_at or datetime.min, reverse=True)[:10]:
        recent_activities.append({
            "type": "payment",
            "event": f"Payment {p.status}",
            "timestamp": p.updated_at.isoformat() if p.updated_at else None,
            "details": f"Request {p.request_id} - Amount: Rs. {p.amount_paid}",
            "status": p.status,
        })
    for dr in sorted(doc_requests, key=lambda x: x.created_at or datetime.min, reverse=True)[:10]:
        doc_type = db.query(DocumentType).filter(DocumentType.id == dr.document_type_id).first()
        recent_activities.append({
            "type": "document",
            "event": f"Document request {dr.status}",
            "timestamp": dr.updated_at.isoformat() if dr.updated_at else None,
            "details": f"{doc_type.name if doc_type else 'Document'} - {dr.request_number}",
            "status": dr.status,
        })
    for b in sorted(bonafides, key=lambda x: x.created_at or datetime.min, reverse=True)[:5]:
        recent_activities.append({
            "type": "bonafide",
            "event": f"Bonafide {b.status}",
            "timestamp": b.updated_at.isoformat() if b.updated_at else None,
            "details": f"Request #{b.id}",
            "status": b.status,
        })
    for r in sorted(results, key=lambda x: x.published_at or datetime.min, reverse=True)[:5]:
        recent_activities.append({
            "type": "result",
            "event": "Result published",
            "timestamp": r.published_at.isoformat() if r.published_at else None,
            "details": f"Semester {r.semester} - GPA: {r.gpa}",
            "status": r.pass_fail or "published",
        })
    for n in sorted(all_notifications, key=lambda x: x.created_at or datetime.min, reverse=True)[:10]:
        recent_activities.append({
            "type": "notification",
            "event": n.title,
            "timestamp": n.created_at.isoformat() if n.created_at else None,
            "details": n.message,
            "status": "unread" if not n.is_read else "read",
        })
    recent_activities.sort(key=lambda x: x.get("timestamp") or "", reverse=True)

    # Get unified requests
    unified_requests = request_engine.get_requests_by_user(current_user.id, limit=10)

    return {
        "student": {
            "id": student.id,
            "full_name": current_user.full_name,
            "roll_number": student.roll_number,
            "current_semester": student.current_semester,
            "current_semester_name": current_semester.name if current_semester else None,
            "gpa": student.gpa,
        },
        "payments": len(payments),
        "results": len(results),
        "bonafides": len(bonafides),
        "document_requests": len(doc_requests),
        "notifications": len(notifications),
        "latest_payment_status": latest_status,
        "latest_receipt": latest_receipt,
        "latest_completed_payment": {
            "id": latest_completed.id,
            "request_id": latest_completed.request_id,
            "receipt_number": latest_completed.receipt_number,
            "amount_paid": latest_completed.amount_paid,
            "payment_date": latest_completed.payment_date.isoformat() if latest_completed.payment_date else None,
            "verified_at": latest_completed.verified_at.isoformat() if latest_completed.verified_at else None,
        } if latest_completed else None,
        "fee_summary": {
            "total_fee": total_fee,
            "total_paid": total_paid,
            "total_pending": total_pending,
            "payment_percentage": payment_percentage,
            "current_semester_fee": current_semester_fee,
            "latest_receipt": latest_receipt,
        },
        "latest_notifications": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "category": n.category,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in notifications
        ],
        "recent_document_requests": [
            {
                "id": dr.id,
                "request_number": dr.request_number,
                "document_type": (db.query(DocumentType).filter(DocumentType.id == dr.document_type_id).first().name if db.query(DocumentType).filter(DocumentType.id == dr.document_type_id).first() else "Document"),
                "status": dr.status,
                "certificate_number": dr.certificate_number,
                "created_at": dr.created_at.isoformat() if dr.created_at else None,
            }
            for dr in recent_doc_requests
        ],
        "latest_results": [
            {
                "id": r.id,
                "semester": r.semester,
                "gpa": r.gpa,
                "percentage": r.percentage,
                "grade": r.grade,
                "pass_fail": r.pass_fail,
                "published_at": r.published_at.isoformat() if r.published_at else None,
            }
            for r in recent_results
        ],
        "recent_activities": recent_activities[:20],
        "upcoming_due_dates": upcoming_due_dates,
        "activity_history": activity_history,
        "unified_requests": unified_requests,
    }

@router.get("/payments", response_model=List[dict])
async def get_payments(current_user: User = Depends(require_student), db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    payments = db.query(PaymentRequest).options(
        joinedload(PaymentRequest.semester)
    ).filter(PaymentRequest.user_id == current_user.id).order_by(PaymentRequest.created_at.desc()).all()

    result = []
    for p in payments:
        semester_name = p.semester.name if p.semester else "N/A"
        result.append({
            "id": p.id,
            "request_id": p.request_id,
            "user_id": p.user_id,
            "fee_structure_id": p.fee_structure_id,
            "semester_id": p.semester_id,
            "semester_name": semester_name,
            "academic_year": p.academic_year,
            "amount_paid": p.amount_paid,
            "payment_date": p.payment_date,
            "payment_proof": p.payment_proof,
            "transaction_id": p.transaction_id,
            "bank_name": p.bank_name,
            "upi_reference": p.upi_reference,
            "status": p.status,
            "verified_by": p.verified_by,
            "verified_at": p.verified_at,
            "remarks": p.remarks,
            "receipt_number": p.receipt_number,
            "receipt_path": p.receipt_path,
            "is_resubmitted": p.is_resubmitted,
            "original_request_id": p.original_request_id,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
        })
    return result

@router.post("/payments/resubmit/{original_request_id}")
async def resubmit_payment(
    original_request_id: int,
    amount_paid: float = Form(...),
    semester_id: int = Form(...),
    transaction_id: str = Form(...),
    bank_name: Optional[str] = Form(None),
    upi_reference: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    from datetime import datetime
    from ...schemas import PaymentRequestCreate
    payment_service = PaymentService(db)

    try:
        payment_in = PaymentRequestCreate(
            semester_id=semester_id,
            amount_paid=amount_paid,
            transaction_id=transaction_id,
            bank_name=bank_name,
            upi_reference=upi_reference,
        )
        payment = payment_service.resubmit_payment(original_request_id, current_user.id, payment_in, file=file)
        return {
            "id": payment.id,
            "request_id": payment.request_id,
            "status": payment.status,
            "message": "Payment resubmitted successfully"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error resubmitting payment: {str(e)}")

@router.post("/payments")
async def create_payment(
    semester_id: int = Form(...),
    amount_paid: float = Form(...),
    transaction_id: str = Form(...),
    bank_name: Optional[str] = Form(None),
    upi_reference: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    from datetime import datetime
    from ...schemas import PaymentRequestCreate
    payment_service = PaymentService(db)

    try:
        payment_in = PaymentRequestCreate(
            semester_id=semester_id,
            amount_paid=amount_paid,
            transaction_id=transaction_id,
            bank_name=bank_name,
            upi_reference=upi_reference,
        )
        payment = payment_service.create_payment_request(payment_in, current_user.id, file=file)
        
        # Save persistent notification in database for staff and admin
        from ...services.notification_service import NotificationService
        ns = NotificationService(db)
        ns.notify_staff_and_admin(
            title="New Payment Submitted",
            message=f"Student {current_user.full_name} submitted a payment of Rs. {amount_paid}.",
            category="payment"
        )

        # Send WebSocket notification to staff and admin
        from ...core.websocket import websocket_manager
        await websocket_manager.broadcast_to_role("staff", {
            "type": "NEW_REQUEST",
            "category": "payment",
            "title": "New Payment Submitted",
            "message": f"Student {current_user.full_name} submitted a payment of Rs. {amount_paid}.",
            "student_id": current_user.student_id
        })
        await websocket_manager.broadcast_to_role("admin", {
            "type": "NEW_REQUEST",
            "category": "payment",
            "title": "New Payment Submitted",
            "message": f"Student {current_user.full_name} submitted a payment of Rs. {amount_paid}.",
            "student_id": current_user.student_id
        })

        return {
            "id": payment.id,
            "request_id": payment.request_id,
            "status": payment.status,
            "message": "Payment submitted successfully"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating payment: {str(e)}")

@router.get("/payments/{payment_id}/receipt")
async def get_payment_receipt(
    payment_id: int,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    payment = db.query(PaymentRequest).filter(PaymentRequest.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if payment.status != "completed":
        raise HTTPException(status_code=400, detail="Receipt only available for completed payments")

    if not payment.receipt_path or not os.path.exists(payment.receipt_path):
        raise HTTPException(status_code=404, detail="Receipt not generated yet")

    filename = os.path.basename(payment.receipt_path)
    return FileResponse(payment.receipt_path, filename=filename, media_type="application/pdf")

@router.get("/results")
async def get_results(semester: Optional[str] = None, current_user: User = Depends(require_student), db: Session = Depends(get_db)):
    result_service = ResultService(db)
    results = result_service.get_results_by_user(current_user.id, semester=semester)
    return results

@router.get("/results/{result_id}/pdf")
async def get_result_pdf(result_id: int, current_user: User = Depends(require_student), db: Session = Depends(get_db)):
    result = db.query(Result).filter(Result.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")

    if result.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    os.makedirs(settings.PDF_STORAGE_PATH, exist_ok=True)
    pdf_path = f"{settings.PDF_STORAGE_PATH}/result_{result_id}.pdf"

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

@router.post("/bonafides", response_model=BonafideRequestResponse)
async def create_bonafide(request_in: BonafideRequestCreate, current_user: User = Depends(require_student), db: Session = Depends(get_db)):
    bonafide_service = BonafideService(db)
    request = bonafide_service.create_request(request_in, current_user.id)
    
    # Save persistent notification in database for staff and admin
    from ...services.notification_service import NotificationService
    ns = NotificationService(db)
    ns.notify_staff_and_admin(
        title="New Bonafide Request",
        message=f"Student {current_user.full_name} submitted a new bonafide request.",
        category="system"
    )

    # Send WebSocket notification to staff and admin
    from ...core.websocket import websocket_manager
    await websocket_manager.broadcast_to_role("staff", {
        "type": "NEW_REQUEST",
        "category": "bonafide",
        "title": "New Bonafide Request",
        "message": f"Student {current_user.full_name} submitted a new bonafide request.",
        "student_id": current_user.student_id
    })
    await websocket_manager.broadcast_to_role("admin", {
        "type": "NEW_REQUEST",
        "category": "bonafide",
        "title": "New Bonafide Request",
        "message": f"Student {current_user.full_name} submitted a new bonafide request.",
        "student_id": current_user.student_id
    })
    
    return request

@router.get("/bonafides")
async def get_bonafides(current_user: User = Depends(require_student), db: Session = Depends(get_db)):
    bonafide_service = BonafideService(db)
    requests = bonafide_service.get_requests_by_user(current_user.id)
    return requests

@router.get("/notifications")
async def get_notifications(category: Optional[str] = None, current_user: User = Depends(require_student), db: Session = Depends(get_db)):
    notification_service = NotificationService(db)
    notifications = notification_service.get_notifications_by_user(current_user.id, category=category)
    return notifications

@router.get("/notifications/unread-count")
async def get_unread_count(current_user: User = Depends(require_student), db: Session = Depends(get_db)):
    notification_service = NotificationService(db)
    count = notification_service.get_unread_count(current_user.id)
    return {"count": count}

@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: int, current_user: User = Depends(require_student), db: Session = Depends(get_db)):
    notification_service = NotificationService(db)
    notification = notification_service.mark_as_read(notification_id, current_user.id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notification

@router.put("/notifications/read-all")
async def mark_all_notifications_read(current_user: User = Depends(require_student), db: Session = Depends(get_db)):
    notification_service = NotificationService(db)
    notification_service.mark_all_as_read(current_user.id)
    return {"message": "All notifications marked as read"}

@router.get("/notifications/unread-count")
async def get_unread_count(current_user: User = Depends(require_student), db: Session = Depends(get_db)):
    notification_service = NotificationService(db)
    counts = notification_service.get_unread_counts_by_category(current_user.id)
    return counts

@router.get("/activity")
async def get_activity(current_user: User = Depends(require_student), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    payments = db.query(PaymentRequest).filter(PaymentRequest.user_id == current_user.id).all()
    results = db.query(Result).filter(Result.user_id == current_user.id).all()
    bonafides = db.query(BonafideRequest).filter(BonafideRequest.user_id == current_user.id).all()
    doc_requests = db.query(DocumentRequest).filter(DocumentRequest.user_id == current_user.id).all()
    notifications = db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_archived == False).order_by(Notification.created_at.desc()).limit(20).all()

    activities = []
    for p in sorted(payments, key=lambda x: x.updated_at or datetime.min, reverse=True)[:10]:
        activities.append({
            "type": "payment",
            "event": f"Payment {p.status.title()}",
            "timestamp": p.updated_at.isoformat() if p.updated_at else None,
            "details": {
                "request_id": p.request_id,
                "amount": p.amount_paid,
                "status": p.status,
                "receipt_number": p.receipt_number,
            },
        })
    for dr in sorted(doc_requests, key=lambda x: x.updated_at or datetime.min, reverse=True)[:10]:
        doc_type = db.query(DocumentType).filter(DocumentType.id == dr.document_type_id).first()
        activities.append({
            "type": "document",
            "event": f"Document {dr.status.title()}",
            "timestamp": dr.updated_at.isoformat() if dr.updated_at else None,
            "details": {
                "request_number": dr.request_number,
                "document_type": doc_type.name if doc_type else "Document",
                "status": dr.status,
                "certificate_number": dr.certificate_number,
            },
        })
    for b in sorted(bonafides, key=lambda x: x.updated_at or datetime.min, reverse=True)[:5]:
        activities.append({
            "type": "bonafide",
            "event": f"Bonafide {b.status.title()}",
            "timestamp": b.updated_at.isoformat() if b.updated_at else None,
            "details": {
                "request_id": b.id,
                "status": b.status,
            },
        })
    for r in sorted(results, key=lambda x: x.published_at or datetime.min, reverse=True)[:5]:
        activities.append({
            "type": "result",
            "event": "Result Published",
            "timestamp": r.published_at.isoformat() if r.published_at else None,
            "details": {
                "semester": r.semester,
                "gpa": r.gpa,
                "pass_fail": r.pass_fail,
            },
        })
    for n in sorted(notifications, key=lambda x: x.created_at or datetime.min, reverse=True)[:10]:
        activities.append({
            "type": "notification",
            "event": n.title,
            "timestamp": n.created_at.isoformat() if n.created_at else None,
            "details": {
                "message": n.message,
                "category": n.category,
                "is_read": n.is_read,
            },
        })

    activities.sort(key=lambda x: x.get("timestamp") or "", reverse=True)
    return {"activities": activities[:30]}

@router.put("/notifications/{notification_id}/archive")
async def archive_notification(notification_id: int, current_user: User = Depends(require_student), db: Session = Depends(get_db)):
    notification_service = NotificationService(db)
    notification = notification_service.archive_notification(notification_id, current_user.id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification archived"}

@router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: int, current_user: User = Depends(require_student), db: Session = Depends(get_db)):
    notification_service = NotificationService(db)
    success = notification_service.delete_notification(notification_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification deleted"}