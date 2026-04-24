/**
 * SQLite Backup & Restore Script
 * 
 * Usage:
 *   Backup:  npx tsx scripts/backup-sqlite.ts
 *   Restore: npx tsx scripts/backup-sqlite.ts --restore <backup-file>
 *   List:    npx tsx scripts/backup-sqlite.ts --list
 */

import * as Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = path.resolve(__dirname, '../data/mining.db');
const BACKUP_DIR = path.resolve(__dirname, '../data/backups');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function backup() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Database not found at:', DB_PATH);
    process.exit(1);
  }

  ensureDir(BACKUP_DIR);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `mining-${timestamp}.db`);

  // Use SQLite backup API for consistent snapshot
  const db = new Database(DB_PATH);
  db.backup(backupPath)
    .then(() => {
      db.close();
      console.log(`✅ Backup created: ${backupPath}`);
      console.log(`   Size: ${(fs.statSync(backupPath).size / 1024).toFixed(1)} KB`);

      // Clean up old backups (keep last 7)
      const backups = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('mining-') && f.endsWith('.db'))
        .sort();
      if (backups.length > 7) {
        const toDelete = backups.slice(0, backups.length - 7);
        for (const f of toDelete) {
          fs.unlinkSync(path.join(BACKUP_DIR, f));
          console.log(`🗑️  Removed old backup: ${f}`);
        }
      }
    })
    .catch((err: Error) => {
      db.close();
      console.error('❌ Backup failed:', err.message);
      process.exit(1);
    });
}

function restore(backupFile: string) {
  const backupPath = path.isAbsolute(backupFile) 
    ? backupFile 
    : path.join(BACKUP_DIR, backupFile);

  if (!fs.existsSync(backupPath)) {
    console.error('❌ Backup file not found:', backupPath);
    process.exit(1);
  }

  // Backup current DB before overwriting
  if (fs.existsSync(DB_PATH)) {
    const preRestoreBackup = DB_PATH.replace('.db', `.pre-restore-${Date.now()}.db`);
    fs.copyFileSync(DB_PATH, preRestoreBackup);
    console.log(`✅ Pre-restore backup: ${preRestoreBackup}`);
  }

  fs.copyFileSync(backupPath, DB_PATH);
  console.log(`✅ Restored from: ${backupPath}`);

  // Verify
  const db = new Database(DB_PATH);
  const walletCount = (db.prepare('SELECT COUNT(*) as c FROM mining_wallets').get() as any).c;
  const eventCount = (db.prepare('SELECT COUNT(*) as c FROM mining_events').get() as any).c;
  db.close();
  console.log(`   Wallets: ${walletCount}, Events: ${eventCount}`);
}

function list() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('No backups found.');
    return;
  }
  const backups = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('mining-') && f.endsWith('.db'))
    .sort()
    .reverse();
  
  if (backups.length === 0) {
    console.log('No backups found.');
    return;
  }

  console.log('Available backups:');
  for (const f of backups) {
    const stat = fs.statSync(path.join(BACKUP_DIR, f));
    const size = (stat.size / 1024).toFixed(1);
    const date = stat.mtime.toISOString();
    console.log(`  ${f}  (${size} KB, ${date})`);
  }
}

// Parse args
const args = process.argv.slice(2);
if (args[0] === '--restore' && args[1]) {
  restore(args[1]);
} else if (args[0] === '--list') {
  list();
} else {
  backup();
}
