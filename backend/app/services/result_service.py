import csv
import io
import json
from datetime import datetime
from sqlalchemy.orm import Session
from typing import List, Optional
from ..models import Result, Notification, AuditLog, User
from ..schemas import ResultCreate, ResultUpdate
from ..core.redis_client import redis_client

class ResultService:
    def __init__(self, db: Session):
        self.db = db

    def create_result(self, result_in: ResultCreate, staff_id: int) -> Result:
        result_dict = result_in.dict()
        result_dict["published_at"] = datetime.utcnow()
        db_result = Result(**result_dict)
        self.db.add(db_result)
        self.db.commit()
        self.db.refresh(db_result)

        self._create_notification(result_in.user_id, "Result Published", f"Your result for {result_in.semester} has been published. GPA: {result_in.gpa}")
        self._create_audit_log(staff_id, "RESULT_CREATE", f"Result created for user {result_in.user_id}")

        self._invalidate_cache(result_in.user_id)

        return db_result

    def upload_csv(self, csv_content: str, staff_id: int) -> dict:
        results = []
        errors = []

        try:
            csv_file = io.StringIO(csv_content)
            reader = csv.DictReader(csv_file)

            required_columns = ["user_id", "semester", "gpa"]
            if not all(col in reader.fieldnames for col in required_columns):
                raise ValueError(f"CSV must contain columns: {', '.join(required_columns)}")

            for row_num, row in enumerate(reader, start=2):
                try:
                    user_id = int(row["user_id"])
                    existing_result = self.db.query(Result).filter(
                        Result.user_id == user_id,
                        Result.semester == row["semester"]
                    ).first()

                    if existing_result:
                        errors.append(f"Row {row_num}: Result already exists for user {user_id} in semester {row['semester']}")
                        continue

                    user = self.db.query(User).filter(User.id == user_id).first()
                    if not user:
                        errors.append(f"Row {row_num}: User {user_id} not found")
                        continue

                    gpa = float(row["gpa"])
                    if gpa < 0 or gpa > 10:
                        errors.append(f"Row {row_num}: Invalid GPA {gpa}")
                        continue

                    result = Result(
                        user_id=user_id,
                        semester=row["semester"],
                        gpa=gpa,
                        total_marks=float(row.get("total_marks", 0)) if row.get("total_marks") else None,
                        percentage=float(row.get("percentage", 0)) if row.get("percentage") else None,
                        grade=row.get("grade"),
                        pass_fail=row.get("pass_fail", "pass"),
                        details=row.get("details"),
                        published_at=datetime.utcnow()
                    )
                    self.db.add(result)
                    results.append(result)

                    self._create_notification(user_id, "Result Published", f"Your result for {row['semester']} has been published. GPA: {gpa}")

                except Exception as e:
                    errors.append(f"Row {row_num}: {str(e)}")

            self.db.commit()

            for result in results:
                self._invalidate_cache(result.user_id)

            self._create_audit_log(staff_id, "RESULT_CSV_UPLOAD", f"Uploaded {len(results)} results, {len(errors)} errors")

            return {"success": len(results), "errors": len(errors), "error_details": errors}

        except Exception as e:
            self.db.rollback()
            raise ValueError(f"CSV processing error: {str(e)}")

    def get_results_by_user(self, user_id: int, semester: Optional[str] = None) -> List[dict]:
        query = self.db.query(Result).filter(Result.user_id == user_id)
        if semester:
            query = query.filter(Result.semester == semester)
        results = query.order_by(Result.published_at.desc()).all()

        result_dicts = [{
            "id": r.id,
            "user_id": r.user_id,
            "semester": r.semester,
            "gpa": r.gpa,
            "total_marks": r.total_marks,
            "percentage": r.percentage,
            "grade": r.grade,
            "pass_fail": r.pass_fail,
            "details": r.details,
            "published_at": r.published_at.isoformat() if r.published_at else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        } for r in results]

        try:
            import asyncio
            loop = asyncio.get_event_loop()
            loop.run_until_complete(redis_client.setex(f"results:{user_id}", 3600, json.dumps(result_dicts)))
        except Exception:
            pass

        return result_dicts

    def get_all_results(self, search: Optional[str] = None, semester: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[dict]:
        from sqlalchemy.orm import joinedload
        query = self.db.query(Result).options(joinedload(Result.user))
        if semester:
            query = query.filter(Result.semester == semester)
        if search:
            query = query.join(User, Result.user_id == User.id).filter(
                User.full_name.ilike(f"%{search}%")
            )
        results = query.offset(skip).limit(limit).all()
        result_dicts = []
        for r in results:
            user = r.user
            result_dicts.append({
                "id": r.id,
                "user_id": r.user_id,
                "semester": r.semester,
                "gpa": r.gpa,
                "total_marks": r.total_marks,
                "percentage": r.percentage,
                "grade": r.grade,
                "pass_fail": r.pass_fail,
                "details": r.details,
                "published_at": r.published_at.isoformat() if r.published_at else None,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
                "user": {
                    "id": user.id,
                    "full_name": user.full_name,
                    "student_id": user.student_id,
                    "email": user.email,
                } if user else None,
            })
        return result_dicts

    def get_result_by_id(self, result_id: int) -> Optional[Result]:
        return self.db.query(Result).filter(Result.id == result_id).first()

    def update_result(self, result_id: int, result_in: ResultUpdate, staff_id: int) -> Optional[Result]:
        result = self.db.query(Result).filter(Result.id == result_id).first()
        if not result:
            return None

        update_data = result_in.dict(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                setattr(result, field, value)

        self.db.commit()
        self.db.refresh(result)

        self._invalidate_cache(result.user_id)
        self._create_audit_log(staff_id, "RESULT_UPDATE", f"Result {result_id} updated")

        return result

    def _invalidate_cache(self, user_id: int):
        try:
            import asyncio
            loop = asyncio.get_event_loop()
            loop.run_until_complete(redis_client.delete(f"results:{user_id}"))
        except Exception:
            pass

    def _create_notification(self, user_id: int, title: str, message: str):
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            recipient_type="student"
        )
        self.db.add(notification)
        self.db.commit()

    def _create_audit_log(self, user_id: int, action: str, details: str):
        audit_log = AuditLog(user_id=user_id, action=action, details=details)
        self.db.add(audit_log)
        self.db.commit()
