#!/usr/bin/env tsx

import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function comprehensiveSystemTest() {
  console.log('🧪 COMPREHENSIVE SYSTEM TEST - CFO Intelligence Engine\n');
  
  const results = {
    unit_tests: { passed: 0, failed: 0, tests: [] as any[] },
    integration_tests: { passed: 0, failed: 0, tests: [] as any[] },
    performance_tests: { passed: 0, failed: 0, tests: [] as any[] },
    deployment_readiness: { passed: 0, failed: 0, tests: [] as any[] }
  };

  // UNIT TESTS
  console.log('🔬 UNIT TESTS\n');

  // Test 1: Database Schema Migrations
  try {
    console.log('📊 Testing database schema integrity...');
    const { db } = await import('../lib/db/connection');
    
    // Check profitability columns exist
    const profitabilityColumns = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'shopify_variants' 
        AND column_name IN (
          'margin_percentage', 'q4_item', 'seasonal_item', 'clearance_tier',
          'profit_protection_threshold', 'cash_impact_score', 'weekly_sales_units',
          'velocity_category', 'reorder_urgency'
        )
    `);
    
    const expectedColumns = 9;
    const foundColumns = profitabilityColumns.rows.length;
    
    if (foundColumns === expectedColumns) {
      console.log('   ✅ All profitability columns present');
      results.unit_tests.passed++;
    } else {
      console.log(`   ❌ Missing columns: ${expectedColumns - foundColumns}`);
      results.unit_tests.failed++;
    }
    
    results.unit_tests.tests.push({
      name: 'Database Schema Migrations',
      passed: foundColumns === expectedColumns,
      details: `${foundColumns}/${expectedColumns} columns found`
    });
    
  } catch (error) {
    console.log(`   ❌ Database schema test failed: ${error.message}`);
    results.unit_tests.failed++;
    results.unit_tests.tests.push({
      name: 'Database Schema Migrations',
      passed: false,
      details: error.message
    });
  }

  // Test 2: SKU Classification Intelligence
  try {
    console.log('\n🧠 Testing SKU classification intelligence...');
    const { SKUClassifier } = await import('../lib/inventory/sku-classifier');
    
    // Test seasonal detection
    const testProduct = {
      sku: 'HO2024-TEST-001',
      price: '25.99',
      wholesale_cost: '10.00',
      product_title: 'Christmas Tree Ornament',
      available_quantity: '15'
    };
    
    const classification = SKUClassifier.classifyProduct(testProduct);
    
    const checks = [
      { name: 'Christmas Detection', passed: classification.q4_item && classification.seasonal_type === 'christmas' },
      { name: 'Margin Calculation', passed: Math.abs(classification.margin_percentage - 61.54) < 1 },
      { name: 'Clearance Tier Assignment', passed: classification.clearance_tier !== null },
      { name: 'Cash Impact Score', passed: classification.cash_impact_score > 0 }
    ];
    
    const passedChecks = checks.filter(c => c.passed).length;
    
    if (passedChecks === checks.length) {
      console.log('   ✅ SKU classification working correctly');
      results.unit_tests.passed++;
    } else {
      console.log(`   ⚠️ SKU classification issues: ${checks.length - passedChecks} failed checks`);
      results.unit_tests.failed++;
    }
    
    results.unit_tests.tests.push({
      name: 'SKU Classification Intelligence',
      passed: passedChecks === checks.length,
      details: `${passedChecks}/${checks.length} checks passed`
    });
    
  } catch (error) {
    console.log(`   ❌ SKU classification test failed: ${error.message}`);
    results.unit_tests.failed++;
    results.unit_tests.tests.push({
      name: 'SKU Classification Intelligence',
      passed: false,
      details: error.message
    });
  }

  // Test 3: Clearance Pricing Engine
  try {
    console.log('\n💰 Testing clearance pricing engine...');
    const { ClearancePricingEngine } = await import('../lib/pricing/clearance-engine');
    
    const testPricingMode = {
      mode: 'aggressive' as const,
      cash_urgency: 'tight' as const,
      seasonal_pressure: true,
      description: 'Test mode'
    };
    
    const testItem = {
      variant_id: 9999,
      sku: 'TEST-CLEARANCE-001',
      price: '50.00',
      cost: '20.00',
      available_quantity: '25',
      margin_percentage: '60.00',
      velocity_category: 'slow',
      profit_protection_threshold: '70'
    };
    
    const pricing = await ClearancePricingEngine.calculateItemPricing(testItem, testPricingMode);
    
    const pricingChecks = [
      { name: 'Discount Applied', passed: pricing.discount_percentage > 0 },
      { name: 'Price Reduced', passed: pricing.recommended_price < pricing.current_price },
      { name: 'Profit Protection', passed: pricing.discount_percentage <= pricing.profit_protection_threshold },
      { name: 'Urgency Score', passed: pricing.urgency_score >= 0 && pricing.urgency_score <= 100 }
    ];
    
    const passedPricingChecks = pricingChecks.filter(c => c.passed).length;
    
    if (passedPricingChecks === pricingChecks.length) {
      console.log(`   ✅ Clearance pricing working (${pricing.discount_percentage}% discount)`);
      results.unit_tests.passed++;
    } else {
      console.log(`   ⚠️ Clearance pricing issues: ${pricingChecks.length - passedPricingChecks} failed checks`);
      results.unit_tests.failed++;
    }
    
    results.unit_tests.tests.push({
      name: 'Clearance Pricing Engine',
      passed: passedPricingChecks === pricingChecks.length,
      details: `${pricing.discount_percentage}% discount applied correctly`
    });
    
  } catch (error) {
    console.log(`   ❌ Clearance pricing test failed: ${error.message}`);
    results.unit_tests.failed++;
    results.unit_tests.tests.push({
      name: 'Clearance Pricing Engine',
      passed: false,
      details: error.message
    });
  }

  // Test 4: Cash Impact Alert System
  try {
    console.log('\n🚨 Testing cash impact alert system...');
    const { CashImpactAlertEngine } = await import('../lib/alerts/cash-impact-engine');
    
    const summary = await CashImpactAlertEngine.generateCashImpactSummary();
    
    const alertChecks = [
      { name: 'Summary Generated', passed: summary !== null },
      { name: 'Cash Adequacy Status', passed: ['safe', 'tight', 'critical'].includes(summary.cash_adequacy) },
      { name: 'Alert Counts', passed: typeof summary.total_alerts === 'number' },
      { name: 'Recommended Actions', passed: Array.isArray(summary.recommended_immediate_actions) }
    ];
    
    const passedAlertChecks = alertChecks.filter(c => c.passed).length;
    
    if (passedAlertChecks === alertChecks.length) {
      console.log(`   ✅ Alert system working (${summary.total_alerts} alerts, ${summary.cash_adequacy} status)`);
      results.unit_tests.passed++;
    } else {
      console.log(`   ⚠️ Alert system issues: ${alertChecks.length - passedAlertChecks} failed checks`);
      results.unit_tests.failed++;
    }
    
    results.unit_tests.tests.push({
      name: 'Cash Impact Alert System',
      passed: passedAlertChecks === alertChecks.length,
      details: `${summary.total_alerts} alerts generated, status: ${summary.cash_adequacy}`
    });
    
  } catch (error) {
    console.log(`   ❌ Alert system test failed: ${error.message}`);
    results.unit_tests.failed++;
    results.unit_tests.tests.push({
      name: 'Cash Impact Alert System',
      passed: false,
      details: error.message
    });
  }

  // INTEGRATION TESTS
  console.log('\n\n🔗 INTEGRATION TESTS\n');

  // Test 5: QuickBooks Cash Integration
  try {
    console.log('💳 Testing QuickBooks cash integration...');
    const { QuickBooksCashManager } = await import('../lib/integrations/quickbooks-cash');
    
    const cashStatus = await QuickBooksCashManager.getCurrentCashStatus();
    
    const qbChecks = [
      { name: 'Cash Status Retrieved', passed: cashStatus !== null },
      { name: 'Available Cash', passed: typeof cashStatus.available_cash === 'number' },
      { name: 'Cash Adequacy', passed: ['safe', 'tight', 'critical'].includes(cashStatus.cash_adequacy_status) },
      { name: 'Last Updated', passed: cashStatus.last_updated !== null }
    ];
    
    const passedQBChecks = qbChecks.filter(c => c.passed).length;
    
    if (passedQBChecks === qbChecks.length) {
      console.log(`   ✅ QuickBooks integration working ($${cashStatus.available_cash.toLocaleString()} available)`);
      results.integration_tests.passed++;
    } else {
      console.log(`   ⚠️ QuickBooks integration issues: ${qbChecks.length - passedQBChecks} failed checks`);
      results.integration_tests.failed++;
    }
    
    results.integration_tests.tests.push({
      name: 'QuickBooks Cash Integration',
      passed: passedQBChecks === qbChecks.length,
      details: `$${cashStatus.available_cash.toLocaleString()} available, status: ${cashStatus.cash_adequacy_status}`
    });
    
  } catch (error) {
    console.log(`   ❌ QuickBooks integration test failed: ${error.message}`);
    results.integration_tests.failed++;
    results.integration_tests.tests.push({
      name: 'QuickBooks Cash Integration',
      passed: false,
      details: error.message
    });
  }

  // Test 6: Slack Integration
  try {
    console.log('\n📱 Testing Slack integration...');
    const { SlackIntegration } = await import('../lib/notifications/slack-integration');
    
    const reportData = await SlackIntegration.generateDailyReport();
    const formattedMessage = await SlackIntegration.formatDailyReportMessage(reportData);
    
    const slackChecks = [
      { name: 'Report Generated', passed: reportData !== null },
      { name: 'Message Formatted', passed: formattedMessage.text !== null },
      { name: 'Blocks Present', passed: Array.isArray(formattedMessage.blocks) },
      { name: 'Username Set', passed: formattedMessage.username !== null }
    ];
    
    const passedSlackChecks = slackChecks.filter(c => c.passed).length;
    
    if (passedSlackChecks === slackChecks.length) {
      console.log(`   ✅ Slack integration working (${formattedMessage.blocks?.length || 0} blocks)`);
      results.integration_tests.passed++;
    } else {
      console.log(`   ⚠️ Slack integration issues: ${slackChecks.length - passedSlackChecks} failed checks`);
      results.integration_tests.failed++;
    }
    
    results.integration_tests.tests.push({
      name: 'Slack Integration',
      passed: passedSlackChecks === slackChecks.length,
      details: `Message formatted with ${formattedMessage.blocks?.length || 0} blocks`
    });
    
  } catch (error) {
    console.log(`   ❌ Slack integration test failed: ${error.message}`);
    results.integration_tests.failed++;
    results.integration_tests.tests.push({
      name: 'Slack Integration',
      passed: false,
      details: error.message
    });
  }

  // PERFORMANCE TESTS
  console.log('\n\n⚡ PERFORMANCE TESTS\n');

  // Test 7: Database Query Performance
  try {
    console.log('🗄️ Testing database query performance...');
    const { db } = await import('../lib/db/connection');
    
    const startTime = Date.now();
    
    const result = await db.query(`
      SELECT v.id, v.sku, v.margin_percentage, v.velocity_category, v.clearance_tier
      FROM shopify_variants v
      JOIN shopify_products p ON v.product_id = p.id
      WHERE p.status = 'ACTIVE' AND v.sku IS NOT NULL
      ORDER BY v.cash_impact_score DESC
      LIMIT 100
    `);
    
    const queryTime = Date.now() - startTime;
    const performanceTarget = 500; // 500ms target
    
    if (queryTime < performanceTarget) {
      console.log(`   ✅ Query performance good (${queryTime}ms for 100 variants)`);
      results.performance_tests.passed++;
    } else {
      console.log(`   ⚠️ Query performance slow (${queryTime}ms > ${performanceTarget}ms target)`);
      results.performance_tests.failed++;
    }
    
    results.performance_tests.tests.push({
      name: 'Database Query Performance',
      passed: queryTime < performanceTarget,
      details: `${queryTime}ms to retrieve 100 variants`
    });
    
  } catch (error) {
    console.log(`   ❌ Database performance test failed: ${error.message}`);
    results.performance_tests.failed++;
    results.performance_tests.tests.push({
      name: 'Database Query Performance',
      passed: false,
      details: error.message
    });
  }

  // Test 8: Classification Stats Performance
  try {
    console.log('\n📊 Testing classification stats performance...');
    const { SKUClassifier } = await import('../lib/inventory/sku-classifier');
    
    const startTime = Date.now();
    const stats = await SKUClassifier.getClassificationStats();
    const statsTime = Date.now() - startTime;
    const statsTarget = 1000; // 1 second target
    
    if (statsTime < statsTarget && stats.total_variants > 0) {
      console.log(`   ✅ Stats performance good (${statsTime}ms for ${stats.total_variants} variants)`);
      results.performance_tests.passed++;
    } else {
      console.log(`   ⚠️ Stats performance issues (${statsTime}ms)`);
      results.performance_tests.failed++;
    }
    
    results.performance_tests.tests.push({
      name: 'Classification Stats Performance',
      passed: statsTime < statsTarget && stats.total_variants > 0,
      details: `${statsTime}ms to calculate stats for ${stats.total_variants} variants`
    });
    
  } catch (error) {
    console.log(`   ❌ Stats performance test failed: ${error.message}`);
    results.performance_tests.failed++;
    results.performance_tests.tests.push({
      name: 'Classification Stats Performance',
      passed: false,
      details: error.message
    });
  }

  // DEPLOYMENT READINESS
  console.log('\n\n🚀 DEPLOYMENT READINESS\n');

  // Test 9: Environment Configuration
  try {
    console.log('⚙️ Testing environment configuration...');
    
    const requiredVars = [
      'DATABASE_URL',
      'SHOPIFY_STORE_DOMAIN',
      'SHOPIFY_ACCESS_TOKEN',
      'QUICKBOOKS_CLIENT_ID',
      'QUICKBOOKS_CLIENT_SECRET'
    ];
    
    const optionalVars = [
      'SLACK_WEBHOOK_URL',
      'GEMINI_API_KEY'
    ];
    
    const missingRequired = requiredVars.filter(varName => !process.env[varName]);
    const missingOptional = optionalVars.filter(varName => !process.env[varName]);
    
    if (missingRequired.length === 0) {
      console.log(`   ✅ All required environment variables configured`);
      if (missingOptional.length > 0) {
        console.log(`   ℹ️ Optional missing: ${missingOptional.join(', ')}`);
      }
      results.deployment_readiness.passed++;
    } else {
      console.log(`   ❌ Missing required variables: ${missingRequired.join(', ')}`);
      results.deployment_readiness.failed++;
    }
    
    results.deployment_readiness.tests.push({
      name: 'Environment Configuration',
      passed: missingRequired.length === 0,
      details: `Required: ${requiredVars.length - missingRequired.length}/${requiredVars.length}, Optional: ${optionalVars.length - missingOptional.length}/${optionalVars.length}`
    });
    
  } catch (error) {
    console.log(`   ❌ Environment config test failed: ${error.message}`);
    results.deployment_readiness.failed++;
    results.deployment_readiness.tests.push({
      name: 'Environment Configuration',
      passed: false,
      details: error.message
    });
  }

  // Test 10: Data Quality Validation
  try {
    console.log('\n📋 Testing data quality...');
    const { db } = await import('../lib/db/connection');
    
    const dataQuality = await db.query(`
      SELECT 
        COUNT(*) as total_variants,
        COUNT(*) FILTER (WHERE v.margin_percentage IS NOT NULL) as variants_with_margins,
        COUNT(*) FILTER (WHERE v.q4_item IS NOT NULL) as variants_classified,
        COUNT(*) FILTER (WHERE v.clearance_tier IS NOT NULL) as variants_with_tiers,
        COUNT(*) FILTER (WHERE v.margin_percentage >= 60) as high_margin_items,
        COUNT(*) FILTER (WHERE v.seasonal_item = true) as seasonal_items
      FROM shopify_variants v
      JOIN shopify_products p ON v.product_id = p.id
      WHERE p.status = 'ACTIVE' AND v.sku IS NOT NULL
    `);
    
    const stats = dataQuality.rows[0];
    const classificationRate = (parseInt(stats.variants_classified) / parseInt(stats.total_variants)) * 100;
    
    const qualityChecks = [
      { name: 'Total Variants', passed: parseInt(stats.total_variants) > 20000 },
      { name: 'Classification Rate', passed: classificationRate > 95 },
      { name: 'Margin Data', passed: parseInt(stats.variants_with_margins) > parseInt(stats.total_variants) * 0.8 },
      { name: 'Seasonal Items', passed: parseInt(stats.seasonal_items) > 1000 }
    ];
    
    const passedQualityChecks = qualityChecks.filter(c => c.passed).length;
    
    if (passedQualityChecks === qualityChecks.length) {
      console.log(`   ✅ Data quality excellent (${classificationRate.toFixed(1)}% classified)`);
      results.deployment_readiness.passed++;
    } else {
      console.log(`   ⚠️ Data quality issues: ${qualityChecks.length - passedQualityChecks} failed checks`);
      results.deployment_readiness.failed++;
    }
    
    results.deployment_readiness.tests.push({
      name: 'Data Quality Validation',
      passed: passedQualityChecks === qualityChecks.length,
      details: `${classificationRate.toFixed(1)}% variants classified, ${stats.seasonal_items} seasonal items`
    });
    
  } catch (error) {
    console.log(`   ❌ Data quality test failed: ${error.message}`);
    results.deployment_readiness.failed++;
    results.deployment_readiness.tests.push({
      name: 'Data Quality Validation',
      passed: false,
      details: error.message
    });
  }

  // FINAL SUMMARY
  console.log('\n\n📋 COMPREHENSIVE TEST RESULTS\n');
  
  const totalTests = Object.values(results).reduce((sum, category) => sum + category.passed + category.failed, 0);
  const totalPassed = Object.values(results).reduce((sum, category) => sum + category.passed, 0);
  const totalFailed = Object.values(results).reduce((sum, category) => sum + category.failed, 0);
  
  console.log(`🧪 UNIT TESTS: ${results.unit_tests.passed}/${results.unit_tests.passed + results.unit_tests.failed} passed`);
  console.log(`🔗 INTEGRATION TESTS: ${results.integration_tests.passed}/${results.integration_tests.passed + results.integration_tests.failed} passed`);
  console.log(`⚡ PERFORMANCE TESTS: ${results.performance_tests.passed}/${results.performance_tests.passed + results.performance_tests.failed} passed`);
  console.log(`🚀 DEPLOYMENT READINESS: ${results.deployment_readiness.passed}/${results.deployment_readiness.passed + results.deployment_readiness.failed} passed`);
  
  console.log(`\n📊 OVERALL: ${totalPassed}/${totalTests} tests passed (${((totalPassed/totalTests)*100).toFixed(1)}%)`);
  
  if (totalPassed === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED - SYSTEM READY FOR PRODUCTION! ✅');
  } else {
    console.log('\n⚠️ SOME TESTS FAILED - REVIEW ISSUES BEFORE DEPLOYMENT');
    
    // Show failed tests
    Object.entries(results).forEach(([category, result]) => {
      const failedTests = result.tests.filter(test => !test.passed);
      if (failedTests.length > 0) {
        console.log(`\n❌ ${category.toUpperCase()} FAILURES:`);
        failedTests.forEach(test => {
          console.log(`   • ${test.name}: ${test.details}`);
        });
      }
    });
  }
  
  console.log('\n✅ COMPREHENSIVE SYSTEM TEST COMPLETE\n');

  return {
    success: totalPassed === totalTests,
    totalTests,
    totalPassed,
    totalFailed,
    results
  };
}

comprehensiveSystemTest().then(() => process.exit(0)).catch(error => {
  console.error('❌ Comprehensive test failed:', error);
  process.exit(1);
});