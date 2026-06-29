from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from .base import BaseModel

class BonafideRequest(BaseModel):
    __tablename__ = "bonafide_requests"

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    purpose = Column(String, nullable=True)
    reason = Column(String, nullable=True)
    required_date = Column(String, nullable=True)
    additional_notes = Column(String, nullable=True)
    status = Column(String, default="pending")
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    remarks = Column(String, nullable=True)
    certificate_path = Column(String, nullable=True)

    user = relationship("User", foreign_keys=[user_id])
    approver = relationship("User", foreign_keys=[approved_by])
