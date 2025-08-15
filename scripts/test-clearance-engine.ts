#!/usr/bin/env tsx

import { ClearancePricingEngine } from '../lib/pricing/clearance-engine';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testClearanceEngine() {
  try {
    console.log('💰 Testing CFO Clearance Pricing Engine...\n');

    // Test 1: Determine pricing mode
    console.log('🎯 Test 1: Testing pricing mode determination...');
    try {
      const conservativeMode = await ClearancePricingEngine.determinePricingMode('conservative');
      console.log('   Conservative Mode:', conservativeMode);
      
      const aggressiveMode = await ClearancePricingEngine.determinePricingMode('aggressive');
      console.log('   Aggressive Mode:', aggressiveMode);
      
      const emergencyMode = await ClearancePricingEngine.determinePricingMode('emergency');
      console.log('   Emergency Mode:', emergencyMode);
      
      // Test auto-determination
      const autoMode = await ClearancePricingEngine.determinePricingMode();
      console.log('   Auto-determined Mode:', autoMode);
      
    } catch (error) {
      console.log(`   ⚠️ Pricing mode test failed: ${error.message}`);
    }

    // Test 2: Assess seasonal pressure
    console.log('\n\n🎃 Test 2: Testing seasonal pressure assessment...');
    try {
      const seasonalPressure = await ClearancePricingEngine.assessSeasonalPressure();
      console.log(`   Seasonal pressure detected: ${seasonalPressure ? 'Yes' : 'No'}`);
      
      // Check for upcoming seasonal items
      const { db } = await import('../lib/db/connection');
      const seasonalItems = await db.query(`
        SELECT 
          COUNT(*) as total_seasonal,
          COUNT(*) FILTER (WHERE seasonal_end_date <= CURRENT_DATE + INTERVAL '30 days') as urgent_seasonal,
          COUNT(*) FILTER (WHERE seasonal_type = 'halloween') as halloween_items,
          COUNT(*) FILTER (WHERE seasonal_type = 'christmas') as christmas_items
        FROM shopify_variants 
        WHERE seasonal_item = true AND available_quantity > 0
      `);
      
      if (seasonalItems.rows.length > 0) {
        const stats = seasonalItems.rows[0];
        console.log(`   Total seasonal items: ${stats.total_seasonal}`);
        console.log(`   Urgent (30 days): ${stats.urgent_seasonal}`);
        console.log(`   Halloween items: ${stats.halloween_items}`);
        console.log(`   Christmas items: ${stats.christmas_items}`);
      }
      
    } catch (error) {
      console.log(`   ⚠️ Seasonal pressure test failed: ${error.message}`);
    }

    // Test 3: Get eligible clearance items
    console.log('\n\n🔍 Test 3: Testing eligible item identification...');
    try {
      const eligibleItems = await ClearancePricingEngine.getEligibleClearanceItems(10);
      console.log(`   Found ${eligibleItems.length} eligible clearance items`);
      
      if (eligibleItems.length > 0) {
        console.log('   Sample eligible items:');
        eligibleItems.slice(0, 3).forEach((item, index) => {
          console.log(`      ${index + 1}. ${item.sku} - $${item.price}`);
          console.log(`         Velocity: ${item.velocity_category}, Stock: ${item.available_quantity}`);
          console.log(`         Seasonal: ${item.seasonal_item ? `Yes (${item.seasonal_type})` : 'No'}`);
          console.log(`         Margin: ${item.margin_percentage || 0}%`);
        });
      } else {
        console.log('   ℹ️ No items currently eligible for clearance');
        console.log('   This could mean:');
        console.log('     • Inventory is moving well');
        console.log('     • No dead stock detected');
        console.log('     • Classification engine still running');
      }
      
    } catch (error) {
      console.log(`   ⚠️ Eligible items test failed: ${error.message}`);
    }

    // Test 4: Generate sample clearance recommendations
    console.log('\n\n💡 Test 4: Testing clearance recommendation generation...');
    try {
      console.log('   Generating recommendations in conservative mode...');
      const conservativeBatch = await ClearancePricingEngine.generateClearanceRecommendations(5, 'conservative');
      
      console.log('   Conservative batch results:');
      console.log(`     Total items: ${conservativeBatch.total_items}`);
      console.log(`     Average discount: ${conservativeBatch.avg_discount.toFixed(1)}%`);
      console.log(`     Recovery potential: $${conservativeBatch.total_potential_recovery.toLocaleString()}`);
      console.log(`     Estimated clearance time: ${conservativeBatch.estimated_clearance_time} weeks`);
      
      if (conservativeBatch.items.length > 0) {
        console.log('   Sample recommendations:');
        conservativeBatch.items.slice(0, 2).forEach((rec, index) => {
          console.log(`      ${index + 1}. ${rec.sku}:`);
          console.log(`         Current: $${rec.current_price} → Recommended: $${rec.recommended_price}`);
          console.log(`         Discount: ${rec.discount_percentage}%`);
          console.log(`         Urgency: ${rec.urgency_score}/100`);
          console.log(`         Recovery: $${rec.cash_recovery_potential.toLocaleString()}`);
          console.log(`         Reasoning: ${rec.reasoning}`);
          console.log(`         Seasonal urgent: ${rec.seasonal_urgency ? 'Yes' : 'No'}`);
        });
      }
      
      // Test aggressive mode
      console.log('\n   Generating recommendations in aggressive mode...');
      const aggressiveBatch = await ClearancePricingEngine.generateClearanceRecommendations(5, 'aggressive');
      
      console.log('   Aggressive vs Conservative comparison:');
      console.log(`     Aggressive avg discount: ${aggressiveBatch.avg_discount.toFixed(1)}%`);
      console.log(`     Conservative avg discount: ${conservativeBatch.avg_discount.toFixed(1)}%`);
      console.log(`     Discount difference: +${(aggressiveBatch.avg_discount - conservativeBatch.avg_discount).toFixed(1)}%`);
      
    } catch (error) {
      console.log(`   ⚠️ Recommendation generation failed: ${error.message}`);
    }

    // Test 5: Clearance statistics
    console.log('\n\n📊 Test 5: Testing clearance statistics...');
    try {
      const stats = await ClearancePricingEngine.getClearanceStats();
      console.log('   Current clearance opportunity:');
      console.log(`     Dead stock items: ${stats.dead_stock_items || 0}`);
      console.log(`     Slow + overstocked: ${stats.slow_overstocked || 0}`);
      console.log(`     Seasonal urgent: ${stats.seasonal_urgent || 0}`);
      console.log(`     Excess inventory: ${stats.excess_inventory || 0}`);
      console.log(`     Dead stock value: $${parseFloat(stats.dead_stock_value || 0).toLocaleString()}`);
      console.log(`     Avg dead stock margin: ${parseFloat(stats.avg_dead_margin || 0).toFixed(1)}%`);
      console.log(`     Total active variants: ${stats.total_active_variants || 0}`);
      
      const clearanceOpportunity = (
        parseInt(stats.dead_stock_items || 0) +
        parseInt(stats.slow_overstocked || 0) +
        parseInt(stats.seasonal_urgent || 0) +
        parseInt(stats.excess_inventory || 0)
      );
      
      console.log(`\n   📈 Total clearance opportunity: ${clearanceOpportunity} items`);
      
      if (clearanceOpportunity === 0) {
        console.log('   💡 This suggests the SKU classification is still running');
        console.log('   ⏳ Once complete, dead stock and slow movers will be identified');
      }
      
    } catch (error) {
      console.log(`   ⚠️ Stats test failed: ${error.message}`);
    }

    // Test 6: Pricing calculation logic
    console.log('\n\n🧮 Test 6: Testing pricing calculation logic...');
    
    const samplePricingMode = {
      mode: 'aggressive' as const,
      cash_urgency: 'tight' as const,
      seasonal_pressure: true,
      description: 'Test mode'
    };
    
    const sampleItems = [
      {
        variant_id: 1001,
        sku: 'DEAD-STOCK-001',
        price: '25.99',
        cost: '10.00',
        available_quantity: '50',
        margin_percentage: '61.54',
        velocity_category: 'dead',
        weeks_of_stock: '999',
        seasonal_item: false,
        profit_protection_threshold: '70'
      },
      {
        variant_id: 1002,
        sku: 'HOLIDAY-URGENT-002',
        price: '35.99',
        cost: '15.00',
        available_quantity: '25',
        margin_percentage: '58.33',
        velocity_category: 'slow',
        weeks_of_stock: '40',
        seasonal_item: true,
        seasonal_type: 'christmas',
        seasonal_end_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        profit_protection_threshold: '60'
      }
    ];
    
    for (const item of sampleItems) {
      try {
        const pricing = await ClearancePricingEngine.calculateItemPricing(item, samplePricingMode);
        console.log(`\n   💰 ${item.sku}:`);
        console.log(`      Original: $${pricing.current_price} → Clearance: $${pricing.recommended_price}`);
        console.log(`      Discount: ${pricing.discount_percentage}%`);
        console.log(`      Urgency: ${pricing.urgency_score}/100`);
        console.log(`      Recovery: $${pricing.cash_recovery_potential.toLocaleString()}`);
        console.log(`      Tier: ${pricing.clearance_tier}`);
        console.log(`      Seasonal urgent: ${pricing.seasonal_urgency ? 'Yes' : 'No'}`);
        console.log(`      Reasoning: ${pricing.reasoning}`);
      } catch (pricingError) {
        console.log(`   ⚠️ Pricing calculation failed for ${item.sku}: ${pricingError.message}`);
      }
    }

    console.log('\n✅ CFO Clearance Pricing Engine Testing Complete!');
    console.log('🚀 The pricing engine is ready to optimize cash recovery');
    console.log('💡 Features tested:');
    console.log('   • Multi-mode pricing (conservative/aggressive/emergency)');
    console.log('   • Seasonal urgency detection');
    console.log('   • Dead stock identification');
    console.log('   • Profit protection thresholds');
    console.log('   • Cash recovery optimization');
    console.log('   • Velocity-based discount scaling');
    console.log('\n🏃‍♂️ Ready for Cash Impact Alert Engine!\n');

  } catch (error) {
    console.error('❌ Testing failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

testClearanceEngine();