#!/usr/bin/env tsx

import { db } from '../lib/db/connection';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function verifyProfitabilitySchema() {
  try {
    console.log('🔍 Verifying profitability engine schema...\n');

    // Check if new tables exist
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND (table_name LIKE '%cash%' 
             OR table_name LIKE '%alert%' 
             OR table_name LIKE '%clearance%'
             OR table_name LIKE '%profitability%')
    `);

    console.log('📊 New Profitability Tables:');
    tables.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name}`);
    });

    // Check if new columns were added to shopify_products
    const productColumns = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'shopify_products' 
        AND (column_name LIKE '%margin%' 
             OR column_name LIKE '%cash%' 
             OR column_name LIKE '%seasonal%'
             OR column_name LIKE '%clearance%'
             OR column_name LIKE '%profit%')
    `);

    console.log('\n💰 New Profitability Columns (Products):');
    productColumns.rows.forEach(row => {
      console.log(`  ✅ ${row.column_name}: ${row.data_type}`);
    });

    // Check if new columns were added to shopify_variants
    const variantColumns = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'shopify_variants' 
        AND (column_name LIKE '%margin%' 
             OR column_name LIKE '%cash%' 
             OR column_name LIKE '%seasonal%'
             OR column_name LIKE '%clearance%'
             OR column_name LIKE '%profit%')
    `);

    console.log('\n📦 New Profitability Columns (Variants):');
    variantColumns.rows.forEach(row => {
      console.log(`  ✅ ${row.column_name}: ${row.data_type}`);
    });

    // Check clearance pricing rules
    const pricingRules = await db.query(`
      SELECT COUNT(*) as rule_count, 
             MIN(base_discount_percent) as min_discount,
             MAX(base_discount_percent) as max_discount
      FROM clearance_pricing_rules
    `);

    console.log('\n🏷️ CFO Clearance Pricing Rules:');
    console.log(`  ✅ ${pricingRules.rows[0].rule_count} rules loaded`);
    console.log(`  ✅ Discount range: ${pricingRules.rows[0].min_discount}% - ${pricingRules.rows[0].max_discount}%`);

    // Check triggers
    const triggers = await db.query(`
      SELECT trigger_name, event_manipulation, event_object_table
      FROM information_schema.triggers
      WHERE trigger_name LIKE '%cash_impact%'
    `);

    console.log('\n⚡ Automated Triggers:');
    triggers.rows.forEach(row => {
      console.log(`  ✅ ${row.trigger_name} on ${row.event_object_table} (${row.event_manipulation})`);
    });

    // Test data sample
    const sampleData = await db.query(`
      SELECT COUNT(*) as total_products,
             COUNT(*) FILTER (WHERE margin_percentage IS NOT NULL) as with_margins,
             COUNT(*) FILTER (WHERE cash_impact_score > 0) as with_cash_scores
      FROM shopify_products
    `);

    console.log('\n📈 Current Data Status:');
    console.log(`  📊 Total Products: ${sampleData.rows[0].total_products}`);
    console.log(`  💰 With Margins: ${sampleData.rows[0].with_margins}`);
    console.log(`  🎯 With Cash Scores: ${sampleData.rows[0].with_cash_scores}`);

    console.log('\n✅ Profitability Engine Schema Verification Complete!');
    console.log('🚀 Ready for Phase 1, Task 1.2: QuickBooks Cash Integration\n');

  } catch (error) {
    console.error('❌ Schema verification failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

verifyProfitabilitySchema();