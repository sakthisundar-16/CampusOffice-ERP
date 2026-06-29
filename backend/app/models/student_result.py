from sqlalchemy import Column, Integer, String, ForeignKey, Float
from sqlalchemy.orm import relationship
from .base import BaseModel

class StudentResult(BaseModel):
    __tablename__ = "student_results"

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=False)
    marks_obtained = Column(Float, nullable=True)
    grade = Column(String, nullable=True)

    student = relationship("User")
    subject = relationship("Subject", back_populates="results")
    semester = relationship("Semester", back_populates="student_results")
