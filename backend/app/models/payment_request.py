from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum, ForeignKey, Float, Index
from sqlalchemy.orm import relationship
from .base import BaseModel
import enum
import re
from datetime import datetime

class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    REJECTED = "rejected"

class PaymentRequest(BaseModel):
    __tablename__ = "payment_requests"

    request_id = Column(String, unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    fee_structure_id = Column(Integer, ForeignKey("fee_structures.id"), nullable=True)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=True)
    academic_year = Column(String, nullable=True)
    amount_paid = Column(Float, nullable=False)
    payment_date = Column(DateTime, nullable=True)
    payment_proof = Column(String, nullable=True)
    transaction_id = Column(String, nullable=True)
    upi_reference = Column(String, nullable=True)
    bank_name = Column(String, nullable=True)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING, index=True)
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    remarks = Column(String, nullable=True)
    receipt_number = Column(String, nullable=True)
    receipt_path = Column(String, nullable=True)
    is_resubmitted = Column(Boolean, default=False)
    original_request_id = Column(Integer, ForeignKey("payment_requests.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="payment_requests", foreign_keys=[user_id])
    department = relationship("Department")
    fee_structure = relationship("FeeStructure", back_populates="payment_requests")
    semester = relationship("Semester")
    verifier = relationship("User", foreign_keys=[verified_by])
    original_request = relationship("PaymentRequest", remote_side="PaymentRequest.id", foreign_keys=[original_request_id])

Index('ix_payment_requests_user_status', PaymentRequest.user_id, PaymentRequest.status)
