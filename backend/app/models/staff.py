from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from .base import BaseModel

class Staff(BaseModel):
    __tablename__ = "staff"

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    staff_id = Column(String, unique=True, nullable=False)
    hire_date = Column(DateTime, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)

    user = relationship("User", back_populates="staff_profile")
    department = relationship("Department", back_populates="staffs")
