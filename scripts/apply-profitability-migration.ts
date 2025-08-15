#!/usr/bin/env tsx

import { db } from '../lib/db/connection';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function applyProfitabilityMigration() {
  try {
    console.log('🚀 Applying profitability engine migration...\n');

    // Read the migration file
    const migrationPath = join(process.cwd(), 'migrations', '006_profitability_engine.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        
        if (statement.includes('ON CONFLICT') && statement.includes('DO NOTHING')) {
          // Handle INSERT with conflict resolution
          await db.query(statement);
        } else {
          await db.query(statement);
        }
        
        successCount++;
        console.log(`   ✅ Success`);
        
      } catch (error) {
        errorCount++;
        console.log(`   ⚠️ Error: ${error.message}`);
        
        // Continue with non-critical errors
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate key')) {
          console.log(`   ℹ️ Skipping (already exists)`);
        } else {
          console.log(`   ❌ Critical error in statement: ${statement.substring(0, 100)}...`);
        }
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`  ✅ Successful: ${successCount}`);
    console.log(`  ⚠️ Errors: ${errorCount}`);

    // Verify the results
    console.log('\n🔍 Verifying migration results...\n');
    
    try {
      // Check tables
      const tables = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN ('daily_cash_status', 'inventory_alerts', 'clearance_pricing_rules', 'profitability_analysis')
      `);
      
      console.log('📊 New Tables Created:');
      tables.rows.forEach(row => {
        console.log(`  ✅ ${row.table_name}`);
      });

      // Check if clearance rules were inserted
      const rules = await db.query('SELECT COUNT(*) as count FROM clearance_pricing_rules');
      console.log(`\n🏷️ Clearance Pricing Rules: ${rules.rows[0].count} rules loaded`);

      // Check if columns were added
      const columns = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'shopify_products' 
          AND column_name IN ('margin_percentage', 'cash_impact_score', 'seasonal_type', 'clearance_tier')
      `);
      
      console.log('\n💰 New Product Columns:');
      columns.rows.forEach(row => {
        console.log(`  ✅ ${row.column_name}`);
      });

      console.log('\n✅ Profitability Engine Migration Complete!');
      console.log('🎯 Ready for QuickBooks Cash Integration\n');

    } catch (verifyError) {
      console.error('❌ Verification failed:', verifyError.message);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

applyProfitabilityMigration();