from sqlalchemy.orm import Session
from typing import List, Optional
from .. import models, schemas

class DepartmentCRUD:
    def get_by_id(self, db: Session, id: int) -> Optional[models.Department]:
        return db.query(models.Department).filter(models.Department.id == id).first()

    def get_all(self, db: Session, skip: int = 0, limit: int = 100) -> List[models.Department]:
        return db.query(models.Department).offset(skip).limit(limit).all()

    def create(self, db: Session, obj_in: schemas.DepartmentCreate) -> models.Department:
        db_obj = models.Department(**obj_in.dict())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, db_obj: models.Department, obj_in: dict) -> models.Department:
        for field, value in obj_in.items():
            if hasattr(db_obj, field) and value is not None:
                setattr(db_obj, field, value)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, id: int) -> bool:
        obj = db.query(models.Department).filter(models.Department.id == id).first()
        if obj:
            db.delete(obj)
            db.commit()
            return True
        return False