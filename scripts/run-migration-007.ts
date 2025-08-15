#!/usr/bin/env tsx

import { runMigrations } from '../lib/db/migrate';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function runMigration007() {
  try {
    console.log('🗄️ Running Migration 007: Sales Velocity Columns...\n');
    
    await runMigrations();
    
    console.log('\n✅ Migration 007 completed successfully!');
    console.log('🚀 Velocity tracking columns are now ready');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runMigration007();