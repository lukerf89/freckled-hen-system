#!/usr/bin/env tsx

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testIntegratedDashboard() {
  console.log('🧪 Testing Integrated Business Intelligence Dashboard\n');
  
  const tests = {
    api: { passed: 0, failed: 0 },
    integration: { passed: 0, failed: 0 }
  };

  // Test 1: Both APIs respond
  console.log('📊 Testing API Integration...');
  try {
    const [kpiResponse, inventoryResponse] = await Promise.all([
      fetch('http://localhost:3000/api/kpi/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }),
      fetch('http://localhost:3000/api/inventory-kpis/dashboard')
    ]);
    
    const checks = [
      { name: 'KPI API responds', passed: kpiResponse.ok },
      { name: 'Inventory API responds', passed: inventoryResponse.ok }
    ];
    
    let kpiData = null;
    let inventoryData = null;
    
    if (kpiResponse.ok) {
      kpiData = await kpiResponse.json();
      checks.push({ name: 'KPI data has alerts', passed: 'alerts' in kpiData });
      checks.push({ name: 'KPI data has kpis', passed: 'kpis' in kpiData });
    }
    
    if (inventoryResponse.ok) {
      inventoryData = await inventoryResponse.json();
      checks.push({ name: 'Inventory data has metrics', passed: 'metrics' in inventoryData });
      checks.push({ name: 'Inventory data has charts', passed: 'charts' in inventoryData });
    }
    
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
    
    // Test 2: Data Integration
    console.log('\n🔗 Testing Data Integration...');
    
    const integrationChecks = [];
    
    if (kpiData) {
      integrationChecks.push({
        name: 'KPI Financial data available',
        passed: kpiData.kpis?.cashOnHand !== undefined
      });
    }
    
    if (inventoryData) {
      integrationChecks.push({
        name: 'Inventory metrics available',
        passed: inventoryData.metrics !== undefined
      });
      
      integrationChecks.push({
        name: 'Cash impact data available',
        passed: inventoryData.metrics?.cashImpact !== undefined
      });
      
      integrationChecks.push({
        name: 'Q4 readiness tracking',
        passed: inventoryData.metrics?.q4Readiness !== undefined
      });
    }
    
    const integrationPassed = integrationChecks.filter(c => c.passed).length;
    const integrationFailed = integrationChecks.filter(c => !c.passed).length;
    
    console.log(`   ✅ Passed: ${integrationPassed}/${integrationChecks.length} checks`);
    if (integrationFailed > 0) {
      integrationChecks.filter(c => !c.passed).forEach(c => {
        console.log(`   ❌ Failed: ${c.name}`);
      });
    }
    
    tests.integration.passed = integrationPassed;
    tests.integration.failed = integrationFailed;
    
  } catch (error) {
    console.log(`   ❌ API test failed: ${error.message}`);
    tests.api.failed = 6;
  }

  // Summary
  console.log('\n📋 TEST SUMMARY\n');
  
  const totalPassed = Object.values(tests).reduce((sum, t) => sum + t.passed, 0);
  const totalFailed = Object.values(tests).reduce((sum, t) => sum + t.failed, 0);
  const total = totalPassed + totalFailed;
  
  console.log(`🔌 API Integration: ${tests.api.passed}/${tests.api.passed + tests.api.failed} passed`);
  console.log(`🔗 Data Integration: ${tests.integration.passed}/${tests.integration.passed + tests.integration.failed} passed`);
  
  console.log(`\n📊 OVERALL: ${totalPassed}/${total} tests passed (${Math.round((totalPassed/total)*100)}%)`);
  
  if (totalFailed === 0) {
    console.log('\n🎉 ALL TESTS PASSED - Integrated Business Intelligence Dashboard is ready!');
    console.log('🔗 View dashboard at: http://localhost:3000/dashboard/kpi');
    console.log('📊 Now includes both Financial KPIs AND Inventory Intelligence!');
  } else {
    console.log(`\n⚠️ ${totalFailed} tests failed - Review issues above`);
  }
  
  return totalFailed === 0;
}

testIntegratedDashboard().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});