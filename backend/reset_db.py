import urllib.parse
from sqlalchemy import create_engine, text

db_url = "postgresql://postgres:1234@localhost:5432/erpdb"
engine = create_engine(db_url)
with engine.connect() as conn:
    try:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.commit()
        print("Dropped public schema")
    except Exception as e:
        print(f"Drop schema error: {e}")
    try:
        conn.execute(text("CREATE SCHEMA public"))
        conn.commit()
        print("Recreated public schema")
    except Exception as e:
        print(f"Create schema error: {e}")

print("Database reset complete!")
