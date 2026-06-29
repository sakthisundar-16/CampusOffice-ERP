from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from .base import BaseModel

class Subject(BaseModel):
    __tablename__ = "subjects"

    name = Column(String, nullable=False)
    code = Column(String, unique=True, nullable=False)
    credit_hours = Column(Integer, nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=True)

    semester = relationship("Semester", back_populates="subjects")
    results = relationship("StudentResult", back_populates="subject", cascade="all, delete-orphan")
