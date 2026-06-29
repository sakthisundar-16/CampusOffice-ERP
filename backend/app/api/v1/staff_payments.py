from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from datetime import datetime
import os
from ...database import SessionLocal
from ...models import User, Student, PaymentRequest, Department, FeeStructure, Semester
from ...schemas import PaymentRequestUpdate, PaymentRequestResponse
from ...services.payment_service import PaymentService
from ...services.pdf_service import PDFService
from ...services.workflow_automation_service import WorkflowAutomationService
from ...core.security import get_current_active_user
from ...dependencies.rbac import require_staff, verify_payment_ownership

router = APIRouter(prefix="/api/v1/staff", tags=["staff-payments"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/payments")
async def get_all_payments(
    status: Optional[str] = None,
    department: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    query = db.query(PaymentRequest).options(
        joinedload(PaymentRequest.user).joinedload(User.department),
        joinedload(PaymentRequest.fee_structure).joinedload(FeeStructure.semester),
        joinedload(PaymentRequest.semester),
        joinedload(PaymentRequest.user).joinedload(User.student_profile),
        joinedload(PaymentRequest.department),
    ).join(User, PaymentRequest.user_id == User.id).outerjoin(Student, Student.user_id == User.id).outerjoin(Department, Student.department_id == Department.id)

    if status:
        query = query.filter(PaymentRequest.status == status)
    if department:
        query = query.filter(Department.name.ilike(f"%{department}%"))

    if current_user.role == "staff" and current_user.department_id:
        query = query.filter(User.department_id == current_user.department_id)

    payments = query.offset(skip).limit(limit).all()

    result = []
    for payment in payments:
        student = payment.user.student_profile if payment.user else None
        semester_name = "N/A"
        if payment.semester:
            semester_name = payment.semester.name
        elif payment.fee_structure and payment.fee_structure.semester:
            semester_name = payment.fee_structure.semester.name
        dept_name = "N/A"
        if payment.department:
            dept_name = payment.department.name
        elif payment.user and payment.user.department:
            dept_name = payment.user.department.name
        result.append({
            "id": payment.id,
            "request_id": payment.request_id,
            "user_id": payment.user_id,
            "student_name": payment.user.full_name if payment.user else "N/A",
            "roll_number": student.roll_number if student else "N/A",
            "semester_id": payment.semester_id,
            "department": dept_name,
            "semester": semester_name,
            "academic_year": payment.academic_year,
            "amount_paid": payment.amount_paid,
            "payment_proof": payment.payment_proof,
            "transaction_id": payment.transaction_id,
            "bank_name": payment.bank_name,
            "upi_reference": payment.upi_reference,
            "status": payment.status,
            "verified_by": payment.verified_by,
            "verified_at": payment.verified_at.isoformat() if payment.verified_at else None,
            "remarks": payment.remarks,
            "receipt_number": payment.receipt_number,
            "receipt_path": payment.receipt_path,
            "is_resubmitted": payment.is_resubmitted,
            "created_at": payment.created_at.isoformat() if payment.created_at else None,
            "updated_at": payment.updated_at.isoformat() if payment.updated_at else None,
        })

    return result

@router.put("/payments/{payment_id}/approve")
async def approve_payment(
    payment_id: int,
    request: Request,
    payment: PaymentRequest = Depends(verify_payment_ownership),
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    workflow_service = WorkflowAutomationService(db)
    ip_address = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    try:
        result = workflow_service.execute_payment_approved_workflow(
            payment_id=payment_id,
            approved_by=current_user.id,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        # Send WebSocket notification to the student
        from ...core.websocket import websocket_manager
        await websocket_manager.send_notification_to_user(payment.user_id, {
            "type": "REQUEST_UPDATED",
            "category": "payment",
            "title": "Payment Approved",
            "message": f"Your payment request of Rs. {payment.amount_paid} has been approved.",
            "request_id": payment.id,
            "status": "completed"
        })

        return {
            "id": payment_id,
            "receipt_number": result.get('receipt_number'),
            "receipt_path": result.get('receipt_path'),
            "message": "Payment approved successfully. Receipt generated."
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error approving payment: {str(e)}")

@router.put("/payments/{payment_id}/reject")
async def reject_payment(
    payment_id: int,
    remarks: str = Form(...),
    request: Request = None,
    payment: PaymentRequest = Depends(verify_payment_ownership),
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    workflow_service = WorkflowAutomationService(db)
    ip_address = request.client.host if request and request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown") if request else "unknown"

    try:
        result = workflow_service.execute_payment_rejected_workflow(
            payment_id=payment_id,
            rejected_by=current_user.id,
            remarks=remarks,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        # Send WebSocket notification to the student
        from ...core.websocket import websocket_manager
        await websocket_manager.send_notification_to_user(payment.user_id, {
            "type": "REQUEST_UPDATED",
            "category": "payment",
            "title": "Payment Rejected",
            "message": f"Your payment request of Rs. {payment.amount_paid} has been rejected. Reason: {remarks}",
            "request_id": payment.id,
            "status": "rejected"
        })

        return {
            "id": payment_id,
            "message": "Payment rejected successfully."
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error rejecting payment: {str(e)}")

@router.get("/payments/{payment_id}/receipt")
async def get_payment_receipt(payment_id: int, current_user: User = Depends(require_staff), db: Session = Depends(get_db)):
    payment = db.query(PaymentRequest).filter(PaymentRequest.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payment.status != "completed":
        raise HTTPException(status_code=400, detail="Receipt only available for completed payments")

    if not payment.receipt_path or not os.path.exists(payment.receipt_path):
        raise HTTPException(status_code=404, detail="Receipt not generated yet")

    filename = os.path.basename(payment.receipt_path)
    return FileResponse(payment.receipt_path, filename=filename, media_type="application/pdf")

@router.get("/payments/screenshot/{payment_id}")
async def get_payment_screenshot(payment_id: int, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    payment = db.query(PaymentRequest).filter(PaymentRequest.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    if current_user.role == "student" and payment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this file")

    if not payment.payment_proof or not os.path.exists(payment.payment_proof):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(payment.payment_proof)

@router.get("/payments/{payment_id}/verification-details")
async def get_payment_verification_details(payment_id: int, current_user: User = Depends(require_staff), db: Session = Depends(get_db)):
    payment = db.query(PaymentRequest).options(
        joinedload(PaymentRequest.user).joinedload(User.department),
        joinedload(PaymentRequest.fee_structure),
        joinedload(PaymentRequest.semester),
        joinedload(PaymentRequest.department),
    ).filter(PaymentRequest.id == payment_id).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    student = payment.user.student_profile if payment.user else None
    verifier = db.query(User).filter(User.id == payment.verified_by).first() if payment.verified_by else None

    return {
        "id": payment.id,
        "request_id": payment.request_id,
        "status": payment.status,
        "created_at": payment.created_at.isoformat() if payment.created_at else None,
        "updated_at": payment.updated_at.isoformat() if payment.updated_at else None,
        "student": {
            "id": payment.user.id if payment.user else None,
            "full_name": payment.user.full_name if payment.user else "N/A",
            "email": payment.user.email if payment.user else "N/A",
            "roll_number": student.roll_number if student else "N/A",
            "current_semester": student.current_semester if student else None,
            "phone": payment.user.phone if payment.user else "N/A",
        },
        "department": {
            "id": payment.department.id if payment.department else None,
            "name": payment.department.name if payment.department else (payment.user.department.name if payment.user and payment.user.department else "N/A"),
            "code": payment.department.code if payment.department else (payment.user.department.code if payment.user and payment.user.department else "N/A"),
        },
        "fee_details": {
            "fee_structure_id": payment.fee_structure.id if payment.fee_structure else None,
            "fee_name": payment.fee_structure.fee_name if payment.fee_structure else "Fee Payment",
            "amount": payment.fee_structure.amount if payment.fee_structure else None,
            "due_date": payment.fee_structure.due_date.isoformat() if payment.fee_structure and payment.fee_structure.due_date else None,
        },
        "semester": {
            "id": payment.semester.id if payment.semester else None,
            "name": payment.semester.name if payment.semester else "N/A",
            "academic_year": payment.academic_year or (payment.semester.academic_year if payment.semester else "N/A"),
        },
        "amount_paid": payment.amount_paid,
        "transaction_id": payment.transaction_id,
        "upi_reference": payment.upi_reference,
        "bank_name": payment.bank_name,
        "payment_date": payment.payment_date.isoformat() if payment.payment_date else None,
        "payment_proof": payment.payment_proof,
        "remarks": payment.remarks,
        "receipt_number": payment.receipt_number,
        "receipt_path": payment.receipt_path,
        "is_resubmitted": payment.is_resubmitted,
        "original_request_id": payment.original_request_id,
        "verified_by": {
            "id": verifier.id if verifier else None,
            "name": verifier.full_name if verifier else "N/A",
        },
        "verified_at": payment.verified_at.isoformat() if payment.verified_at else None,
    }
