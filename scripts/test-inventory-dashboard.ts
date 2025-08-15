#!/usr/bin/env tsx

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testInventoryDashboard() {
  console.log('🧪 Testing Inventory KPI Dashboard\n');
  
  const tests = {
    components: { passed: 0, failed: 0 },
    api: { passed: 0, failed: 0 },
    integration: { passed: 0, failed: 0 }
  };

  // Test 1: API Endpoint
  console.log('📊 Testing API Endpoint...');
  try {
    const response = await fetch('http://localhost:3000/api/inventory-kpis/dashboard');
    const data = await response.json();
    
    const checks = [
      { name: 'API responds', passed: response.ok },
      { name: 'Has alerts', passed: 'alerts' in data },
      { name: 'Has metrics', passed: 'metrics' in data },
      { name: 'Has progress', passed: 'progress' in data },
      { name: 'Has charts', passed: 'charts' in data },
      { name: 'Cash impact metric', passed: data.metrics?.cashImpact !== undefined },
      { name: 'Q4 readiness metric', passed: data.metrics?.q4Readiness !== undefined }
    ];
    
    const passed = checks.filter(c => c.passed).length;
    const failed = checks.filter(c => !c.passed).length;
    
    console.log(`   ✅ Passed: ${passed}/${checks.length} checks`);
    if (failed > 0) {
      checks.filter(c => !c.passed).forEach(c => {
        console.log(`   ❌ Failed: ${c.name}`);
      });
    }
    
    tests.api.passed = passed;
    tests.api.failed = failed;
    
  } catch (error) {
    console.log(`   ❌ API test failed: ${error.message}`);
    tests.api.failed = 7;
  }

  // Test 2: Component Structure
  console.log('\n📦 Testing Component Structure...');
  const fs = await import('fs');
  const path = await import('path');
  
  const components = [
    'app/dashboard/inventory-kpis/page.tsx',
    'components/dashboard/DashboardHeader.tsx',
    'components/inventory-kpis/InventoryAlertsSection.tsx',
    'components/inventory-kpis/InventoryMetricsGrid.tsx',
    'components/inventory-kpis/InventoryProgressSection.tsx',
    'components/inventory-kpis/InventoryChartsSection.tsx'
  ];
  
  let componentsPassed = 0;
  let componentsFailed = 0;
  
  for (const component of components) {
    const fullPath = path.join(process.cwd(), component);
    if (fs.existsSync(fullPath)) {
      console.log(`   ✅ ${component}`);
      componentsPassed++;
    } else {
      console.log(`   ❌ Missing: ${component}`);
      componentsFailed++;
    }
  }
  
  tests.components.passed = componentsPassed;
  tests.components.failed = componentsFailed;

  // Test 3: Database Integration
  console.log('\n🗄️ Testing Database Integration...');
  try {
    const { db } = await import('../lib/db/connection');
    
    // Check for required tables and columns
    const checks = [];
    
    // Check inventory columns exist
    const variantsCheck = await db.query(`
      SELECT COUNT(*) as count
      FROM information_schema.columns 
      WHERE table_name = 'shopify_variants' 
        AND column_name IN ('cash_impact_score', 'clearance_tier', 'q4_item', 'margin_percentage')
    `);
    
    checks.push({
      name: 'Inventory columns exist',
      passed: parseInt(variantsCheck.rows[0].count) >= 4
    });
    
    // Check for data
    const dataCheck = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE cash_impact_score IS NOT NULL) as with_scores
      FROM shopify_variants
    `);
    
    checks.push({
      name: 'Has inventory data',
      passed: parseInt(dataCheck.rows[0].total) > 0
    });
    
    checks.push({
      name: 'Has cash impact scores',
      passed: parseInt(dataCheck.rows[0].with_scores) > 0
    });
    
    const passed = checks.filter(c => c.passed).length;
    const failed = checks.filter(c => !c.passed).length;
    
    console.log(`   ✅ Passed: ${passed}/${checks.length} checks`);
    if (failed > 0) {
      checks.filter(c => !c.passed).forEach(c => {
        console.log(`   ❌ Failed: ${c.name}`);
      });
    }
    
    tests.integration.passed = passed;
    tests.integration.failed = failed;
    
  } catch (error) {
    console.log(`   ❌ Database test failed: ${error.message}`);
    tests.integration.failed = 3;
  }

  // Summary
  console.log('\n📋 TEST SUMMARY\n');
  
  const totalPassed = Object.values(tests).reduce((sum, t) => sum + t.passed, 0);
  const totalFailed = Object.values(tests).reduce((sum, t) => sum + t.failed, 0);
  const total = totalPassed + totalFailed;
  
  console.log(`📦 Components: ${tests.components.passed}/${tests.components.passed + tests.components.failed} passed`);
  console.log(`🔌 API Tests: ${tests.api.passed}/${tests.api.passed + tests.api.failed} passed`);
  console.log(`🗄️ Integration: ${tests.integration.passed}/${tests.integration.passed + tests.integration.failed} passed`);
  
  console.log(`\n📊 OVERALL: ${totalPassed}/${total} tests passed (${Math.round((totalPassed/total)*100)}%)`);
  
  if (totalFailed === 0) {
    console.log('\n🎉 ALL TESTS PASSED - Inventory KPI Dashboard is ready!');
    console.log('🔗 View dashboard at: http://localhost:3000/dashboard/inventory-kpis');
  } else {
    console.log(`\n⚠️ ${totalFailed} tests failed - Review issues above`);
  }
  
  return totalFailed === 0;
}

testInventoryDashboard().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});