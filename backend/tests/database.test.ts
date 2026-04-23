import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * Database operations test - verifies schema, CRUD, and transactions
 * Uses a temporary test database to avoid affecting production data
 */

const TEST_DB_PATH = path.join(process.cwd(), 'data', 'test-mining.db');

let db: Database.Database;

beforeAll(() => {
  const dataDir = path.dirname(TEST_DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  db = new Database(TEST_DB_PATH);
  db.pragma('journal_mode = WAL');
});

afterAll(() => {
  try {
    db.close();
    fs.unlinkSync(TEST_DB_PATH);
    const walPath = TEST_DB_PATH + '-wal';
    const shmPath = TEST_DB_PATH + '-shm';
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  } catch {}
});

describe('Database Schema', () => {
  it('should create all tables without error', () => {
    expect(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS mining_wallets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          address TEXT NOT NULL UNIQUE,
          encrypted_key TEXT NOT NULL,
          salt TEXT NOT NULL,
          iv TEXT NOT NULL,
          auth_tag TEXT NOT NULL,
          status TEXT DEFAULT 'active',
          fcc_balance TEXT DEFAULT '0',
          created_at INTEGER DEFAULT (unixepoch()),
          updated_at INTEGER DEFAULT (unixepoch())
        )
      `);
      db.exec(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          token_hash TEXT NOT NULL UNIQUE,
          user_id TEXT NOT NULL,
          session_id TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          created_at INTEGER DEFAULT (unixepoch())
        )
      `);
      db.exec(`
        CREATE TABLE IF NOT EXISTS pending_nonces (
          address TEXT PRIMARY KEY,
          nonce INTEGER NOT NULL,
          pending_count INTEGER NOT NULL DEFAULT 1,
          last_updated INTEGER NOT NULL
        )
      `);
    }).not.toThrow();
  });
});

describe('Wallet CRUD', () => {
  it('should insert and retrieve a wallet', () => {
    const insert = db.prepare(`
      INSERT INTO mining_wallets (address, encrypted_key, salt, iv, auth_tag)
      VALUES (?, ?, ?, ?, ?)
    `);
    insert.run('0xtest123', 'enc_key', 'salt_val', 'iv_val', 'tag_val');

    const row = db.prepare('SELECT * FROM mining_wallets WHERE address = ?').get('0xtest123') as any;
    expect(row).toBeDefined();
    expect(row.address).toBe('0xtest123');
    expect(row.status).toBe('active');
  });

  it('should enforce unique address constraint', () => {
    const insert = db.prepare(`
      INSERT INTO mining_wallets (address, encrypted_key, salt, iv, auth_tag)
      VALUES (?, ?, ?, ?, ?)
    `);
    expect(() => {
      insert.run('0xtest123', 'enc2', 'salt2', 'iv2', 'tag2');
    }).toThrow();
  });

  it('should update wallet status', () => {
    db.prepare("UPDATE mining_wallets SET status = 'paused' WHERE address = ?").run('0xtest123');
    const row = db.prepare('SELECT status FROM mining_wallets WHERE address = ?').get('0xtest123') as any;
    expect(row.status).toBe('paused');
  });

  it('should delete a wallet', () => {
    db.prepare('DELETE FROM mining_wallets WHERE address = ?').run('0xtest123');
    const row = db.prepare('SELECT * FROM mining_wallets WHERE address = ?').get('0xtest123');
    expect(row).toBeUndefined();
  });
});

describe('Refresh Token CRUD', () => {
  it('should store and retrieve a refresh token', () => {
    const store = db.prepare(`
      INSERT INTO refresh_tokens (token_hash, user_id, session_id, expires_at)
      VALUES (?, ?, ?, ?)
    `);
    store.run('hash123', 'user1', 'session1', Math.floor(Date.now() / 1000) + 3600);

    const row = db.prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?').get('hash123') as any;
    expect(row).toBeDefined();
    expect(row.user_id).toBe('user1');
  });

  it('should delete a refresh token by hash', () => {
    db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run('hash123');
    const row = db.prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?').get('hash123');
    expect(row).toBeUndefined();
  });

  it('should delete all tokens for a user', () => {
    const store = db.prepare(`
      INSERT INTO refresh_tokens (token_hash, user_id, session_id, expires_at)
      VALUES (?, ?, ?, ?)
    `);
    store.run('hash1', 'user2', 's1', Math.floor(Date.now() / 1000) + 3600);
    store.run('hash2', 'user2', 's2', Math.floor(Date.now() / 1000) + 3600);

    const result = db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run('user2');
    expect(result.changes).toBe(2);
  });

  it('should cleanup expired tokens', () => {
    const store = db.prepare(`
      INSERT INTO refresh_tokens (token_hash, user_id, session_id, expires_at)
      VALUES (?, ?, ?, ?)
    `);
    // Store an expired token
    store.run('expired_hash', 'user3', 's3', Math.floor(Date.now() / 1000) - 100);

    const result = db.prepare('DELETE FROM refresh_tokens WHERE expires_at < unixepoch()').run();
    expect(result.changes).toBeGreaterThanOrEqual(1);
  });
});

describe('Pending Nonce CRUD', () => {
  it('should upsert and retrieve a nonce', () => {
    const upsert = db.prepare(`
      INSERT INTO pending_nonces (address, nonce, pending_count, last_updated)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(address) DO UPDATE SET
        nonce = excluded.nonce,
        pending_count = excluded.pending_count,
        last_updated = excluded.last_updated
    `);
    upsert.run('0xaddr1', 5, 1, Date.now());

    const row = db.prepare('SELECT * FROM pending_nonces WHERE address = ?').get('0xaddr1') as any;
    expect(row).toBeDefined();
    expect(row.nonce).toBe(5);
  });

  it('should update nonce on upsert', () => {
    const upsert = db.prepare(`
      INSERT INTO pending_nonces (address, nonce, pending_count, last_updated)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(address) DO UPDATE SET
        nonce = excluded.nonce,
        pending_count = excluded.pending_count,
        last_updated = excluded.last_updated
    `);
    upsert.run('0xaddr1', 6, 2, Date.now());

    const row = db.prepare('SELECT * FROM pending_nonces WHERE address = ?').get('0xaddr1') as any;
    expect(row.nonce).toBe(6);
    expect(row.pending_count).toBe(2);
  });

  it('should delete a nonce', () => {
    db.prepare('DELETE FROM pending_nonces WHERE address = ?').run('0xaddr1');
    const row = db.prepare('SELECT * FROM pending_nonces WHERE address = ?').get('0xaddr1');
    expect(row).toBeUndefined();
  });
});

describe('Transactions', () => {
  it('should rollback on error', () => {
    const insert = db.prepare(`
      INSERT INTO mining_wallets (address, encrypted_key, salt, iv, auth_tag)
      VALUES (?, ?, ?, ?, ?)
    `);

    const tx = db.transaction(() => {
      insert.run('0xtxtest', 'enc', 'salt', 'iv', 'tag');
      // Force error: duplicate address
      insert.run('0xtxtest', 'enc2', 'salt2', 'iv2', 'tag2');
    });

    expect(() => tx()).toThrow();

    // First insert should also be rolled back
    const row = db.prepare('SELECT * FROM mining_wallets WHERE address = ?').get('0xtxtest');
    expect(row).toBeUndefined();
  });
});
