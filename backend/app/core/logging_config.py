import logging
import logging.handlers
import os
import json
from datetime import datetime

LOG_DIR = os.getenv("LOG_DIR", "logs")
os.makedirs(LOG_DIR, exist_ok=True)

class JsonFormatter(logging.Formatter):
    """Structured JSON log formatter for machine-readable logs."""
    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_obj)


def _rotating_file_handler(filename: str, level: int = logging.DEBUG) -> logging.handlers.RotatingFileHandler:
    handler = logging.handlers.RotatingFileHandler(
        os.path.join(LOG_DIR, filename),
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=5,
        encoding="utf-8",
    )
    handler.setLevel(level)
    handler.setFormatter(JsonFormatter())
    return handler


def setup_logging() -> None:
    """Configure structured, rotating log files for all application layers."""

    # ── Root logger (all messages go to app.log + console) ──────────────────
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # Console handler for Docker stdout
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(
        logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    )

    root_logger.addHandler(console_handler)
    root_logger.addHandler(_rotating_file_handler("app.log", logging.INFO))

    # ── Error log (WARNING and above only) ───────────────────────────────────
    error_handler = _rotating_file_handler("error.log", logging.WARNING)
    root_logger.addHandler(error_handler)

    # ── Payment logger ───────────────────────────────────────────────────────
    payment_logger = logging.getLogger("payments")
    payment_logger.setLevel(logging.INFO)
    payment_logger.addHandler(_rotating_file_handler("payments.log"))
    payment_logger.propagate = False

    # ── Audit logger ─────────────────────────────────────────────────────────
    audit_logger = logging.getLogger("audit")
    audit_logger.setLevel(logging.INFO)
    audit_logger.addHandler(_rotating_file_handler("audit.log"))
    audit_logger.propagate = False

    # ── Security logger ──────────────────────────────────────────────────────
    security_logger = logging.getLogger("security")
    security_logger.setLevel(logging.WARNING)
    security_logger.addHandler(_rotating_file_handler("security.log"))
    security_logger.propagate = False

    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
