#!/bin/bash
# Fishcake Database Backup Script
# Run this script daily via cron to backup the SQLite database

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_PATH="${DB_PATH:-./backend/data/mining.db}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/mining_backup_$TIMESTAMP.db"

echo "Starting Fishcake database backup..."

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "Warning: Database not found at $DB_PATH"
    exit 0
fi

# Perform backup using SQLite backup command
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

# Verify backup
if [ -f "$BACKUP_FILE" ]; then
    echo "Backup completed: $BACKUP_FILE"
    ls -lh "$BACKUP_FILE"
else
    echo "Backup failed!"
    exit 1
fi

# Clean up old backups
find "$BACKUP_DIR" -name "mining_backup_*.db" -mtime +$RETENTION_DAYS -delete
echo "Cleaned up backups older than $RETENTION_DAYS days"

# Optional: Sync to remote storage (S3, etc.)
# aws s3 cp "$BACKUP_FILE" s3://your-bucket/fishcake-backups/

echo "Backup process completed successfully!"
