from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from .base import BaseModel

class ResultFile(BaseModel):
    __tablename__ = "result_files"

    result_id = Column(Integer, ForeignKey("results.id"), nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)

    result = relationship("Result", back_populates="files")
