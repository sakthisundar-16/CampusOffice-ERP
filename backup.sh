#!/bin/bash
# ─────────────────────────────────────────────────────────────
# CampusOffice ERP — PostgreSQL Backup & Restore Script
# ─────────────────────────────────────────────────────────────
# Usage:
#   Backup:  ./backup.sh backup
#   Restore: ./backup.sh restore backups/erpdb_2024-01-01_120000.sql.gz
# ─────────────────────────────────────────────────────────────

set -e

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-erpdb}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

case "$1" in
  backup)
    echo "[INFO] Starting backup of ${DB_NAME} at ${TIMESTAMP}..."
    PGPASSWORD="${DB_PASSWORD}" pg_dump \
      -h "$DB_HOST" \
      -p "$DB_PORT" \
      -U "$DB_USER" \
      -F c \
      "$DB_NAME" | gzip > "$BACKUP_FILE"
    echo "[SUCCESS] Backup saved to: $BACKUP_FILE"
    # Retain only last 7 backups
    ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm --
    echo "[INFO] Old backups pruned (retaining last 7)."
    ;;

  restore)
    RESTORE_FILE="$2"
    if [ -z "$RESTORE_FILE" ]; then
      echo "[ERROR] Please provide a backup file to restore."
      echo "Usage: $0 restore backups/erpdb_2024-01-01_120000.sql.gz"
      exit 1
    fi
    echo "[WARNING] This will DROP and recreate the database '${DB_NAME}'."
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
      echo "[ABORTED]"
      exit 0
    fi
    echo "[INFO] Restoring from: $RESTORE_FILE"
    PGPASSWORD="${DB_PASSWORD}" dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" --if-exists "$DB_NAME"
    PGPASSWORD="${DB_PASSWORD}" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
    gunzip -c "$RESTORE_FILE" | PGPASSWORD="${DB_PASSWORD}" pg_restore \
      -h "$DB_HOST" \
      -p "$DB_PORT" \
      -U "$DB_USER" \
      -d "$DB_NAME" \
      --no-owner \
      --role="$DB_USER"
    echo "[SUCCESS] Database restored successfully."
    ;;

  *)
    echo "Usage: $0 {backup|restore <file>}"
    exit 1
    ;;
esac
