from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from ...database import SessionLocal
from ...models import User
from ...services.audit_service import AuditService
from ...core.security import get_current_active_user
from ...dependencies.rbac import require_admin

router = APIRouter(prefix="/api/v1/audit", tags=["audit"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/")
async def get_audit_logs(
    skip: int = 0,
    limit: int = 50,
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    reference_number: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get audit logs with optional filters"""
    audit_service = AuditService(db)
    
    from_date = None
    to_date = None
    if date_from:
        try:
            from_date = datetime.fromisoformat(date_from)
        except ValueError:
            pass
    if date_to:
        try:
            to_date = datetime.fromisoformat(date_to)
        except ValueError:
            pass
    
    logs = audit_service.get_audit_logs(
        skip=skip,
        limit=limit,
        user_id=user_id,
        action=action,
        date_from=from_date,
        date_to=to_date,
        reference_number=reference_number
    )
    
    return {
        "logs": [
            {
                "id": log.id,
                "user_id": log.user_id,
                "user_name": log.user.full_name if log.user else "System",
                "action": log.action,
                "details": log.details,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
        "total": len(logs),
        "skip": skip,
        "limit": limit
    }

@router.get("/recent")
async def get_recent_audit_logs(
    hours: int = 24,
    limit: int = 20,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get audit logs from the last N hours"""
    audit_service = AuditService(db)
    logs = audit_service.get_recent_audit_logs(hours=hours, limit=limit)
    
    return {
        "logs": [
            {
                "id": log.id,
                "user_id": log.user_id,
                "user_name": log.user.full_name if log.user else "System",
                "action": log.action,
                "details": log.details,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ]
    }

@router.get("/summary")
async def get_audit_summary(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get audit summary statistics"""
    audit_service = AuditService(db)
    
    from_date = None
    to_date = None
    if date_from:
        try:
            from_date = datetime.fromisoformat(date_from)
        except ValueError:
            pass
    if date_to:
        try:
            to_date = datetime.fromisoformat(date_to)
        except ValueError:
            pass
    
    summary = audit_service.get_audit_summary(date_from=from_date, date_to=to_date)
    return summary

@router.get("/suspicious")
async def get_suspicious_activities(
    hours: int = 24,
    limit: int = 20,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get potentially suspicious activities"""
    audit_service = AuditService(db)
    logs = audit_service.get_suspicious_activities(hours=hours, limit=limit)
    
    return {
        "logs": [
            {
                "id": log.id,
                "user_id": log.user_id,
                "user_name": log.user.full_name if log.user else "System",
                "action": log.action,
                "details": log.details,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ]
    }

@router.get("/export")
async def export_audit_logs(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    user_id: Optional[int] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Export audit logs for analysis"""
    audit_service = AuditService(db)
    
    from_date = None
    to_date = None
    if date_from:
        try:
            from_date = datetime.fromisoformat(date_from)
        except ValueError:
            pass
    if date_to:
        try:
            to_date = datetime.fromisoformat(date_to)
        except ValueError:
            pass
    
    logs = audit_service.export_audit_logs(
        date_from=from_date,
        date_to=to_date,
        user_id=user_id
    )
    
    return {"logs": logs, "total": len(logs)}
