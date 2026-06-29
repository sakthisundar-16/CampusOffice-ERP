from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional

class PaymentRequestBase(BaseModel):
    user_id: int
    department_id: Optional[int] = None
    fee_structure_id: Optional[int] = None
    semester_id: Optional[int] = None
    academic_year: Optional[str] = None
    amount_paid: float
    payment_date: Optional[datetime] = None
    payment_proof: Optional[str] = None
    transaction_id: str
    upi_reference: Optional[str] = None
    bank_name: Optional[str] = None
    status: str = "pending"

class PaymentRequestCreate(BaseModel):
    semester_id: int
    amount_paid: float
    transaction_id: str
    bank_name: Optional[str] = None
    upi_reference: Optional[str] = None

class PaymentRequestUpdate(BaseModel):
    status: Optional[str] = None
    verified_by: Optional[int] = None
    verified_at: Optional[datetime] = None
    remarks: Optional[str] = None
    receipt_path: Optional[str] = None
    receipt_number: Optional[str] = None

class PaymentRequestResponse(BaseModel):
    id: int
    request_id: str
    user_id: int
    department_id: Optional[int] = None
    fee_structure_id: Optional[int] = None
    semester_id: Optional[int] = None
    academic_year: Optional[str] = None
    amount_paid: float
    payment_date: Optional[datetime] = None
    payment_proof: Optional[str] = None
    transaction_id: str
    upi_reference: Optional[str] = None
    bank_name: Optional[str] = None
    status: str
    verified_by: Optional[int] = None
    verified_at: Optional[datetime] = None
    remarks: Optional[str] = None
    receipt_number: Optional[str] = None
    receipt_path: Optional[str] = None
    is_resubmitted: bool = False
    original_request_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    department: Optional[str] = None
    department_code: Optional[str] = None
    semester_name: Optional[str] = None
    fee_name: Optional[str] = None
    verifier_name: Optional[str] = None

    class Config:
        from_attributes = True
