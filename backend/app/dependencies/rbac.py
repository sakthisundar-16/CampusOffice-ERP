from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import Optional
from ..core.security import get_current_active_user
from ..models import User, PaymentRequest, DocumentRequest, BonafideRequest
from ..database import SessionLocal


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def require_student(current_user: User = Depends(get_current_active_user)):
    if current_user.role != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return current_user


def require_staff(current_user: User = Depends(get_current_active_user)):
    if current_user.role != "staff":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return current_user


def require_admin(current_user: User = Depends(get_current_active_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return current_user


def require_staff_or_admin(current_user: User = Depends(get_current_active_user)):
    if current_user.role not in ("staff", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return current_user


def verify_payment_ownership(
    payment_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Prevent cross-user data access for payment requests"""
    payment = db.query(PaymentRequest).filter(PaymentRequest.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment request not found")
    
    if current_user.role == "admin":
        return payment
        
    if current_user.role == "staff":
        student_user = db.query(User).filter(User.id == payment.user_id).first()
        if not student_user or student_user.department_id != current_user.department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access requests from other departments"
            )
        return payment
    
    # Students can only access their own payments
    if payment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this payment request"
        )
    
    return payment


def verify_document_ownership(
    request_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Prevent cross-user data access for document requests"""
    doc_request = db.query(DocumentRequest).filter(DocumentRequest.id == request_id).first()
    if not doc_request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document request not found")
    
    if current_user.role == "admin":
        return doc_request
        
    if current_user.role == "staff":
        student_user = db.query(User).filter(User.id == doc_request.user_id).first()
        if not student_user or student_user.department_id != current_user.department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access requests from other departments"
            )
        return doc_request
    
    # Students can only access their own documents
    if doc_request.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this document request"
        )
    
    return doc_request


def verify_bonafide_ownership(
    bonafide_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Prevent cross-user data access for bonafide requests"""
    bonafide = db.query(BonafideRequest).filter(BonafideRequest.id == bonafide_id).first()
    if not bonafide:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bonafide request not found")
    
    if current_user.role == "admin":
        return bonafide
        
    if current_user.role == "staff":
        student_user = db.query(User).filter(User.id == bonafide.user_id).first()
        if not student_user or student_user.department_id != current_user.department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access requests from other departments"
            )
        return bonafide
    
    # Students can only access their own bonafides
    if bonafide.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this bonafide request"
        )
    
    return bonafide


def check_duplicate_payment(
    user_id: int,
    fee_structure_id: int,
    db: Session = Depends(get_db)
):
    """Prevent duplicate payment requests"""
    existing = db.query(PaymentRequest).filter(
        PaymentRequest.user_id == user_id,
        PaymentRequest.fee_structure_id == fee_structure_id,
        PaymentRequest.status.in_(["pending", "completed"])
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A payment request for this fee already exists (Request ID: {existing.request_id})"
        )
    
    return True


def check_duplicate_document_request(
    user_id: int,
    document_type_id: int,
    db: Session = Depends(get_db)
):
    """Prevent duplicate document requests"""
    existing = db.query(DocumentRequest).filter(
        DocumentRequest.user_id == user_id,
        DocumentRequest.document_type_id == document_type_id,
        DocumentRequest.status.in_(["pending", "under_review", "approved"])
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A document request of this type already exists (Request Number: {existing.request_number})"
        )
    
    return True


def verify_download_authorization(
    file_path: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Prevent unauthorized downloads"""
    # Check if the file belongs to the user's payment or document
    payment = db.query(PaymentRequest).filter(
        PaymentRequest.receipt_path == file_path,
        PaymentRequest.user_id == current_user.id
    ).first()
    
    if payment:
        return True
    
    doc_request = db.query(DocumentRequest).filter(
        DocumentRequest.certificate_path == file_path,
        DocumentRequest.user_id == current_user.id
    ).first()
    
    if doc_request:
        return True
    
    bonafide = db.query(BonafideRequest).filter(
        BonafideRequest.certificate_path == file_path,
        BonafideRequest.user_id == current_user.id
    ).first()
    
    if bonafide:
        return True
    
    # Staff and Admin can download any file
    if current_user.role in ("staff", "admin"):
        return True
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized to download this file"
    )


def get_client_ip(x_forwarded_for: Optional[str] = Header(None), x_real_ip: Optional[str] = Header(None)):
    """Extract client IP address from headers for audit logging"""
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    if x_real_ip:
        return x_real_ip
    return "unknown"


def get_user_agent(user_agent: Optional[str] = Header(None)):
    """Extract user agent from headers for audit logging"""
    return user_agent or "unknown"
