from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, ForeignKey
from sqlalchemy.orm import relationship
from .base import BaseModel

class Semester(BaseModel):
    __tablename__ = "semesters"

    name = Column(String, unique=True, nullable=False)
    academic_year = Column(String, nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    is_current = Column(Boolean, default=False)

    fee_structures = relationship("FeeStructure", back_populates="semester", cascade="all, delete-orphan")
    subjects = relationship("Subject", back_populates="semester", cascade="all, delete-orphan")
    student_results = relationship("StudentResult", back_populates="semester")
