from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, ForeignKey
from sqlalchemy.orm import relationship
from .base import BaseModel

class FeeStructure(BaseModel):
    __tablename__ = "fee_structures"

    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=False)
    fee_name = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    due_date = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)

    semester = relationship("Semester", back_populates="fee_structures")
    payment_requests = relationship("PaymentRequest", back_populates="fee_structure")
