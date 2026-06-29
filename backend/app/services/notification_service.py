from sqlalchemy.orm import Session
from typing import List, Optional
from ..models import Notification
from ..schemas import NotificationCreate, NotificationUpdate

class NotificationService:
    def __init__(self, db: Session):
        self.db = db

    def create_notification(self, notification_in: Optional[NotificationCreate] = None, **kwargs) -> Notification:
        if notification_in is not None:
            data = notification_in.dict()
        else:
            data = kwargs
        db_notification = Notification(**data)
        self.db.add(db_notification)
        self.db.commit()
        self.db.refresh(db_notification)
        return db_notification

    def get_notifications_by_user(self, user_id: int, skip: int = 0, limit: int = 50, category: Optional[str] = None, include_archived: bool = False) -> List[Notification]:
        query = self.db.query(Notification).filter(Notification.user_id == user_id)
        if category:
            query = query.filter(Notification.category == category)
        if not include_archived:
            query = query.filter(Notification.is_archived == False)
        return query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()

    def get_unread_count(self, user_id: int, category: Optional[str] = None) -> int:
        query = self.db.query(Notification).filter(Notification.user_id == user_id, Notification.is_read == False, Notification.is_archived == False)
        if category:
            query = query.filter(Notification.category == category)
        return query.count()

    def get_unread_counts_by_category(self, user_id: int) -> dict:
        from sqlalchemy import func
        categories = ["payment", "document", "academic", "system"]
        result = {"total": 0}
        
        # Single query to get all counts at once
        counts = self.db.query(
            Notification.category,
            func.count(Notification.id).label('count')
        ).filter(
            Notification.user_id == user_id,
            Notification.is_read == False,
            Notification.is_archived == False,
            Notification.category.in_(categories)
        ).group_by(Notification.category).all()
        
        count_dict = {cat: 0 for cat in categories}
        for cat, count in counts:
            count_dict[cat] = count
            result["total"] += count
        
        result.update(count_dict)
        return result

    def mark_as_read(self, notification_id: int, user_id: int) -> Optional[Notification]:
        notification = self.db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user_id).first()
        if notification:
            notification.is_read = True
            self.db.commit()
            self.db.refresh(notification)
        return notification

    def mark_all_as_read(self, user_id: int, category: Optional[str] = None):
        query = self.db.query(Notification).filter(Notification.user_id == user_id, Notification.is_read == False, Notification.is_archived == False)
        if category:
            query = query.filter(Notification.category == category)
        query.update({"is_read": True})
        self.db.commit()

    def archive_notification(self, notification_id: int, user_id: int) -> Optional[Notification]:
        notification = self.db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user_id).first()
        if notification:
            notification.is_archived = True
            notification.is_read = True
            self.db.commit()
            self.db.refresh(notification)
        return notification

    def delete_notification(self, notification_id: int, user_id: int) -> bool:
        notification = self.db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user_id).first()
        if notification:
            self.db.delete(notification)
            self.db.commit()
            return True
        return False

    def delete_all_archived(self, user_id: int) -> int:
        count = self.db.query(Notification).filter(Notification.user_id == user_id, Notification.is_archived == True).count()
        self.db.query(Notification).filter(Notification.user_id == user_id, Notification.is_archived == True).delete()
        self.db.commit()
        return count

    def notify_staff_and_admin(self, title: str, message: str, category: str = "general"):
        from ..models import User
        from ..models.user import UserRole
        # Query all users with role staff or admin
        staff_users = self.db.query(User).filter(User.role.in_([UserRole.STAFF, UserRole.ADMIN])).all()
        for u in staff_users:
            notification = Notification(
                user_id=u.id,
                title=title,
                message=message,
                category=category,
                recipient_type="staff"
            )
            self.db.add(notification)
        self.db.commit()