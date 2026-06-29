from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float
from sqlalchemy.orm import relationship
from .base import BaseModel

class Student(BaseModel):
    __tablename__ = "students"

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    roll_number = Column(String, unique=True, nullable=False)
    admission_date = Column(DateTime, nullable=False)
    current_semester = Column(Integer, nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    gpa = Column(String, nullable=True)
    quota = Column(String, default="Govt Quota", nullable=False)
    transport_route = Column(String, nullable=True)
    transport_fee = Column(Float, default=0.0, nullable=False)

    user = relationship("User", back_populates="student_profile")
    department = relationship("Department", back_populates="students")
