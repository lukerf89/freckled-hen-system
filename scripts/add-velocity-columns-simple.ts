#!/usr/bin/env tsx

import { db } from '../lib/db/connection';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function addVelocityColumns() {
  try {
    console.log('🗄️ Adding Sales Velocity Columns...\n');
    
    // Add velocity tracking columns one by one
    const columns = [
      { name: 'weekly_sales_units', type: 'DECIMAL(10,2) DEFAULT 0' },
      { name: 'weekly_sales_revenue', type: 'DECIMAL(10,2) DEFAULT 0' },
      { name: 'velocity_category', type: 'VARCHAR(20) DEFAULT \'unknown\'' },
      { name: 'weeks_of_stock', type: 'DECIMAL(10,1) DEFAULT 0' },
      { name: 'reorder_urgency', type: 'VARCHAR(20) DEFAULT \'low\'' },
      { name: 'price_elasticity_score', type: 'INTEGER DEFAULT 50' },
      { name: 'last_sale_date', type: 'DATE' },
      { name: 'trend_direction', type: 'VARCHAR(20) DEFAULT \'stable\'' }
    ];
    
    for (const column of columns) {
      try {
        console.log(`Adding column: ${column.name}...`);
        await db.query(`
          ALTER TABLE shopify_variants 
          ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}
        `);
        console.log(`   ✅ Added ${column.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`   ℹ️ Column ${column.name} already exists`);
        } else {
          console.log(`   ⚠️ Error adding ${column.name}: ${error.message}`);
        }
      }
    }
    
    // Add indexes
    try {
      console.log('\nAdding velocity indexes...');
      
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_variants_velocity 
        ON shopify_variants(velocity_category, reorder_urgency)
      `);
      console.log('   ✅ Added velocity category index');
      
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_variants_weeks_stock 
        ON shopify_variants(weeks_of_stock) 
        WHERE weeks_of_stock <= 12
      `);
      console.log('   ✅ Added weeks of stock index');
      
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_variants_last_sale 
        ON shopify_variants(last_sale_date) 
        WHERE last_sale_date IS NOT NULL
      `);
      console.log('   ✅ Added last sale date index');
      
    } catch (indexError) {
      console.log(`   ⚠️ Index creation warning: ${indexError.message}`);
    }
    
    // Test the columns
    console.log('\nTesting velocity columns...');
    const testResult = await db.query(`
      SELECT 
        weekly_sales_units, velocity_category, weeks_of_stock, 
        reorder_urgency, price_elasticity_score, trend_direction
      FROM shopify_variants 
      LIMIT 1
    `);
    
    if (testResult.rows.length > 0) {
      console.log('✅ All velocity columns are working correctly!');
      console.log('   Sample row:', testResult.rows[0]);
    }
    
    console.log('\n✅ Sales Velocity Columns Added Successfully!');
    console.log('🚀 Ready to calculate velocity for all variants');
    
  } catch (error) {
    console.error('❌ Failed to add velocity columns:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

addVelocityColumns();