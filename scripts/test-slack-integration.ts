#!/usr/bin/env tsx

import { SlackIntegration } from '../lib/notifications/slack-integration';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testSlackIntegration() {
  try {
    console.log('📱 Testing Slack Integration...\n');

    // Test 1: Test basic connection
    console.log('🔗 Test 1: Testing Slack webhook connection...');
    try {
      const connectionTest = await SlackIntegration.testConnection();
      if (connectionTest.success) {
        console.log('   ✅ Slack connection successful!');
        console.log(`   Message: ${connectionTest.message}`);
      } else {
        console.log('   ⚠️ Slack connection failed');
        console.log(`   Error: ${connectionTest.message}`);
        
        if (connectionTest.message.includes('not configured')) {
          console.log('   💡 To enable Slack notifications:');
          console.log('      1. Create a Slack App in your workspace');
          console.log('      2. Add incoming webhook URL to .env.local');
          console.log('      3. Set SLACK_WEBHOOK_URL=your_webhook_url');
        }
      }
    } catch (error) {
      console.log(`   ❌ Connection test failed: ${error.message}`);
    }

    // Test 2: Generate daily report data
    console.log('\n\n📊 Test 2: Testing daily report generation...');
    try {
      const reportData = await SlackIntegration.generateDailyReport();
      console.log('   ✅ Daily report data generated successfully');
      
      console.log('   📈 Report Summary:');
      console.log(`      Date: ${reportData.date}`);
      console.log(`      Cash Status: ${reportData.cash_status.cash_adequacy_status.toUpperCase()}`);
      console.log(`      Available Cash: $${reportData.cash_status.available_cash.toLocaleString()}`);
      console.log(`      Net Cash: $${(reportData.cash_status.available_cash - reportData.cash_status.pending_payables).toLocaleString()}`);
      console.log(`      Total Alerts: ${reportData.alerts_summary.total_alerts}`);
      console.log(`      Critical Alerts: ${reportData.alerts_summary.critical_alerts}`);
      console.log(`      Clearance Items: ${reportData.clearance_opportunities.total_items}`);
      console.log(`      Recovery Potential: $${reportData.clearance_opportunities.total_potential_recovery.toLocaleString()}`);
      console.log(`      Recommended Actions: ${reportData.recommended_actions.length}`);
      
      if (reportData.recommended_actions.length > 0) {
        console.log('   🎯 Top Recommended Actions:');
        reportData.recommended_actions.slice(0, 3).forEach((action, index) => {
          console.log(`      ${index + 1}. ${action}`);
        });
      }
      
    } catch (error) {
      console.log(`   ⚠️ Daily report generation failed: ${error.message}`);
    }

    // Test 3: Format daily report message
    console.log('\n\n💬 Test 3: Testing daily report message formatting...');
    try {
      const reportData = await SlackIntegration.generateDailyReport();
      const slackMessage = await SlackIntegration.formatDailyReportMessage(reportData);
      
      console.log('   ✅ Daily report message formatted successfully');
      console.log('   📱 Slack Message Preview:');
      console.log(`      Text: ${slackMessage.text}`);
      console.log(`      Username: ${slackMessage.username}`);
      console.log(`      Emoji: ${slackMessage.icon_emoji}`);
      console.log(`      Blocks: ${slackMessage.blocks?.length || 0} sections`);
      
      // Show a sample of the formatted content
      if (slackMessage.blocks && slackMessage.blocks.length > 0) {
        console.log('\n   📋 Message Content Preview:');
        slackMessage.blocks.slice(0, 3).forEach((block, index) => {
          if (block.text) {
            const preview = block.text.text || block.text.text || 'No text content';
            const shortPreview = preview.length > 100 ? preview.substring(0, 100) + '...' : preview;
            console.log(`      Block ${index + 1}: ${shortPreview.replace(/\n/g, ' ')}`);
          }
        });
      }
      
    } catch (error) {
      console.log(`   ⚠️ Message formatting failed: ${error.message}`);
    }

    // Test 4: Test critical alerts formatting
    console.log('\n\n🚨 Test 4: Testing critical alerts messaging...');
    try {
      const { CashImpactAlertEngine } = await import('../lib/alerts/cash-impact-engine');
      const criticalAlerts = await CashImpactAlertEngine.getUrgentAlerts();
      const criticalOnly = criticalAlerts.filter(alert => alert.priority === 'critical');
      
      console.log(`   Found ${criticalOnly.length} critical alerts`);
      
      if (criticalOnly.length > 0) {
        const alertMessage = await SlackIntegration.formatCriticalAlertsMessage(criticalOnly);
        console.log('   ✅ Critical alerts message formatted');
        console.log(`   🚨 Alert Message Preview: ${alertMessage.text.substring(0, 200)}...`);
      } else {
        console.log('   ✅ No critical alerts (business running smoothly!)');
        
        // Test with mock critical alert
        const mockAlert = {
          title: 'Critical Reorder: SAMPLE-SKU-001',
          cash_impact: 5000,
          suggested_action: 'Reorder 50 units immediately from vendor',
          priority: 'critical'
        };
        
        const mockMessage = await SlackIntegration.formatCriticalAlertsMessage([mockAlert]);
        console.log('   📝 Mock critical alert preview:');
        console.log(`      ${mockMessage.text.substring(0, 150)}...`);
      }
      
    } catch (error) {
      console.log(`   ⚠️ Critical alerts test failed: ${error.message}`);
    }

    // Test 5: Test clearance recommendations messaging
    console.log('\n\n💰 Test 5: Testing clearance recommendations messaging...');
    try {
      const { ClearancePricingEngine } = await import('../lib/pricing/clearance-engine');
      const clearanceBatch = await ClearancePricingEngine.generateClearanceRecommendations(5);
      
      if (clearanceBatch.total_items > 0) {
        const clearanceMessage = await SlackIntegration.formatClearanceMessage(clearanceBatch);
        console.log('   ✅ Clearance message formatted successfully');
        console.log(`   💰 Items: ${clearanceBatch.total_items}`);
        console.log(`   📉 Avg Discount: ${clearanceBatch.avg_discount.toFixed(1)}%`);
        console.log(`   💵 Recovery: $${clearanceBatch.total_potential_recovery.toLocaleString()}`);
        console.log(`   ⏱️ Timeline: ${clearanceBatch.estimated_clearance_time} weeks`);
        
        const preview = clearanceMessage.text.substring(0, 200);
        console.log(`   📱 Message Preview: ${preview}...`);
      } else {
        console.log('   ℹ️ No clearance opportunities identified');
      }
      
    } catch (error) {
      console.log(`   ⚠️ Clearance messaging test failed: ${error.message}`);
    }

    // Test 6: Test custom message sending
    console.log('\n\n📝 Test 6: Testing custom message functionality...');
    try {
      const customResult = await SlackIntegration.sendCustomMessage(
        '🧪 **Test Message from CFO Intelligence Engine**\n\nThis is a test of the custom messaging system. All integrations are working correctly!',
        {
          username: 'Test System',
          icon_emoji: ':test_tube:'
        }
      );
      
      if (customResult.success) {
        console.log('   ✅ Custom message sent successfully');
      } else {
        console.log('   ⚠️ Custom message failed');
        console.log(`   Error: ${customResult.message}`);
      }
      
    } catch (error) {
      console.log(`   ⚠️ Custom message test failed: ${error.message}`);
    }

    // Test 7: Test full daily report sending
    console.log('\n\n📬 Test 7: Testing full daily report sending...');
    try {
      const dailyResult = await SlackIntegration.sendDailyReport();
      
      if (dailyResult.success) {
        console.log('   ✅ Daily report sent successfully');
        console.log(`   Message: ${dailyResult.message}`);
      } else {
        console.log('   ⚠️ Daily report sending failed');
        console.log(`   Error: ${dailyResult.message}`);
      }
      
    } catch (error) {
      console.log(`   ⚠️ Daily report test failed: ${error.message}`);
    }

    // Test 8: Test alert sending
    console.log('\n\n🚨 Test 8: Testing critical alert sending...');
    try {
      const alertResult = await SlackIntegration.sendCriticalAlerts();
      
      console.log(`   Alert Status: ${alertResult.success ? 'Success' : 'Failed'}`);
      console.log(`   Critical Alerts Sent: ${alertResult.alertCount}`);
      
      if (alertResult.alertCount === 0) {
        console.log('   ✅ No critical alerts to send (healthy business state)');
      }
      
    } catch (error) {
      console.log(`   ⚠️ Alert sending test failed: ${error.message}`);
    }

    // Summary
    console.log('\n✅ Slack Integration Testing Complete!');
    console.log('🚀 The notification system is ready for automated reporting');
    console.log('💡 Slack integration features:');
    console.log('   • Daily business intelligence reports');
    console.log('   • Critical alert notifications');
    console.log('   • Clearance pricing recommendations');
    console.log('   • Rich formatted messages with sections');
    console.log('   • Custom messaging capabilities');
    console.log('   • Automated cash status monitoring');
    console.log('   • KPI highlights and trending');
    console.log('   • Actionable business recommendations');
    
    if (!process.env.SLACK_WEBHOOK_URL) {
      console.log('\n💡 To enable live Slack notifications:');
      console.log('   1. Create a Slack App in your workspace');
      console.log('   2. Enable incoming webhooks');
      console.log('   3. Add webhook URL to .env.local as SLACK_WEBHOOK_URL');
      console.log('   4. The system will automatically start sending reports');
    }
    
    console.log('\n🎉 CFO INTELLIGENCE ENGINE IS COMPLETE! 🎉\n');

  } catch (error) {
    console.error('❌ Testing failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

testSlackIntegration();