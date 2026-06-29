from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from ..models import User, LoginHistory, AuditLog
from ..schemas import Token, LoginData
from ..core.security import verify_password, get_password_hash, create_access_token, create_refresh_token
from ..core.config import settings

class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        user = self.db.query(User).filter(User.email == email).first()
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    def create_tokens(self, user: User) -> Token:
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        refresh_token = create_refresh_token(data={"sub": user.email})
        return Token(access_token=access_token, refresh_token=refresh_token)

    def log_login(self, user_id: int, ip_address: str, user_agent: str):
        login_history = LoginHistory(
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent
        )
        self.db.add(login_history)
        self.db.commit()

    def log_audit(self, user_id: int, action: str, details: str):
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            details=details
        )
        self.db.add(audit_log)
        self.db.commit()