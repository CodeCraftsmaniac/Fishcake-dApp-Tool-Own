/**
 * Database Migration Script
 * Run this once to set up Supabase tables
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  const client = new pg.Client({
    connectionString: 'postgresql://postgres:HP2K9IFrOajXveGU@db.znatmrnkfjptiensiybb.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL');
    
    const sqlPath = path.join(__dirname, 'migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    // Split by semicolons and execute each statement
    const statements = sql
      .split(/;(?=(?:[^']*'[^']*')*[^']*$)/) // Split on semicolons not inside quotes
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
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
            console.log(`✓ Created table: ${match?.[1] || 'unknown'}`);
          } else if (stmt.toLowerCase().includes('create index')) {
            const match = stmt.match(/create index if not exists (\w+)/i);
            console.log(`✓ Created index: ${match?.[1] || 'unknown'}`);
          }
        } catch (err: unknown) {
          const error = err as { message?: string };
          if (error.message?.includes('already exists')) {
            skipped++;
          } else if (error.message?.includes('duplicate key')) {
            skipped++;
          } else {
            errors++;
            console.log(`✗ Error: ${error.message}`);
          }
        }
      }
    }
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✓ Success: ${success}`);
    console.log(`   ○ Skipped: ${skipped}`);
    console.log(`   ✗ Errors: ${errors}`);
    console.log('\n✅ Migration complete!');
    
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error('❌ Connection error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
