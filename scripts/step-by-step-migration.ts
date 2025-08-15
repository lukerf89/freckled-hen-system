#!/usr/bin/env tsx

import { db } from '../lib/db/connection';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function runStepByStepMigration() {
  try {
    console.log('🚀 Running step-by-step profitability engine migration...\n');

    // Step 1: Add columns to shopify_products
    console.log('📊 Step 1: Adding profitability columns to shopify_products...');
    try {
      await db.query(`
        ALTER TABLE shopify_products ADD COLUMN IF NOT EXISTS
          wholesale_cost DECIMAL(10,2),
          margin_percentage DECIMAL(5,2),
          cash_impact_score DECIMAL(8,2) DEFAULT 0,
          q4_item BOOLEAN DEFAULT false,
          seasonal_item BOOLEAN DEFAULT false,
          traffic_driver BOOLEAN DEFAULT false,
          clearance_candidate BOOLEAN DEFAULT false,
          days_no_sales INTEGER DEFAULT 0,
          weekly_revenue DECIMAL(10,2) DEFAULT 0,
          last_sale_date TIMESTAMP,
          sell_through_rate DECIMAL(5,2) DEFAULT 0,
          seasonal_type VARCHAR(20),
          seasonal_end_date DATE,
          clearance_tier VARCHAR(20),
          profit_protection_threshold DECIMAL(5,2),
          psychological_price_point DECIMAL(8,2),
          bundle_eligible BOOLEAN DEFAULT false;
      `);
      console.log('   ✅ Products table updated');
    } catch (error) {
      console.log(`   ⚠️ Products table error: ${error.message}`);
    }

    // Step 2: Add columns to shopify_variants
    console.log('\n📦 Step 2: Adding profitability columns to shopify_variants...');
    try {
      await db.query(`
        ALTER TABLE shopify_variants ADD COLUMN IF NOT EXISTS
          wholesale_cost DECIMAL(10,2),
          margin_percentage DECIMAL(5,2),
          cash_impact_score DECIMAL(8,2) DEFAULT 0,
          q4_item BOOLEAN DEFAULT false,
          seasonal_item BOOLEAN DEFAULT false,
          traffic_driver BOOLEAN DEFAULT false,
          clearance_candidate BOOLEAN DEFAULT false,
          days_no_sales INTEGER DEFAULT 0,
          weekly_revenue DECIMAL(10,2) DEFAULT 0,
          last_sale_date TIMESTAMP,
          sell_through_rate DECIMAL(5,2) DEFAULT 0,
          seasonal_type VARCHAR(20),
          seasonal_end_date DATE,
          clearance_tier VARCHAR(20),
          profit_protection_threshold DECIMAL(5,2),
          psychological_price_point DECIMAL(8,2),
          bundle_eligible BOOLEAN DEFAULT false;
      `);
      console.log('   ✅ Variants table updated');
    } catch (error) {
      console.log(`   ⚠️ Variants table error: ${error.message}`);
    }

    // Step 3: Create daily_cash_status table
    console.log('\n💰 Step 3: Creating daily_cash_status table...');
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS daily_cash_status (
          id SERIAL PRIMARY KEY,
          date DATE UNIQUE DEFAULT CURRENT_DATE,
          available_cash DECIMAL(12,2),
          pending_payables DECIMAL(12,2),
          critical_orders_value DECIMAL(12,2),
          weekly_pipeline_value DECIMAL(12,2),
          cash_adequacy_status VARCHAR(20),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('   ✅ Daily cash status table created');
    } catch (error) {
      console.log(`   ⚠️ Cash status table error: ${error.message}`);
    }

    // Step 4: Create inventory_alerts table (might already exist)
    console.log('\n🚨 Step 4: Creating inventory_alerts table...');
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS inventory_alerts (
          id SERIAL PRIMARY KEY,
          product_id INTEGER REFERENCES shopify_products(id),
          variant_id INTEGER REFERENCES shopify_variants(id),
          alert_type VARCHAR(30),
          cash_impact_score DECIMAL(8,2),
          priority_level VARCHAR(20),
          suggested_action TEXT,
          reasoning TEXT,
          vendor_name VARCHAR(100),
          order_value DECIMAL(10,2),
          alert_date DATE DEFAULT CURRENT_DATE,
          acknowledged BOOLEAN DEFAULT false,
          acknowledged_by VARCHAR(100),
          acknowledged_at TIMESTAMP
        );
      `);
      console.log('   ✅ Inventory alerts table created');
    } catch (error) {
      console.log(`   ⚠️ Alerts table error: ${error.message}`);
    }

    // Step 5: Create clearance_pricing_rules table
    console.log('\n🏷️ Step 5: Creating clearance_pricing_rules table...');
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS clearance_pricing_rules (
          id SERIAL PRIMARY KEY,
          rule_name VARCHAR(50),
          clearance_mode VARCHAR(20),
          age_days_min INTEGER,
          age_days_max INTEGER,
          margin_category VARCHAR(20),
          base_discount_percent DECIMAL(5,2),
          velocity_penalty_percent DECIMAL(5,2),
          seasonal_boost_percent DECIMAL(5,2),
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('   ✅ Clearance pricing rules table created');
    } catch (error) {
      console.log(`   ⚠️ Pricing rules table error: ${error.message}`);
    }

    // Step 6: Create profitability_analysis table
    console.log('\n📈 Step 6: Creating profitability_analysis table...');
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS profitability_analysis (
          id SERIAL PRIMARY KEY,
          analysis_date DATE DEFAULT CURRENT_DATE,
          total_products INTEGER,
          high_margin_count INTEGER,
          medium_margin_count INTEGER,
          low_margin_count INTEGER,
          clearance_candidates INTEGER,
          total_clearance_potential DECIMAL(12,2),
          cash_impact_total DECIMAL(12,2),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('   ✅ Profitability analysis table created');
    } catch (error) {
      console.log(`   ⚠️ Analysis table error: ${error.message}`);
    }

    // Step 7: Create system_performance table
    console.log('\n⚡ Step 7: Creating system_performance table...');
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS system_performance (
          id SERIAL PRIMARY KEY,
          endpoint VARCHAR(100),
          method VARCHAR(10),
          response_time_ms INTEGER,
          success BOOLEAN,
          request_size_bytes INTEGER,
          error_message TEXT,
          user_id VARCHAR(100),
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('   ✅ System performance table created');
    } catch (error) {
      console.log(`   ⚠️ Performance table error: ${error.message}`);
    }

    // Step 8: Insert clearance pricing rules
    console.log('\n📋 Step 8: Inserting CFO pricing rules...');
    try {
      await db.query(`
        INSERT INTO clearance_pricing_rules (rule_name, clearance_mode, age_days_min, age_days_max, margin_category, base_discount_percent) VALUES
        ('aggressive_high_0_30', 'aggressive', 0, 30, 'high_60plus', 25.00),
        ('aggressive_high_31_60', 'aggressive', 31, 60, 'high_60plus', 40.00),
        ('aggressive_high_61_90', 'aggressive', 61, 90, 'high_60plus', 60.00),
        ('aggressive_high_90plus', 'aggressive', 90, 999, 'high_60plus', 75.00),
        ('aggressive_normal_0_30', 'aggressive', 0, 30, 'normal_50to59', 20.00),
        ('aggressive_normal_31_60', 'aggressive', 31, 60, 'normal_50to59', 35.00),
        ('aggressive_normal_61_90', 'aggressive', 61, 90, 'normal_50to59', 50.00),
        ('aggressive_normal_90plus', 'aggressive', 90, 999, 'normal_50to59', 65.00),
        ('aggressive_low_0_30', 'aggressive', 0, 30, 'low_below50', 15.00),
        ('aggressive_low_31_60', 'aggressive', 31, 60, 'low_below50', 30.00),
        ('aggressive_low_61_90', 'aggressive', 61, 90, 'low_below50', 40.00),
        ('aggressive_low_90plus', 'aggressive', 90, 999, 'low_below50', 50.00)
        ON CONFLICT (rule_name) DO NOTHING;
      `);
      console.log('   ✅ CFO pricing rules inserted');
    } catch (error) {
      console.log(`   ⚠️ Rules insertion error: ${error.message}`);
    }

    // Step 9: Create indexes
    console.log('\n🔍 Step 9: Creating performance indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_products_cash_impact ON shopify_products(cash_impact_score DESC);',
      'CREATE INDEX IF NOT EXISTS idx_variants_cash_impact ON shopify_variants(cash_impact_score DESC);',
      'CREATE INDEX IF NOT EXISTS idx_products_clearance_tier ON shopify_products(clearance_tier);',
      'CREATE INDEX IF NOT EXISTS idx_variants_clearance_tier ON shopify_variants(clearance_tier);',
      'CREATE INDEX IF NOT EXISTS idx_products_seasonal ON shopify_products(q4_item, seasonal_item);',
      'CREATE INDEX IF NOT EXISTS idx_variants_seasonal ON shopify_variants(q4_item, seasonal_item);',
      'CREATE INDEX IF NOT EXISTS idx_products_margin ON shopify_products(margin_percentage DESC);',
      'CREATE INDEX IF NOT EXISTS idx_variants_margin ON shopify_variants(margin_percentage DESC);',
      'CREATE INDEX IF NOT EXISTS idx_inventory_alerts_priority ON inventory_alerts(priority_level, alert_date);',
      'CREATE INDEX IF NOT EXISTS idx_inventory_alerts_type ON inventory_alerts(alert_type, alert_date);',
      'CREATE INDEX IF NOT EXISTS idx_daily_cash_date ON daily_cash_status(date DESC);',
      'CREATE INDEX IF NOT EXISTS idx_clearance_rules_lookup ON clearance_pricing_rules(clearance_mode, margin_category, age_days_min, age_days_max);',
      'CREATE INDEX IF NOT EXISTS idx_system_performance_endpoint ON system_performance(endpoint, timestamp DESC);'
    ];

    for (const indexSQL of indexes) {
      try {
        await db.query(indexSQL);
        console.log(`   ✅ Index created`);
      } catch (error) {
        console.log(`   ⚠️ Index error: ${error.message}`);
      }
    }

    // Step 10: Insert initial analysis record
    console.log('\n📊 Step 10: Creating initial profitability analysis...');
    try {
      await db.query(`
        INSERT INTO profitability_analysis (
          analysis_date, total_products, created_at
        ) VALUES (
          CURRENT_DATE, 
          (SELECT COUNT(*) FROM shopify_products), 
          CURRENT_TIMESTAMP
        );
      `);
      console.log('   ✅ Initial analysis record created');
    } catch (error) {
      console.log(`   ⚠️ Analysis record error: ${error.message}`);
    }

    // Final verification
    console.log('\n🔍 Final verification...');
    
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('daily_cash_status', 'inventory_alerts', 'clearance_pricing_rules', 'profitability_analysis', 'system_performance')
    `);
    
    console.log('\n📊 Tables Created:');
    tables.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name}`);
    });

    const rules = await db.query('SELECT COUNT(*) as count FROM clearance_pricing_rules');
    console.log(`\n🏷️ Clearance Rules: ${rules.rows[0].count} loaded`);

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
    console.log('🎯 Database is ready for QuickBooks Cash Integration');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runStepByStepMigration();