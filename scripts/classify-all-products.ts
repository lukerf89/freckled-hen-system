#!/usr/bin/env tsx

import { SKUClassifier } from '../lib/inventory/sku-classifier';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function classifyAllProducts() {
  try {
    console.log('🧠 SKU Classification Engine: Starting full product classification...\n');
    console.log('🎯 This will classify all 24,555 variants with:');
    console.log('   • Seasonal intelligence (Halloween & Christmas detection)');
    console.log('   • Precise margin calculations');
    console.log('   • Traffic driver identification');
    console.log('   • Bundle opportunity detection');
    console.log('   • Cash impact scoring for clearance engine');
    console.log('   • CFO profit protection thresholds\n');

    const startTime = Date.now();

    // Run the full classification
    const result = await SKUClassifier.classifyAllProducts();

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    console.log('\n🎉 CLASSIFICATION COMPLETE! 🎉\n');
    console.log('📊 FINAL STATISTICS:');
    console.log(`   Total Processed: ${result.stats.totalProcessed.toLocaleString()} variants`);
    console.log(`   Q4 Seasonal Items: ${result.stats.q4ItemsFound.toLocaleString()}`);
    console.log(`     • Halloween Items: ${result.stats.halloweenItems.toLocaleString()}`);
    console.log(`     • Christmas Items: ${result.stats.christmasItems.toLocaleString()}`);
    console.log(`   High Margin Items (60%+): ${result.stats.highMarginItems.toLocaleString()}`);
    console.log(`   Low Margin Items (<45%): ${result.stats.lowMarginItems.toLocaleString()}`);
    console.log(`   Traffic Drivers: ${result.stats.trafficDrivers.toLocaleString()}`);
    console.log(`   Bundle Eligible: ${result.stats.bundleEligible.toLocaleString()}`);
    console.log(`   Processing Time: ${duration} seconds\n`);

    // Get updated stats from database
    console.log('📈 Getting comprehensive classification stats...');
    const finalStats = await SKUClassifier.getClassificationStats();
    
    console.log('\n💰 CLEARANCE TIER BREAKDOWN:');
    console.log(`   Cash Generators: ${finalStats.cash_generators} (high margin + stock)`);
    console.log(`   Space Makers: ${finalStats.space_makers} (medium margin + stock)`);
    console.log(`   Bundle Builders: ${finalStats.bundle_builders} (low margin or low stock)`);
    
    console.log('\n🎯 BUSINESS INTELLIGENCE:');
    console.log(`   Average Margin: ${parseFloat(finalStats.avg_margin || 0).toFixed(2)}%`);
    console.log(`   Total Cash Impact Score: ${parseInt(finalStats.total_cash_impact || 0).toLocaleString()}`);
    
    const marginDistribution = {
      excellent: parseInt(finalStats.high_margin_items) || 0,
      good: parseInt(finalStats.total_variants) - parseInt(finalStats.high_margin_items) - parseInt(finalStats.low_margin_items),
      challenging: parseInt(finalStats.low_margin_items) || 0
    };
    
    console.log('\n📊 MARGIN HEALTH:');
    console.log(`   Excellent (60%+): ${marginDistribution.excellent.toLocaleString()} items`);
    console.log(`   Good (45-60%): ${marginDistribution.good.toLocaleString()} items`);
    console.log(`   Challenging (<45%): ${marginDistribution.challenging.toLocaleString()} items`);

    // Calculate seasonal readiness
    const seasonalReadiness = {
      total: result.stats.q4ItemsFound,
      halloween: result.stats.halloweenItems,
      christmas: result.stats.christmasItems
    };

    console.log('\n🎃🎄 SEASONAL READINESS:');
    console.log(`   Total Q4 Items: ${seasonalReadiness.total.toLocaleString()}`);
    console.log(`   Halloween Ready: ${seasonalReadiness.halloween.toLocaleString()}`);
    console.log(`   Christmas Ready: ${seasonalReadiness.christmas.toLocaleString()}`);

    console.log('\n✅ YOUR INVENTORY NOW HAS SEASONAL INTELLIGENCE!');
    console.log('🚀 Ready for automated clearance pricing and cash-aware decisions');
    console.log('💡 The CFO Profitability Engine foundation is complete!\n');
    
    console.log('🏃‍♂️ Moving to Phase 1, Task 1.4: Sales Velocity Calculator');
    console.log('   This will add weekly sales tracking for dynamic pricing decisions\n');

  } catch (error) {
    console.error('❌ Classification failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

classifyAllProducts();