from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy import or_
from .. import models, schemas

class UserCRUD:
    def get_by_email(self, db: Session, email: str) -> Optional[models.User]:
        return db.query(models.User).filter(models.User.email == email).first()

    def get_by_id(self, db: Session, id: int) -> Optional[models.User]:
        return db.query(models.User).filter(models.User.id == id).first()

    def get_all(self, db: Session, skip: int = 0, limit: int = 100) -> List[models.User]:
        return db.query(models.User).offset(skip).limit(limit).all()

    def create(self, db: Session, obj_in: schemas.UserCreate) -> models.User:
        from ..core.security import get_password_hash
        obj_data = obj_in.dict()
        obj_data["hashed_password"] = get_password_hash(obj_data.pop("password"))
        db_obj = models.User(**obj_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, db_obj: models.User, obj_in: dict) -> models.User:
        if "password" in obj_in and obj_in["password"]:
            from ..core.security import get_password_hash
            obj_in["hashed_password"] = get_password_hash(obj_in.pop("password"))
        for field, value in obj_in.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, id: int) -> bool:
        obj = db.query(models.User).filter(models.User.id == id).first()
        if obj:
            db.delete(obj)
            db.commit()
            return True
        return False

    def search(self, db: Session, query: str, skip: int = 0, limit: int = 100) -> List[models.User]:
        return db.query(models.User).filter(
            or_(
                models.User.full_name.ilike(f"%{query}%"),
                models.User.email.ilike(f"%{query}%"),
                models.User.student_id.ilike(f"%{query}%")
            )
        ).offset(skip).limit(limit).all()

    def search_admin_users(self, db: Session, query: str, skip: int = 0, limit: int = 100) -> List:
        from sqlalchemy.orm import joinedload
        return db.query(models.User).options(
            joinedload(models.User.department),
            joinedload(models.User.student_profile),
            joinedload(models.User.staff_profile),
            joinedload(models.User.admin_profile),
        ).outerjoin(models.Student, models.Student.user_id == models.User.id).outerjoin(
            models.Staff, models.Staff.user_id == models.User.id
        ).outerjoin(
            models.Admin, models.Admin.user_id == models.User.id
        ).filter(
            or_(
                models.User.full_name.ilike(f"%{query}%"),
                models.User.email.ilike(f"%{query}%"),
                models.Student.roll_number.ilike(f"%{query}%"),
                models.Staff.staff_id.ilike(f"%{query}%"),
                models.Admin.employee_id.ilike(f"%{query}%"),
            )
        ).offset(skip).limit(limit).all()