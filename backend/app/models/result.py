from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, ForeignKey
from sqlalchemy.orm import relationship
from .base import BaseModel

class Result(BaseModel):
    __tablename__ = "results"

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    semester = Column(String, nullable=False)
    gpa = Column(Float, nullable=False)
    total_marks = Column(Float, nullable=True)
    percentage = Column(Float, nullable=True)
    grade = Column(String, nullable=True)
    pass_fail = Column(String, nullable=True)
    details = Column(String, nullable=True)
    published_at = Column(DateTime, nullable=False)

    user = relationship("User", back_populates="results")
    files = relationship("ResultFile", back_populates="result", cascade="all, delete-orphan")
