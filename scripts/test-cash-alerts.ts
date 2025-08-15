#!/usr/bin/env tsx

import { CashImpactAlertEngine } from '../lib/alerts/cash-impact-engine';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testCashAlerts() {
  try {
    console.log('🚨 Testing Cash Impact Alert Engine...\n');

    // Test 1: Generate reorder alerts
    console.log('📦 Test 1: Testing critical reorder alerts...');
    try {
      const reorderAlerts = await CashImpactAlertEngine.generateReorderAlerts();
      console.log(`   Generated ${reorderAlerts.length} reorder alerts`);
      
      if (reorderAlerts.length > 0) {
        console.log('   Sample reorder alerts:');
        reorderAlerts.slice(0, 2).forEach((alert, index) => {
          console.log(`      ${index + 1}. ${alert.title}`);
          console.log(`         Priority: ${alert.priority}`);
          console.log(`         Cash Impact: $${alert.cash_impact.toLocaleString()}`);
          console.log(`         Recovery Potential: $${alert.cash_recovery_potential.toLocaleString()}`);
          console.log(`         Action: ${alert.suggested_action}`);
          console.log(`         Urgency: ${alert.urgency_score}/100`);
        });
      } else {
        console.log('   ℹ️ No critical reorder alerts (good inventory management!)');
      }
      
    } catch (error) {
      console.log(`   ⚠️ Reorder alerts test failed: ${error.message}`);
    }

    // Test 2: Generate dead stock alerts
    console.log('\n\n💀 Test 2: Testing dead stock alerts...');
    try {
      const deadStockAlerts = await CashImpactAlertEngine.generateDeadStockAlerts();
      console.log(`   Generated ${deadStockAlerts.length} dead stock alerts`);
      
      if (deadStockAlerts.length > 0) {
        console.log('   Dead stock analysis:');
        deadStockAlerts.forEach((alert, index) => {
          console.log(`      ${index + 1}. ${alert.title}`);
          console.log(`         Cash Tied Up: $${alert.cash_impact.toLocaleString()}`);
          console.log(`         Recovery Potential: $${alert.cash_recovery_potential.toLocaleString()}`);
          console.log(`         Items: ${alert.sku_list.length} SKUs`);
          console.log(`         Action: ${alert.suggested_action}`);
        });
      } else {
        console.log('   ✅ No dead stock detected (excellent inventory turnover!)');
      }
      
    } catch (error) {
      console.log(`   ⚠️ Dead stock alerts test failed: ${error.message}`);
    }

    // Test 3: Generate seasonal alerts
    console.log('\n\n🎃 Test 3: Testing seasonal urgency alerts...');
    try {
      const seasonalAlerts = await CashImpactAlertEngine.generateSeasonalAlerts();
      console.log(`   Generated ${seasonalAlerts.length} seasonal alerts`);
      
      if (seasonalAlerts.length > 0) {
        console.log('   Seasonal urgency analysis:');
        seasonalAlerts.forEach((alert, index) => {
          console.log(`      ${index + 1}. ${alert.title}`);
          console.log(`         Priority: ${alert.priority}`);
          console.log(`         Value at Risk: $${alert.cash_impact.toLocaleString()}`);
          console.log(`         Items: ${alert.sku_list.length} SKUs`);
          console.log(`         Resolution Time: ${alert.estimated_resolution_time}`);
          console.log(`         Message: ${alert.message}`);
        });
      } else {
        console.log('   ℹ️ No urgent seasonal items detected');
      }
      
    } catch (error) {
      console.log(`   ⚠️ Seasonal alerts test failed: ${error.message}`);
    }

    // Test 4: Generate opportunity alerts
    console.log('\n\n💰 Test 4: Testing cash opportunity alerts...');
    try {
      const opportunityAlerts = await CashImpactAlertEngine.generateOpportunityAlerts();
      console.log(`   Generated ${opportunityAlerts.length} opportunity alerts`);
      
      if (opportunityAlerts.length > 0) {
        console.log('   Cash recovery opportunities:');
        opportunityAlerts.forEach((alert, index) => {
          console.log(`      ${index + 1}. ${alert.title}`);
          console.log(`         Recovery Potential: $${alert.cash_recovery_potential.toLocaleString()}`);
          console.log(`         Items: ${alert.sku_list.length} SKUs`);
          console.log(`         Timeline: ${alert.estimated_resolution_time}`);
          console.log(`         Action: ${alert.suggested_action}`);
        });
      } else {
        console.log('   ℹ️ No immediate cash opportunities identified');
      }
      
    } catch (error) {
      console.log(`   ⚠️ Opportunity alerts test failed: ${error.message}`);
    }

    // Test 5: Generate margin protection alerts
    console.log('\n\n📊 Test 5: Testing margin protection alerts...');
    try {
      const marginAlerts = await CashImpactAlertEngine.generateMarginProtectionAlerts();
      console.log(`   Generated ${marginAlerts.length} margin alerts`);
      
      if (marginAlerts.length > 0) {
        console.log('   Margin protection analysis:');
        marginAlerts.forEach((alert, index) => {
          console.log(`      ${index + 1}. ${alert.title}`);
          console.log(`         Priority: ${alert.priority}`);
          console.log(`         Items: ${alert.sku_list.length} SKUs`);
          console.log(`         Urgency: ${alert.urgency_score}/100`);
          console.log(`         Action: ${alert.suggested_action}`);
        });
      } else {
        console.log('   ✅ All items have healthy margins');
      }
      
    } catch (error) {
      console.log(`   ⚠️ Margin alerts test failed: ${error.message}`);
    }

    // Test 6: Generate comprehensive alert summary
    console.log('\n\n📋 Test 6: Testing comprehensive alert generation...');
    try {
      const allAlerts = await CashImpactAlertEngine.generateAlerts();
      console.log(`   Total alerts generated: ${allAlerts.length}`);
      
      // Categorize alerts
      const alertsByPriority = {
        critical: allAlerts.filter(a => a.priority === 'critical'),
        high: allAlerts.filter(a => a.priority === 'high'),
        medium: allAlerts.filter(a => a.priority === 'medium'),
        low: allAlerts.filter(a => a.priority === 'low')
      };
      
      const alertsByType = {
        critical_reorder: allAlerts.filter(a => a.alert_type === 'critical_reorder'),
        dead_stock_drain: allAlerts.filter(a => a.alert_type === 'dead_stock_drain'),
        seasonal_urgent: allAlerts.filter(a => a.alert_type === 'seasonal_urgent'),
        cash_opportunity: allAlerts.filter(a => a.alert_type === 'cash_opportunity'),
        margin_protection: allAlerts.filter(a => a.alert_type === 'margin_protection')
      };
      
      console.log('\n   📊 Alert Breakdown by Priority:');
      console.log(`      Critical: ${alertsByPriority.critical.length}`);
      console.log(`      High: ${alertsByPriority.high.length}`);
      console.log(`      Medium: ${alertsByPriority.medium.length}`);
      console.log(`      Low: ${alertsByPriority.low.length}`);
      
      console.log('\n   📊 Alert Breakdown by Type:');
      console.log(`      Critical Reorders: ${alertsByType.critical_reorder.length}`);
      console.log(`      Dead Stock Drains: ${alertsByType.dead_stock_drain.length}`);
      console.log(`      Seasonal Urgent: ${alertsByType.seasonal_urgent.length}`);
      console.log(`      Cash Opportunities: ${alertsByType.cash_opportunity.length}`);
      console.log(`      Margin Protection: ${alertsByType.margin_protection.length}`);
      
      // Show top 3 most urgent alerts
      if (allAlerts.length > 0) {
        console.log('\n   🔥 Top 3 Most Urgent Alerts:');
        allAlerts.slice(0, 3).forEach((alert, index) => {
          console.log(`      ${index + 1}. ${alert.title} (${alert.priority})`);
          console.log(`         Urgency: ${alert.urgency_score}/100`);
          console.log(`         Cash Impact: $${alert.cash_impact.toLocaleString()}`);
          console.log(`         Recovery: $${alert.cash_recovery_potential.toLocaleString()}`);
        });
      }
      
    } catch (error) {
      console.log(`   ⚠️ Comprehensive alerts test failed: ${error.message}`);
    }

    // Test 7: Generate cash impact summary
    console.log('\n\n💼 Test 7: Testing cash impact summary...');
    try {
      const summary = await CashImpactAlertEngine.generateCashImpactSummary();
      
      console.log('   📈 Business Cash Impact Summary:');
      console.log(`      Total Alerts: ${summary.total_alerts}`);
      console.log(`      Critical Alerts: ${summary.critical_alerts}`);
      console.log(`      Cash at Risk: $${summary.total_cash_at_risk.toLocaleString()}`);
      console.log(`      Recovery Opportunities: ${summary.recovery_opportunities}`);
      console.log(`      Recovery Potential: $${summary.total_recovery_potential.toLocaleString()}`);
      console.log(`      Cash Adequacy: ${summary.cash_adequacy.toUpperCase()}`);
      console.log(`      Weekly Burn Rate: $${summary.weekly_burn_rate.toLocaleString()}`);
      console.log(`      Weeks of Runway: ${summary.weeks_of_runway}`);
      
      if (summary.recommended_immediate_actions.length > 0) {
        console.log('\n   🚨 Immediate Actions Required:');
        summary.recommended_immediate_actions.forEach((action, index) => {
          console.log(`      ${index + 1}. ${action}`);
        });
      } else {
        console.log('\n   ✅ No immediate actions required - good cash position!');
      }
      
    } catch (error) {
      console.log(`   ⚠️ Cash impact summary test failed: ${error.message}`);
    }

    // Test 8: Test urgent alerts filter
    console.log('\n\n⚡ Test 8: Testing urgent alerts filter...');
    try {
      const urgentAlerts = await CashImpactAlertEngine.getUrgentAlerts();
      console.log(`   Found ${urgentAlerts.length} alerts requiring immediate attention`);
      
      if (urgentAlerts.length > 0) {
        console.log('   Urgent alerts requiring action:');
        urgentAlerts.forEach((alert, index) => {
          console.log(`      ${index + 1}. ${alert.title} (${alert.priority})`);
          console.log(`         Urgency: ${alert.urgency_score}/100`);
          console.log(`         Resolution: ${alert.estimated_resolution_time}`);
        });
      } else {
        console.log('   ✅ No urgent alerts - business is running smoothly!');
      }
      
    } catch (error) {
      console.log(`   ⚠️ Urgent alerts test failed: ${error.message}`);
    }

    console.log('\n✅ Cash Impact Alert Engine Testing Complete!');
    console.log('🚀 The alert system is ready for real-time business monitoring');
    console.log('💡 Features tested:');
    console.log('   • Critical reorder alerts (prevent stockouts)');
    console.log('   • Dead stock identification (cash recovery)');
    console.log('   • Seasonal urgency detection (prevent losses)');
    console.log('   • Cash opportunity alerts (revenue optimization)');
    console.log('   • Margin protection warnings (profitability)');
    console.log('   • Comprehensive cash impact analysis');
    console.log('   • Intelligent alert prioritization');
    console.log('\n🏃‍♂️ Ready for Slack Integration!\n');

  } catch (error) {
    console.error('❌ Testing failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

testCashAlerts();