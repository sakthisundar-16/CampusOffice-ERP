import enum
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base


class RequestType(str, enum.Enum):
    PAYMENT = "payment"
    DOCUMENT = "document"
    RESULT = "result"
    PROFILE_UPDATE = "profile_update"
    CERTIFICATE = "certificate"


class RequestStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    PROCESSING = "processing"
    APPROVED = "approved"
    GENERATED = "generated"
    COMPLETED = "completed"
    REJECTED = "rejected"
    RETURNED = "returned"


class UnifiedRequest(Base):
    __tablename__ = "unified_requests"
    id = Column(Integer, primary_key=True, index=True)
    request_number = Column(String, unique=True, nullable=False, index=True)
    request_type = Column(String, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    status = Column(String, default=RequestStatus.SUBMITTED.value, index=True)
    priority = Column(String, default="normal")
    reference_id = Column(Integer, nullable=True)
    reference_type = Column(String, nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=True)
    academic_year = Column(String, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    processed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    remarks = Column(Text, nullable=True)
    request_metadata = Column(Text, nullable=True)
    
    user = relationship("User", foreign_keys=[user_id])
    processor = relationship("User", foreign_keys=[processed_by])
    department = relationship("Department")
    semester = relationship("Semester")
