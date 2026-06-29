from sqlalchemy.orm import Session
from typing import List, Optional
from .. import models, schemas

class StudentCRUD:
    def get_by_id(self, db: Session, id: int) -> Optional[models.Student]:
        return db.query(models.Student).filter(models.Student.id == id).first()

    def get_by_user_id(self, db: Session, user_id: int) -> Optional[models.Student]:
        return db.query(models.Student).filter(models.Student.user_id == user_id).first()

    def get_all(self, db: Session, skip: int = 0, limit: int = 100) -> List[models.Student]:
        return db.query(models.Student).offset(skip).limit(limit).all()

    def create(self, db: Session, obj_in: schemas.StudentCreate) -> models.Student:
        db_obj = models.Student(**obj_in.dict())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, db_obj: models.Student, obj_in: dict) -> models.Student:
        for field, value in obj_in.items():
            if hasattr(db_obj, field) and value is not None:
                setattr(db_obj, field, value)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, id: int) -> bool:
        obj = db.query(models.Student).filter(models.Student.id == id).first()
        if obj:
            db.delete(obj)
            db.commit()
            return True
        return False

    def search(self, db: Session, query: str, skip: int = 0, limit: int = 100) -> List[models.Student]:
        return db.query(models.Student).filter(
            models.Student.roll_number.ilike(f"%{query}%")
        ).offset(skip).limit(limit).all()