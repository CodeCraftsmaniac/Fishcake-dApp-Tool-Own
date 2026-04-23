/**
 * Database Migration Script
 * Run this once to set up Supabase tables
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  const client = new pg.Client({
    connectionString: 'postgresql://postgres:HP2K9IFrOajXveGU@db.znatmrnkfjptiensiybb.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    logger.info('✅ Connected to Supabase PostgreSQL');
    
    const sqlPath = path.join(__dirname, 'migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    // Split by semicolons and execute each statement
    const statements = sql
      .split(/;(?=(?:[^']*'[^']*')*[^']*$)/) // Split on semicolons not inside quotes
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    logger.info(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    let success = 0;
    let skipped = 0;
    let errors = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt) {
        try {
          await client.query(stmt);
          success++;
          // Only log table/index creation
          if (stmt.toLowerCase().includes('create table')) {
            const match = stmt.match(/create table if not exists (\w+)/i);
            logger.info(`✓ Created table: ${match?.[1] || 'unknown'}`);
          } else if (stmt.toLowerCase().includes('create index')) {
            const match = stmt.match(/create index if not exists (\w+)/i);
            logger.info(`✓ Created index: ${match?.[1] || 'unknown'}`);
          }
        } catch (err: unknown) {
          const error = err as { message?: string };
          if (error.message?.includes('already exists')) {
            skipped++;
          } else if (error.message?.includes('duplicate key')) {
            skipped++;
          } else {
            errors++;
            logger.info(`✗ Error: ${error.message}`);
          }
        }
      }
    }
    
    logger.info(`\n📊 Migration Summary:`);
    logger.info(`   ✓ Success: ${success}`);
    logger.info(`   ○ Skipped: ${skipped}`);
    logger.info(`   ✗ Errors: ${errors}`);
    logger.info('\n✅ Migration complete!');
    
  } catch (err: unknown) {
    const error = err as { message?: string };
    logger.error('Connection error:', { error: error.message });
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
