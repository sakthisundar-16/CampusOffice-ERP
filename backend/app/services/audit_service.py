from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from ..models import AuditLog, User
from sqlalchemy import desc, and_, or_

class AuditService:
    def __init__(self, db: Session):
        self.db = db

    def log_action(
        self,
        user_id: Optional[int],
        action: str,
        details: Optional[str] = None,
        old_value: Optional[str] = None,
        new_value: Optional[str] = None,
        reference_number: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        """Create a comprehensive audit log entry"""
        # Combine old/new values into details if provided
        full_details = details or ""
        if old_value and new_value:
            full_details += f" | Changed from '{old_value}' to '{new_value}'"
        elif old_value:
            full_details += f" | Previous value: '{old_value}'"
        elif new_value:
            full_details += f" | New value: '{new_value}'"
        
        if reference_number:
            full_details += f" | Reference: {reference_number}"

        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            details=full_details.strip(),
            ip_address=ip_address,
            user_agent=user_agent
        )
        self.db.add(audit_log)
        self.db.commit()
        self.db.refresh(audit_log)
        return audit_log

    def get_audit_logs(
        self,
        skip: int = 0,
        limit: int = 50,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        reference_number: Optional[str] = None
    ) -> List[AuditLog]:
        """Retrieve audit logs with optional filters"""
        query = self.db.query(AuditLog).join(User, AuditLog.user_id == User.id, isouter=True)
        
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        if action:
            query = query.filter(AuditLog.action.ilike(f"%{action}%"))
        if date_from:
            query = query.filter(AuditLog.created_at >= date_from)
        if date_to:
            query = query.filter(AuditLog.created_at <= date_to)
        if reference_number:
            query = query.filter(AuditLog.details.ilike(f"%{reference_number}%"))
        
        return query.order_by(desc(AuditLog.created_at)).offset(skip).limit(limit).all()

    def get_audit_logs_by_user(
        self,
        user_id: int,
        skip: int = 0,
        limit: int = 50
    ) -> List[AuditLog]:
        """Get audit logs for a specific user"""
        return self.db.query(AuditLog).filter(
            AuditLog.user_id == user_id
        ).order_by(desc(AuditLog.created_at)).offset(skip).limit(limit).all()

    def get_recent_audit_logs(
        self,
        hours: int = 24,
        limit: int = 20
    ) -> List[AuditLog]:
        """Get audit logs from the last N hours"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        return self.db.query(AuditLog).join(User, AuditLog.user_id == User.id).filter(
            AuditLog.created_at >= cutoff_time
        ).order_by(desc(AuditLog.created_at)).limit(limit).all()

    def get_audit_summary(
        self,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get a summary of audit activities"""
        query = self.db.query(AuditLog)
        
        if date_from:
            query = query.filter(AuditLog.created_at >= date_from)
        if date_to:
            query = query.filter(AuditLog.created_at <= date_to)
        
        total_logs = query.count()
        
        # Count by action type
        action_counts = {}
        for log in query.all():
            action = log.action
            action_counts[action] = action_counts.get(action, 0) + 1
        
        # Count by user
        user_counts = {}
        for log in query.all():
            user_id = log.user_id
            user_counts[user_id] = user_counts.get(user_id, 0) + 1
        
        return {
            "total_logs": total_logs,
            "action_counts": action_counts,
            "user_counts": user_counts,
            "date_from": date_from.isoformat() if date_from else None,
            "date_to": date_to.isoformat() if date_to else None
        }

    def get_suspicious_activities(
        self,
        hours: int = 24,
        limit: int = 20
    ) -> List[AuditLog]:
        """Identify potentially suspicious activities"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        # Define suspicious action patterns
        suspicious_actions = [
            "LOGIN_FAILED",
            "UNAUTHORIZED_ACCESS",
            "PAYMENT_REJECTED",
            "DOCUMENT_REJECTED",
            "DELETED",
            "MODIFIED_ADMIN"
        ]
        
        return self.db.query(AuditLog).join(User, AuditLog.user_id == User.id).filter(
            and_(
                AuditLog.created_at >= cutoff_time,
                or_(*[AuditLog.action.ilike(f"%{action}%") for action in suspicious_actions])
            )
        ).order_by(desc(AuditLog.created_at)).limit(limit).all()

    def export_audit_logs(
        self,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        user_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Export audit logs for analysis"""
        query = self.db.query(AuditLog).join(User, AuditLog.user_id == User.id)
        
        if date_from:
            query = query.filter(AuditLog.created_at >= date_from)
        if date_to:
            query = query.filter(AuditLog.created_at <= date_to)
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        
        logs = query.order_by(desc(AuditLog.created_at)).all()
        
        return [
            {
                "id": log.id,
                "user_id": log.user_id,
                "user_name": log.user.full_name if log.user else "System",
                "user_email": log.user.email if log.user else None,
                "action": log.action,
                "details": log.details,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ]

    def cleanup_old_logs(self, days: int = 90) -> int:
        """Remove audit logs older than specified days"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        count = self.db.query(AuditLog).filter(
            AuditLog.created_at < cutoff_date
        ).count()
        
        self.db.query(AuditLog).filter(
            AuditLog.created_at < cutoff_date
        ).delete()
        
        self.db.commit()
        return count
