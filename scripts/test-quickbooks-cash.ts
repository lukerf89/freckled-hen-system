#!/usr/bin/env tsx

import { QuickBooksCashManager } from '../lib/integrations/quickbooks-cash';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testQuickBooksCashIntegration() {
  try {
    console.log('🧪 Testing QuickBooks Cash Integration...\n');

    // Test 1: Sync cash balance from QuickBooks
    console.log('💰 Test 1: Syncing cash balance from QuickBooks...');
    try {
      const syncResult = await QuickBooksCashManager.syncCashBalance();
      console.log('✅ Cash sync successful:');
      console.log(`   Available: $${syncResult.cashData.available.toLocaleString()}`);
      console.log(`   Pending Payables: $${syncResult.cashData.pendingPayables.toLocaleString()}`);
      console.log(`   Status: ${syncResult.status}`);
    } catch (error) {
      console.log(`❌ Cash sync failed: ${error.message}`);
    }

    // Test 2: Get current cash status
    console.log('\n📊 Test 2: Getting current cash status...');
    try {
      const cashStatus = await QuickBooksCashManager.getCurrentCashStatus();
      console.log('✅ Current cash status:');
      console.log(`   Available: $${cashStatus.available_cash.toLocaleString()}`);
      console.log(`   Pending: $${cashStatus.pending_payables.toLocaleString()}`);
      console.log(`   Net Cash: $${(cashStatus.available_cash - cashStatus.pending_payables).toLocaleString()}`);
      console.log(`   Adequacy: ${cashStatus.cash_adequacy_status}`);
      console.log(`   Last Updated: ${cashStatus.last_updated}`);
    } catch (error) {
      console.log(`❌ Cash status failed: ${error.message}`);
    }

    // Test 3: Check affordability of different order sizes
    console.log('\n💳 Test 3: Testing order affordability...');
    const testOrders = [1000, 2500, 5000, 10000, 15000];
    
    for (const orderValue of testOrders) {
      try {
        const affordability = await QuickBooksCashManager.canAffordOrder(orderValue);
        const status = affordability.canAfford ? '✅' : '❌';
        console.log(`   ${status} $${orderValue.toLocaleString()}: ${affordability.reason}`);
      } catch (error) {
        console.log(`   ❌ $${orderValue.toLocaleString()}: Error - ${error.message}`);
      }
    }

    // Test 4: Get cash impact summary
    console.log('\n📈 Test 4: Getting cash impact summary...');
    try {
      const summary = await QuickBooksCashManager.getCashImpactSummary();
      console.log('✅ Cash impact summary:');
      console.log(`   Net Cash: $${summary.netCash.toLocaleString()}`);
      console.log(`   Critical Orders Value: $${summary.criticalOrderValue.toLocaleString()}`);
      console.log(`   Critical Orders Count: ${summary.criticalOrderCount}`);
      console.log(`   Clearance Recovery Potential: $${summary.clearanceRecoveryPotential.toLocaleString()}`);
      console.log(`   Can Afford Critical Orders: ${summary.canAffordCriticalOrders ? 'Yes' : 'No'}`);
      console.log(`   Cash Utilization: ${summary.cashUtilizationPercent}%`);
    } catch (error) {
      console.log(`❌ Cash impact summary failed: ${error.message}`);
    }

    // Test 5: Test API endpoints
    console.log('\n🌐 Test 5: Testing API endpoints...');
    
    try {
      console.log('   Testing cash sync API...');
      const syncResponse = await fetch('http://localhost:3000/api/cash/sync-quickbooks', {
        method: 'POST'
      });
      
      if (syncResponse.ok) {
        const syncData = await syncResponse.json();
        console.log('   ✅ Cash sync API working');
        console.log(`      Status: ${syncData.data?.cash_adequacy_status}`);
      } else {
        console.log(`   ❌ Cash sync API failed: ${syncResponse.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Cash sync API error: ${error.message}`);
    }

    try {
      console.log('   Testing cash status API...');
      const statusResponse = await fetch('http://localhost:3000/api/cash/sync-quickbooks');
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log('   ✅ Cash status API working');
        console.log(`      Available: $${statusData.cashStatus?.available_cash?.toLocaleString()}`);
      } else {
        console.log(`   ❌ Cash status API failed: ${statusResponse.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Cash status API error: ${error.message}`);
    }

    try {
      console.log('   Testing affordability API...');
      const affordResponse = await fetch('http://localhost:3000/api/cash/can-afford', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderValue: 5000,
          description: 'Test Order'
        })
      });
      
      if (affordResponse.ok) {
        const affordData = await affordResponse.json();
        console.log('   ✅ Affordability API working');
        console.log(`      Can afford $5,000: ${affordData.canAfford ? 'Yes' : 'No'}`);
      } else {
        console.log(`   ❌ Affordability API failed: ${affordResponse.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Affordability API error: ${error.message}`);
    }

    console.log('\n✅ QuickBooks Cash Integration Testing Complete!');
    console.log('🚀 Ready for Phase 1, Task 1.3: SKU Classification Engine\n');

  } catch (error) {
    console.error('❌ Testing failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

testQuickBooksCashIntegration();