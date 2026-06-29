from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    FRONTEND_URL: str
    UPLOAD_DIR: str = "uploads"
    PDF_STORAGE_PATH: str = "uploads/documents"
    DEBUG_MODE: bool = False

    class Config:
        env_file = ".env"

settings = Settings()