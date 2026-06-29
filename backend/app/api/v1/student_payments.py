from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from ...database import SessionLocal
from ...models import User, PaymentRequest
from ...schemas import PaymentRequestCreate, PaymentRequestUpdate, PaymentRequestResponse
from ...services.payment_service import PaymentService
from ...core.security import get_current_active_user
from ...dependencies.rbac import require_student

router = APIRouter(prefix="/api/v1/student", tags=["student-payments"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/payments", response_model=list[PaymentRequestResponse])
async def get_payments(current_user: User = Depends(require_student), db: Session = Depends(get_db)):
    payments = db.query(PaymentRequest).options(
        joinedload(PaymentRequest.semester)
    ).filter(PaymentRequest.user_id == current_user.id).order_by(PaymentRequest.created_at.desc()).all()

    result = []
    for p in payments:
        p_dict = {
            "id": p.id,
            "user_id": p.user_id,
            "fee_structure_id": p.fee_structure_id,
            "semester_id": p.semester_id,
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
            "receipt_path": p.receipt_path,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
            "semester_name": p.semester.name if p.semester else None,
        }
        result.append(p_dict)
    return result

@router.post("/payments", response_model=PaymentRequestResponse)
async def create_payment(
    amount_paid: float = Form(...),
    payment_date: str = Form(...),
    transaction_id: str = Form(...),
    semester_id: int = Form(...),
    bank_name: Optional[str] = Form(None),
    upi_reference: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    from datetime import datetime
    payment_service = PaymentService(db)

    try:
        payment_in = PaymentRequestCreate(
            user_id=current_user.id,
            fee_structure_id=None,
            semester_id=semester_id,
            amount_paid=amount_paid,
            payment_date=datetime.fromisoformat(payment_date),
            transaction_id=transaction_id,
            bank_name=bank_name,
            upi_reference=upi_reference,
            status="pending"
        )
        payment = payment_service.create_payment_request(payment_in, current_user.id, file=file)
        return payment
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating payment: {str(e)}")