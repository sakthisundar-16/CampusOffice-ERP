from sqlalchemy import Column, Integer, String, ForeignKey, Table
from .base import Base

admin_staff_assignments = Table(
    "admin_staff_assignments",
    Base.metadata,
    Column("admin_id", Integer, ForeignKey("admins.id"), primary_key=True),
    Column("staff_id", Integer, ForeignKey("staff.id"), primary_key=True),
)

departments_overseen = Table(
    "departments_overseen",
    Base.metadata,
    Column("admin_id", Integer, ForeignKey("admins.id"), primary_key=True),
    Column("department_id", Integer, ForeignKey("departments.id"), primary_key=True),
)

payment_approvals = Table(
    "payment_approvals",
    Base.metadata,
    Column("staff_id", Integer, ForeignKey("staff.id"), primary_key=True),
    Column("payment_id", Integer, ForeignKey("payment_requests.id"), primary_key=True),
)
