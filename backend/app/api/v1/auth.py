from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from ...database import SessionLocal
from ...models import User, LoginHistory, AuditLog
from ...schemas import LoginData, Token, RefreshTokenRequest
from ...services.auth_service import AuthService
from ...core.security import verify_password, get_password_hash, create_access_token, create_refresh_token
from ...core.config import settings
import os

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/login", response_model=Token)
async def login(login_data: LoginData, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    user = auth_service.authenticate_user(login_data.email, login_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    tokens = auth_service.create_tokens(user)
    auth_service.log_login(user.id, "127.0.0.1", "login")
    auth_service.log_audit(user.id, "LOGIN", "User logged in successfully")
    
    return tokens

@router.post("/refresh", response_model=Token)
async def refresh_token(refresh_request: RefreshTokenRequest, db: Session = Depends(get_db)):
    from ...core.security import verify_token
    token_data = verify_token(refresh_request.refresh_token)
    
    if token_data is None or token_data.sub is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    
    user = db.query(User).filter(User.email == token_data.sub).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user",
        )
    
    auth_service = AuthService(db)
    tokens = auth_service.create_tokens(user)
    
    return tokens

@router.post("/logout")
async def logout():
    return {"message": "Successfully logged out"}