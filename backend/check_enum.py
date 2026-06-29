from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text("SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'userrole')"))
    labels = [row[0] for row in result.fetchall()]
    print("Enum labels in DB:", labels)
