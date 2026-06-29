from sqlalchemy.orm import Session
from typing import List, Optional
from .. import models, schemas

class PaymentRequestCRUD:
    def get_by_id(self, db: Session, id: int) -> Optional[models.PaymentRequest]:
        return db.query(models.PaymentRequest).filter(models.PaymentRequest.id == id).first()

    def get_by_user_id(self, db: Session, user_id: int) -> List[models.PaymentRequest]:
        return db.query(models.PaymentRequest).filter(models.PaymentRequest.user_id == user_id).order_by(models.PaymentRequest.created_at.desc()).all()

    def get_all(self, db: Session, skip: int = 0, limit: int = 100) -> List[models.PaymentRequest]:
        return db.query(models.PaymentRequest).offset(skip).limit(limit).all()

    def create(self, db: Session, obj_in: schemas.PaymentRequestCreate) -> models.PaymentRequest:
        db_obj = models.PaymentRequest(**obj_in.dict())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, db_obj: models.PaymentRequest, obj_in: dict) -> models.PaymentRequest:
        for field, value in obj_in.items():
            if hasattr(db_obj, field) and value is not None:
                setattr(db_obj, field, value)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, id: int) -> bool:
        obj = db.query(models.PaymentRequest).filter(models.PaymentRequest.id == id).first()
        if obj:
            db.delete(obj)
            db.commit()
            return True
        return False