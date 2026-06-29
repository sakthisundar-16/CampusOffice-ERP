from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from ...database import SessionLocal
from ...models import User
from ...services.notification_service import NotificationService
from ...core.security import get_current_active_user
from ...dependencies.rbac import require_student, require_staff, require_admin

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/unread-count")
async def get_unread_count(
    category: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get unread notification count for the current user"""
    notification_service = NotificationService(db)
    count = notification_service.get_unread_count(current_user.id, category=category)
    return {"unread_count": count}

@router.get("/unread-counts")
async def get_unread_counts_by_category(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get unread notification counts by category"""
    notification_service = NotificationService(db)
    counts = notification_service.get_unread_counts_by_category(current_user.id)
    return counts

@router.get("/")
async def get_notifications(
    skip: int = 0,
    limit: int = 50,
    category: Optional[str] = None,
    include_archived: bool = False,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get notifications for the current user with optional filtering"""
    notification_service = NotificationService(db)
    notifications = notification_service.get_notifications_by_user(
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        category=category,
        include_archived=include_archived
    )
    
    return {
        "notifications": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "category": n.category,
                "is_read": n.is_read,
                "is_archived": n.is_archived,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in notifications
        ],
        "total": len(notifications),
        "skip": skip,
        "limit": limit
    }

@router.patch("/{notification_id}/read")
async def mark_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark a specific notification as read"""
    notification_service = NotificationService(db)
    notification = notification_service.mark_as_read(notification_id, current_user.id)
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    return {"success": True, "message": "Notification marked as read"}

@router.patch("/read-all")
async def mark_all_as_read(
    category: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read, optionally filtered by category"""
    notification_service = NotificationService(db)
    notification_service.mark_all_as_read(current_user.id, category=category)
    
    return {"success": True, "message": "All notifications marked as read"}

@router.patch("/{notification_id}/archive")
async def archive_notification(
    notification_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Archive a specific notification"""
    notification_service = NotificationService(db)
    notification = notification_service.archive_notification(notification_id, current_user.id)
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    return {"success": True, "message": "Notification archived"}

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a specific notification"""
    notification_service = NotificationService(db)
    deleted = notification_service.delete_notification(notification_id, current_user.id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    return {"success": True, "message": "Notification deleted"}

@router.delete("/archived")
async def delete_all_archived(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete all archived notifications for the current user"""
    notification_service = NotificationService(db)
    count = notification_service.delete_all_archived(current_user.id)
    
    return {
        "success": True,
        "message": f"Deleted {count} archived notifications",
        "deleted_count": count
    }
