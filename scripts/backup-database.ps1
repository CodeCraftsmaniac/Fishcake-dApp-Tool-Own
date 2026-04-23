# Fishcake Database Backup Script (PowerShell)
# Run this script daily via Task Scheduler to backup the SQLite database

param(
    [string]$BackupDir = ".\backups",
    [string]$DbPath = ".\backend\data\mining.db",
    [int]$RetentionDays = 30
)

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $BackupDir "mining_backup_$timestamp.db"

Write-Host "Starting Fishcake database backup..."

# Create backup directory if it doesn't exist
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

# Check if database exists
if (-not (Test-Path $DbPath)) {
    Write-Host "Warning: Database not found at $DbPath"
    exit 0
}

# Perform backup using SQLite
sqlite3 "$DbPath" ".backup '$backupFile'"

# Verify backup
if (Test-Path $backupFile) {
    Write-Host "Backup completed: $backupFile"
    (Get-Item $backupFile).Length
} else {
    Write-Host "Backup failed!"
    exit 1
}

# Clean up old backups
$cutoff = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupDir -Filter "mining_backup_*.db" | Where-Object { $_.LastWriteTime -lt $cutoff } | Remove-Item -Force
Write-Host "Cleaned up backups older than $RetentionDays days"

Write-Host "Backup process completed successfully!"
