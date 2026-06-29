from pydantic import BaseModel, EmailStr, HttpUrl, field_validator
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
import re

class Role(str, Enum):
    STUDENT = "student"
    STAFF = "staff"
    ADMIN = "admin"

class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "student"
    student_id: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    photo: Optional[str] = None
    department_id: Optional[int] = None
    is_active: bool = True

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if v is not None and v and not re.match(r'^\+?1?\d{9,15}$', v):
            raise ValueError('Invalid phone number format')
        return v

    @field_validator('student_id', 'phone', 'address', 'photo', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if v == '':
            return None
        return v

class UserCreate(UserBase):
    password: str

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')
        return v

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    student_id: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    photo: Optional[str] = None
    department_id: Optional[int] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AdminUserCreate(BaseModel):
    user: Dict[str, Any]
    register_number: Optional[str] = None
    employee_id: Optional[str] = None
    admission_date: Optional[str] = None
    hire_date: Optional[str] = None
    current_semester: Optional[int] = None
    department_id: Optional[int] = None
    is_active: bool = True

class AdminUserUpdate(BaseModel):
    user: Optional[Dict[str, Any]] = None
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    department_id: Optional[int] = None
    is_active: Optional[bool] = None
    register_number: Optional[str] = None
    employee_id: Optional[str] = None
    current_semester: Optional[int] = None
    quota: Optional[str] = None
    transport_route: Optional[str] = None
    transport_fee: Optional[float] = None

class AdminUserResponse(BaseModel):
    id: int
    user_id: int
    full_name: str
    email: str
    role: str
    phone: Optional[str] = None
    department: Optional[str] = None
    department_id: Optional[int] = None
    status: str
    register_number: Optional[str] = None
    employee_id: Optional[str] = None
    current_semester: Optional[int] = None
    quota: Optional[str] = None
    transport_route: Optional[str] = None
    transport_fee: float = 0.0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True

class ResetPasswordRequest(BaseModel):
    new_password: str

    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')
        return v

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    sub: Optional[str] = None

class LoginData(BaseModel):
    email: EmailStr
    password: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str
