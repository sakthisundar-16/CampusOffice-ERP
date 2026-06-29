from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from .base import BaseModel

class Department(BaseModel):
    __tablename__ = "departments"

    name = Column(String, unique=True, nullable=False)
    code = Column(String, unique=True, nullable=False)

    students = relationship("Student", back_populates="department")
    staffs = relationship("Staff", back_populates="department")
    admin_users = relationship("User", back_populates="department")
