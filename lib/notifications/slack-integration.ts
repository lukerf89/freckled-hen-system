/**
 * Slack Integration for CFO Profitability Engine
 * Automated business intelligence reporting via Slack webhooks
 * Daily cash status, alerts, and clearance recommendations
 */

import { CashImpactAlertEngine } from '../alerts/cash-impact-engine';
import { QuickBooksCashManager } from '../integrations/quickbooks-cash';
import { ClearancePricingEngine } from '../pricing/clearance-engine';

export interface SlackMessage {
  text: string;
  blocks?: any[];
  channel?: string;
  username?: string;
  icon_emoji?: string;
}

export interface DailyReport {
  date: string;
  cash_status: any;
  alerts_summary: any;
  clearance_opportunities: any;
  kpi_highlights: any;
  recommended_actions: string[];
}

export class SlackIntegration {
  private static webhookUrl = process.env.SLACK_WEBHOOK_URL;

  /**
   * Send daily business intelligence report to Slack
   */
  static async sendDailyReport(): Promise<{ success: boolean; message: string }> {
    console.log('📊 Generating daily business intelligence report...');
    
    try {
      if (!this.webhookUrl) {
        throw new Error('SLACK_WEBHOOK_URL not configured');
      }

      // Generate comprehensive daily report
      const report = await this.generateDailyReport();
      
      // Format as Slack message
      const slackMessage = await this.formatDailyReportMessage(report);
      
      // Send to Slack
      const result = await this.sendMessage(slackMessage);
      
      console.log('✅ Daily report sent to Slack successfully');
      return { success: true, message: 'Daily report sent successfully' };
      
    } catch (error) {
      console.error('❌ Failed to send daily report:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Send critical alert notifications to Slack
   */
  static async sendCriticalAlerts(): Promise<{ success: boolean; alertCount: number }> {
    console.log('🚨 Checking for critical alerts...');
    
    try {
      if (!this.webhookUrl) {
        throw new Error('SLACK_WEBHOOK_URL not configured');
      }

      const urgentAlerts = await CashImpactAlertEngine.getUrgentAlerts();
      const criticalAlerts = urgentAlerts.filter(alert => alert.priority === 'critical');
      
      if (criticalAlerts.length === 0) {
        console.log('✅ No critical alerts to report');
        return { success: true, alertCount: 0 };
      }
      
      const alertMessage = await this.formatCriticalAlertsMessage(criticalAlerts);
      await this.sendMessage(alertMessage);
      
      console.log(`🚨 Sent ${criticalAlerts.length} critical alerts to Slack`);
      return { success: true, alertCount: criticalAlerts.length };
      
    } catch (error) {
      console.error('❌ Failed to send critical alerts:', error);
      return { success: false, alertCount: 0 };
    }
  }

  /**
   * Send clearance recommendations to Slack
   */
  static async sendClearanceRecommendations(maxItems: number = 10): Promise<{ success: boolean; itemCount: number }> {
    console.log('💰 Generating clearance recommendations...');
    
    try {
      if (!this.webhookUrl) {
        throw new Error('SLACK_WEBHOOK_URL not configured');
      }

      const clearanceBatch = await ClearancePricingEngine.generateClearanceRecommendations(maxItems);
      
      if (clearanceBatch.total_items === 0) {
        console.log('✅ No clearance opportunities identified');
        return { success: true, itemCount: 0 };
      }
      
      const clearanceMessage = await this.formatClearanceMessage(clearanceBatch);
      await this.sendMessage(clearanceMessage);
      
      console.log(`💰 Sent clearance recommendations for ${clearanceBatch.total_items} items`);
      return { success: true, itemCount: clearanceBatch.total_items };
      
    } catch (error) {
      console.error('❌ Failed to send clearance recommendations:', error);
      return { success: false, itemCount: 0 };
    }
  }

  /**
   * Generate comprehensive daily report data
   */
  static async generateDailyReport(): Promise<DailyReport> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get cash status
      const cashStatus = await QuickBooksCashManager.getCurrentCashStatus();
      
      // Get alerts summary
      const alertsSummary = await CashImpactAlertEngine.generateCashImpactSummary();
      
      // Get clearance opportunities
      const clearanceOpportunities = await ClearancePricingEngine.generateClearanceRecommendations(5);
      
      // Get classification stats (if available)
      let kpiHighlights = {};
      try {
        const { SKUClassifier } = await import('../inventory/sku-classifier');
        kpiHighlights = await SKUClassifier.getClassificationStats();
      } catch (error) {
        console.log('⚠️ Could not fetch classification stats:', error.message);
      }
      
      // Generate recommended actions
      const recommendedActions = await this.generateRecommendedActions(
        cashStatus,
        alertsSummary,
        clearanceOpportunities
      );
      
      return {
        date: today,
        cash_status: cashStatus,
        alerts_summary: alertsSummary,
        clearance_opportunities: clearanceOpportunities,
        kpi_highlights: kpiHighlights,
        recommended_actions: recommendedActions
      };
      
    } catch (error) {
      console.error('❌ Error generating daily report:', error);
      throw error;
    }
  }

  /**
   * Format daily report as rich Slack message
   */
  static async formatDailyReportMessage(report: DailyReport): Promise<SlackMessage> {
    const cashStatus = report.cash_status;
    const netCash = cashStatus.available_cash - cashStatus.pending_payables;
    
    // Status emoji based on cash adequacy
    let statusEmoji = '✅';
    if (cashStatus.cash_adequacy_status === 'critical') statusEmoji = '🚨';
    else if (cashStatus.cash_adequacy_status === 'tight') statusEmoji = '⚠️';
    
    // Header
    const headerText = `${statusEmoji} *Daily Business Intelligence Report - ${report.date}*`;
    
    // Cash status section
    const cashSection = {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*💰 Cash Status: ${cashStatus.cash_adequacy_status.toUpperCase()}*\n` +
              `Available: $${cashStatus.available_cash.toLocaleString()}\n` +
              `Pending: $${cashStatus.pending_payables.toLocaleString()}\n` +
              `Net Cash: $${netCash.toLocaleString()}`
      }
    };
    
    // Alerts section
    const alertsText = report.alerts_summary.total_alerts > 0 ?
      `🚨 *${report.alerts_summary.total_alerts} Active Alerts*\n` +
      `Critical: ${report.alerts_summary.critical_alerts}\n` +
      `Cash at Risk: $${report.alerts_summary.total_cash_at_risk.toLocaleString()}\n` +
      `Recovery Potential: $${report.alerts_summary.total_recovery_potential.toLocaleString()}` :
      `✅ *No Active Alerts*\nBusiness operations running smoothly`;
    
    const alertsSection = {
      type: "section",
      text: {
        type: "mrkdwn",
        text: alertsText
      }
    };
    
    // Clearance opportunities section
    const clearanceText = report.clearance_opportunities.total_items > 0 ?
      `💡 *Clearance Opportunities*\n` +
      `${report.clearance_opportunities.total_items} items identified\n` +
      `Avg discount: ${report.clearance_opportunities.avg_discount.toFixed(1)}%\n` +
      `Recovery potential: $${report.clearance_opportunities.total_potential_recovery.toLocaleString()}` :
      `✅ *No Clearance Needed*\nInventory moving well`;
    
    const clearanceSection = {
      type: "section",
      text: {
        type: "mrkdwn",
        text: clearanceText
      }
    };
    
    // KPI highlights section (if available)
    let kpiSection = null;
    if (report.kpi_highlights.total_variants) {
      const kpi = report.kpi_highlights;
      kpiSection = {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `📊 *Inventory Intelligence*\n` +
                `Total SKUs: ${parseInt(kpi.total_variants || 0).toLocaleString()}\n` +
                `Q4 Items: ${kpi.q4_items || 0}\n` +
                `Avg Margin: ${parseFloat(kpi.avg_margin || 0).toFixed(1)}%\n` +
                `Dead Stock: ${kpi.dead_stock || 0} items`
        }
      };
    }
    
    // Recommended actions
    let actionsSection = null;
    if (report.recommended_actions.length > 0) {
      const actionsText = report.recommended_actions
        .slice(0, 3) // Top 3 actions
        .map((action, index) => `${index + 1}. ${action}`)
        .join('\n');
      
      actionsSection = {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🎯 *Recommended Actions*\n${actionsText}`
        }
      };
    }
    
    // Build blocks array
    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `Business Intelligence Report - ${report.date}`
        }
      },
      { type: "divider" },
      cashSection,
      alertsSection,
      clearanceSection
    ];
    
    if (kpiSection) blocks.push(kpiSection);
    if (actionsSection) {
      blocks.push({ type: "divider" });
      blocks.push(actionsSection);
    }
    
    return {
      text: headerText,
      blocks: blocks,
      username: "CFO Intelligence Engine",
      icon_emoji: ":chart_with_upwards_trend:"
    };
  }

  /**
   * Format critical alerts as Slack message
   */
  static async formatCriticalAlertsMessage(alerts: any[]): Promise<SlackMessage> {
    const alertText = alerts
      .slice(0, 5) // Top 5 critical alerts
      .map((alert, index) => 
        `${index + 1}. *${alert.title}*\n` +
        `   Cash Impact: $${alert.cash_impact.toLocaleString()}\n` +
        `   Action: ${alert.suggested_action}\n`
      )
      .join('\n');
    
    return {
      text: `🚨 *CRITICAL BUSINESS ALERTS*\n\n${alertText}`,
      username: "Cash Alert System",
      icon_emoji: ":rotating_light:"
    };
  }

  /**
   * Format clearance recommendations as Slack message
   */
  static async formatClearanceMessage(clearanceBatch: any): Promise<SlackMessage> {
    const topItems = clearanceBatch.items
      .slice(0, 5) // Top 5 items
      .map((item: any, index: number) => 
        `${index + 1}. ${item.sku}: $${item.current_price} → $${item.recommended_price} (${item.discount_percentage}% off)`
      )
      .join('\n');
    
    const summaryText = 
      `💰 *Clearance Pricing Recommendations*\n\n` +
      `Total Items: ${clearanceBatch.total_items}\n` +
      `Average Discount: ${clearanceBatch.avg_discount.toFixed(1)}%\n` +
      `Recovery Potential: $${clearanceBatch.total_potential_recovery.toLocaleString()}\n` +
      `Estimated Timeline: ${clearanceBatch.estimated_clearance_time} weeks\n\n` +
      `*Top Recommendations:*\n${topItems}`;
    
    return {
      text: summaryText,
      username: "Clearance Engine",
      icon_emoji: ":money_with_wings:"
    };
  }

  /**
   * Generate recommended actions based on current state
   */
  static async generateRecommendedActions(
    cashStatus: any,
    alertsSummary: any,
    clearanceOpportunities: any
  ): Promise<string[]> {
    const actions: string[] = [];
    
    // Cash-based actions
    if (cashStatus.cash_adequacy_status === 'critical') {
      actions.push('🚨 Immediate cash conservation required - delay non-essential orders');
      actions.push('💰 Implement emergency clearance pricing to generate cash');
    } else if (cashStatus.cash_adequacy_status === 'tight') {
      actions.push('⚠️ Monitor cash flow closely - consider accelerating clearance');
    }
    
    // Alert-based actions
    if (alertsSummary.critical_alerts > 0) {
      actions.push(`🔥 Address ${alertsSummary.critical_alerts} critical alerts immediately`);
    }
    
    if (alertsSummary.recovery_opportunities > 0 && alertsSummary.total_recovery_potential > 5000) {
      actions.push(`💡 Implement clearance pricing to recover $${alertsSummary.total_recovery_potential.toLocaleString()}`);
    }
    
    // Clearance-based actions
    if (clearanceOpportunities.total_items > 5) {
      actions.push(`🏷️ Review clearance pricing for ${clearanceOpportunities.total_items} slow-moving items`);
    }
    
    // Default positive action
    if (actions.length === 0) {
      actions.push('✅ Continue monitoring - business metrics are healthy');
    }
    
    return actions;
  }

  /**
   * Send message to Slack webhook
   */
  static async sendMessage(message: SlackMessage): Promise<void> {
    try {
      if (!this.webhookUrl) {
        throw new Error('SLACK_WEBHOOK_URL not configured');
      }

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
      }

      const responseText = await response.text();
      if (responseText !== 'ok') {
        throw new Error(`Slack webhook error: ${responseText}`);
      }

    } catch (error) {
      console.error('❌ Failed to send Slack message:', error);
      throw error;
    }
  }

  /**
   * Test Slack integration
   */
  static async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.webhookUrl) {
        return { success: false, message: 'SLACK_WEBHOOK_URL not configured' };
      }

      const testMessage: SlackMessage = {
        text: '🧪 *CFO Intelligence Engine Test*\n\nSlack integration is working correctly!',
        username: 'Test Bot',
        icon_emoji: ':white_check_mark:'
      };

      await this.sendMessage(testMessage);
      
      return { success: true, message: 'Slack integration test successful' };
      
    } catch (error) {
      return { success: false, message: `Test failed: ${error.message}` };
    }
  }

  /**
   * Send custom message to Slack
   */
  static async sendCustomMessage(
    text: string, 
    options: Partial<SlackMessage> = {}
  ): Promise<{ success: boolean; message: string }> {
    try {
      const message: SlackMessage = {
        text,
        username: 'CFO Engine',
        icon_emoji: ':robot_face:',
        ...options
      };

      await this.sendMessage(message);
      return { success: true, message: 'Custom message sent successfully' };
      
    } catch (error) {
      return { success: false, message: `Failed to send: ${error.message}` };
    }
  }
}