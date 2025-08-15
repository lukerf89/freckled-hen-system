#!/usr/bin/env tsx

import { db } from '../lib/db/connection';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function addColumnsIndividually() {
  console.log('🔧 Adding profitability columns individually...\n');

  const productColumns = [
    'wholesale_cost DECIMAL(10,2)',
    'margin_percentage DECIMAL(5,2)',
    'cash_impact_score DECIMAL(8,2) DEFAULT 0',
    'q4_item BOOLEAN DEFAULT false',
    'seasonal_item BOOLEAN DEFAULT false',
    'traffic_driver BOOLEAN DEFAULT false',
    'clearance_candidate BOOLEAN DEFAULT false',
    'days_no_sales INTEGER DEFAULT 0',
    'weekly_revenue DECIMAL(10,2) DEFAULT 0',
    'last_sale_date TIMESTAMP',
    'sell_through_rate DECIMAL(5,2) DEFAULT 0',
    'seasonal_type VARCHAR(20)',
    'seasonal_end_date DATE',
    'clearance_tier VARCHAR(20)',
    'profit_protection_threshold DECIMAL(5,2)',
    'psychological_price_point DECIMAL(8,2)',
    'bundle_eligible BOOLEAN DEFAULT false'
  ];

  // Add columns to shopify_products
  console.log('📊 Adding columns to shopify_products...');
  for (const column of productColumns) {
    try {
      await db.query(`ALTER TABLE shopify_products ADD COLUMN IF NOT EXISTS ${column}`);
      console.log(`  ✅ ${column.split(' ')[0]}`);
    } catch (error) {
      console.log(`  ⚠️ ${column.split(' ')[0]}: ${error.message}`);
    }
  }

  // Add columns to shopify_variants
  console.log('\n📦 Adding columns to shopify_variants...');
  for (const column of productColumns) {
    try {
      await db.query(`ALTER TABLE shopify_variants ADD COLUMN IF NOT EXISTS ${column}`);
      console.log(`  ✅ ${column.split(' ')[0]}`);
    } catch (error) {
      console.log(`  ⚠️ ${column.split(' ')[0]}: ${error.message}`);
    }
  }

  // Insert pricing rules without ON CONFLICT
  console.log('\n🏷️ Inserting pricing rules...');
  const rules = [
    ['aggressive_high_0_30', 'aggressive', 0, 30, 'high_60plus', 25.00],
    ['aggressive_high_31_60', 'aggressive', 31, 60, 'high_60plus', 40.00],
    ['aggressive_high_61_90', 'aggressive', 61, 90, 'high_60plus', 60.00],
    ['aggressive_high_90plus', 'aggressive', 90, 999, 'high_60plus', 75.00],
    ['aggressive_normal_0_30', 'aggressive', 0, 30, 'normal_50to59', 20.00],
    ['aggressive_normal_31_60', 'aggressive', 31, 60, 'normal_50to59', 35.00],
    ['aggressive_normal_61_90', 'aggressive', 61, 90, 'normal_50to59', 50.00],
    ['aggressive_normal_90plus', 'aggressive', 90, 999, 'normal_50to59', 65.00],
    ['aggressive_low_0_30', 'aggressive', 0, 30, 'low_below50', 15.00],
    ['aggressive_low_31_60', 'aggressive', 31, 60, 'low_below50', 30.00],
    ['aggressive_low_61_90', 'aggressive', 61, 90, 'low_below50', 40.00],
    ['aggressive_low_90plus', 'aggressive', 90, 999, 'low_below50', 50.00]
  ];

  for (const rule of rules) {
    try {
      const existing = await db.query('SELECT id FROM clearance_pricing_rules WHERE rule_name = $1', [rule[0]]);
      if (existing.rows.length === 0) {
        await db.query(`
          INSERT INTO clearance_pricing_rules (rule_name, clearance_mode, age_days_min, age_days_max, margin_category, base_discount_percent)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, rule);
        console.log(`  ✅ ${rule[0]}`);
      } else {
        console.log(`  ℹ️ ${rule[0]} (already exists)`);
      }
    } catch (error) {
      console.log(`  ⚠️ ${rule[0]}: ${error.message}`);
    }
  }

  // Create indexes now that columns exist
  console.log('\n🔍 Creating indexes...');
  const indexes = [
    ['idx_products_cash_impact', 'shopify_products', 'cash_impact_score DESC'],
    ['idx_variants_cash_impact', 'shopify_variants', 'cash_impact_score DESC'],
    ['idx_products_margin', 'shopify_products', 'margin_percentage DESC'],
    ['idx_variants_margin', 'shopify_variants', 'margin_percentage DESC'],
    ['idx_products_clearance_tier', 'shopify_products', 'clearance_tier'],
    ['idx_variants_clearance_tier', 'shopify_variants', 'clearance_tier']
  ];

  for (const [name, table, columns] of indexes) {
    try {
      await db.query(`CREATE INDEX IF NOT EXISTS ${name} ON ${table}(${columns})`);
      console.log(`  ✅ ${name}`);
    } catch (error) {
      console.log(`  ⚠️ ${name}: ${error.message}`);
    }
  }

  // Final verification
  console.log('\n🔍 Verifying migration...');
  const productCols = await db.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'shopify_products' 
      AND column_name IN ('margin_percentage', 'cash_impact_score', 'clearance_tier', 'q4_item')
  `);

  const variantCols = await db.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'shopify_variants' 
      AND column_name IN ('margin_percentage', 'cash_impact_score', 'clearance_tier', 'q4_item')
  `);

  const ruleCount = await db.query('SELECT COUNT(*) as count FROM clearance_pricing_rules');

  console.log('\n✅ Migration Results:');
  console.log(`  📊 Product columns: ${productCols.rows.length}/4`);
  console.log(`  📦 Variant columns: ${variantCols.rows.length}/4`);
  console.log(`  🏷️ Pricing rules: ${ruleCount.rows[0].count}`);

  if (productCols.rows.length === 4 && variantCols.rows.length === 4 && ruleCount.rows[0].count >= 12) {
    console.log('\n🎉 Database Schema Implementation Complete!');
    console.log('🚀 Ready for Phase 1, Task 1.2: QuickBooks Cash Integration');
  } else {
    console.log('\n⚠️ Some elements missing - check logs above');
  }

  process.exit(0);
}

addColumnsIndividually();