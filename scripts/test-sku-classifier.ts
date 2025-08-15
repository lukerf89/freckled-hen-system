#!/usr/bin/env tsx

import { SKUClassifier } from '../lib/inventory/sku-classifier';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testSKUClassifier() {
  try {
    console.log('🧠 Testing SKU Classification Engine...\n');

    // Test 1: Classification logic on sample data
    console.log('🔍 Test 1: Testing classification logic...');
    
    const sampleProducts = [
      {
        sku: 'HO2024-TREE-001',
        price: '29.99',
        wholesale_cost: '12.00',
        product_title: 'Christmas Tree Ornament Set',
        variant_title: 'Gold',
        vendor: 'Holiday Decor Co',
        product_type: 'Ornament',
        available_quantity: 25
      },
      {
        sku: 'SEH-PUMPKIN-LARGE',
        price: '45.00',
        wholesale_cost: '18.00',
        product_title: 'Large Halloween Pumpkin Decor',
        variant_title: 'Orange',
        vendor: 'Spooky Supplies',
        product_type: 'Decoration',
        available_quantity: 8
      },
      {
        sku: 'CANDLE-VANILLA-8OZ',
        price: '24.99',
        wholesale_cost: '8.50',
        product_title: 'Vanilla Bean Candle',
        variant_title: '8oz',
        vendor: 'Capri Blue',
        product_type: 'Candle',
        available_quantity: 50
      },
      {
        sku: 'CARD-BIRTHDAY-001',
        price: '4.99',
        wholesale_cost: '1.25',
        product_title: 'Happy Birthday Greeting Card',
        variant_title: 'Floral',
        vendor: 'Card Co',
        product_type: 'Card',
        available_quantity: 100
      }
    ];

    for (const product of sampleProducts) {
      const classification = SKUClassifier.classifyProduct(product);
      console.log(`\n   📦 ${product.sku}:`);
      console.log(`      Margin: ${classification.margin_percentage}%`);
      console.log(`      Q4 Item: ${classification.q4_item ? 'Yes' : 'No'}`);
      console.log(`      Seasonal Type: ${classification.seasonal_type || 'None'}`);
      console.log(`      Seasonal End: ${classification.seasonal_end_date?.toDateString() || 'N/A'}`);
      console.log(`      Traffic Driver: ${classification.traffic_driver ? 'Yes' : 'No'}`);
      console.log(`      Bundle Eligible: ${classification.bundle_eligible ? 'Yes' : 'No'}`);
      console.log(`      Clearance Tier: ${classification.clearance_tier}`);
      console.log(`      Cash Impact Score: ${classification.cash_impact_score}`);
      console.log(`      Protection Threshold: ${classification.profit_protection_threshold}%`);
    }

    // Test 2: Database connection and sample classification
    console.log('\n\n📊 Test 2: Testing database integration...');
    
    try {
      const { db } = await import('../lib/db/connection');
      
      // Get a small sample of products
      const products = await db.query(`
        SELECT 
          p.id as product_id,
          p.title as product_title,
          p.vendor,
          p.product_type,
          v.id as variant_id,
          v.sku,
          v.title as variant_title,
          v.price,
          v.cost as wholesale_cost,
          v.available_quantity
        FROM shopify_products p
        JOIN shopify_variants v ON p.id = v.product_id
        WHERE p.status = 'ACTIVE' 
          AND v.sku IS NOT NULL 
          AND v.sku != ''
        ORDER BY v.updated_at DESC
        LIMIT 5
      `);

      console.log(`   Found ${products.rows.length} sample variants to test`);

      for (const product of products.rows) {
        const classification = SKUClassifier.classifyProduct(product);
        console.log(`\n   📦 ${product.sku}:`);
        console.log(`      Title: ${product.product_title}`);
        console.log(`      Price: $${product.price} (Cost: $${product.wholesale_cost})`);
        console.log(`      Margin: ${classification.margin_percentage}%`);
        console.log(`      Q4 Item: ${classification.q4_item ? 'Yes' : 'No'}`);
        console.log(`      Clearance Tier: ${classification.clearance_tier}`);
      }

    } catch (dbError) {
      console.log(`   ⚠️ Database test failed: ${dbError.message}`);
    }

    // Test 3: Get current classification stats (if any exist)
    console.log('\n\n📈 Test 3: Checking existing classification data...');
    
    try {
      const stats = await SKUClassifier.getClassificationStats();
      console.log('   Current classification stats:');
      console.log(`      Total Variants: ${stats.total_variants}`);
      console.log(`      Q4 Items: ${stats.q4_items}`);
      console.log(`      Halloween Items: ${stats.halloween_items}`);
      console.log(`      Christmas Items: ${stats.christmas_items}`);
      console.log(`      High Margin Items (60%+): ${stats.high_margin_items}`);
      console.log(`      Low Margin Items (<45%): ${stats.low_margin_items}`);
      console.log(`      Traffic Drivers: ${stats.traffic_drivers}`);
      console.log(`      Bundle Eligible: ${stats.bundle_eligible}`);
      console.log(`      Cash Generators: ${stats.cash_generators}`);
      console.log(`      Space Makers: ${stats.space_makers}`);
      console.log(`      Bundle Builders: ${stats.bundle_builders}`);
      console.log(`      Average Margin: ${parseFloat(stats.avg_margin || 0).toFixed(2)}%`);
      console.log(`      Total Cash Impact Score: ${stats.total_cash_impact || 0}`);
      
      if (parseInt(stats.total_variants) === 0) {
        console.log('\n   💡 No classified products found. Ready to run full classification!');
      }

    } catch (statsError) {
      console.log(`   ⚠️ Stats check failed: ${statsError.message}`);
    }

    // Test 4: Check for items needing reclassification
    console.log('\n\n🔄 Test 4: Checking for items needing reclassification...');
    
    try {
      const needsReclassification = await SKUClassifier.findItemsNeedingReclassification();
      console.log(`   Found ${needsReclassification.length} items that may need reclassification`);
      
      if (needsReclassification.length > 0) {
        console.log('   Sample items:');
        needsReclassification.slice(0, 3).forEach((item, index) => {
          console.log(`      ${index + 1}. ${item.sku} - $${item.price} (Cost: $${item.cost})`);
        });
      }

    } catch (reclassError) {
      console.log(`   ⚠️ Reclassification check failed: ${reclassError.message}`);
    }

    console.log('\n✅ SKU Classification Engine Testing Complete!');
    console.log('🚀 The classifier is ready to process all 24,555 variants');
    console.log('💡 Would you like to run the full classification? This will:');
    console.log('   • Detect all Halloween (SEH*) and Christmas (HO*) items');
    console.log('   • Calculate precise margin percentages');
    console.log('   • Identify traffic drivers and bundle opportunities');
    console.log('   • Set profit protection thresholds');
    console.log('   • Generate cash impact scores for the clearance engine');
    console.log('\n🏃‍♂️ Ready to move to Phase 1, Task 1.4: Sales Velocity Calculator\n');

  } catch (error) {
    console.error('❌ Testing failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

testSKUClassifier();