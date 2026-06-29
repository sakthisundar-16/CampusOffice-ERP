from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
from ...database import SessionLocal
from ...models import User, PaymentRequest, BonafideRequest
from ...core.security import get_current_active_user
import os

router = APIRouter(prefix="/api/v1/files", tags=["files"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/payment/{payment_id}")
async def get_payment_file(
    payment_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    payment = db.query(PaymentRequest).filter(PaymentRequest.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if current_user.role == "student" and payment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if not payment.payment_proof or not os.path.exists(payment.payment_proof):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(payment.payment_proof)

@router.get("/bonafide/{request_id}")
async def get_bonafide_certificate(
    request_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    request = db.query(BonafideRequest).filter(BonafideRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if current_user.role == "student" and request.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if request.status != "approved":
        raise HTTPException(status_code=400, detail="Certificate not available")
    
    if not request.certificate_path or not os.path.exists(request.certificate_path):
        raise HTTPException(status_code=404, detail="Certificate not generated")
    
    return FileResponse(request.certificate_path, filename=f"bonafide_{request_id}.pdf", media_type="application/pdf")