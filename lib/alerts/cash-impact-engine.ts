/**
 * Cash Impact Alert Engine
 * Real-time monitoring and alerting for cash-critical inventory decisions
 * Integrates clearance recommendations with cash flow analysis
 */

import { db } from '../db/connection';
import { QuickBooksCashManager } from '../integrations/quickbooks-cash';
import { ClearancePricingEngine } from '../pricing/clearance-engine';

export interface CashAlert {
  id: string;
  alert_type: 'critical_reorder' | 'dead_stock_drain' | 'seasonal_urgent' | 'cash_opportunity' | 'margin_protection';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  cash_impact: number;
  suggested_action: string;
  variant_ids: number[];
  sku_list: string[];
  urgency_score: number;
  estimated_resolution_time: string;
  cash_recovery_potential: number;
  created_at: Date;
  requires_attention: boolean;
}

export interface CashImpactSummary {
  total_alerts: number;
  critical_alerts: number;
  total_cash_at_risk: number;
  recovery_opportunities: number;
  total_recovery_potential: number;
  cash_adequacy: string;
  recommended_immediate_actions: string[];
  weekly_burn_rate: number;
  weeks_of_runway: number;
}

export class CashImpactAlertEngine {

  /**
   * Generate comprehensive cash impact alerts
   */
  static async generateAlerts(): Promise<CashAlert[]> {
    console.log('🚨 Cash Impact Alert Engine: Analyzing business risks...');
    
    try {
      const alerts: CashAlert[] = [];
      
      // 1. Critical reorder alerts (fast movers running low)
      const reorderAlerts = await this.generateReorderAlerts();
      alerts.push(...reorderAlerts);
      
      // 2. Dead stock cash drain alerts
      const deadStockAlerts = await this.generateDeadStockAlerts();
      alerts.push(...deadStockAlerts);
      
      // 3. Seasonal urgency alerts
      const seasonalAlerts = await this.generateSeasonalAlerts();
      alerts.push(...seasonalAlerts);
      
      // 4. Cash opportunity alerts (clearance recommendations)
      const opportunityAlerts = await this.generateOpportunityAlerts();
      alerts.push(...opportunityAlerts);
      
      // 5. Margin protection alerts
      const marginAlerts = await this.generateMarginProtectionAlerts();
      alerts.push(...marginAlerts);
      
      // Sort by priority and urgency
      alerts.sort((a, b) => {
        const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.urgency_score - a.urgency_score;
      });
      
      console.log(`✅ Generated ${alerts.length} cash impact alerts`);
      
      // Store alerts in database
      await this.storeAlerts(alerts);
      
      return alerts;
      
    } catch (error) {
      console.error('❌ Cash alert generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate critical reorder alerts for fast-moving items running low
   */
  static async generateReorderAlerts(): Promise<CashAlert[]> {
    try {
      const reorderItems = await db.query(`
        SELECT 
          v.id as variant_id,
          v.sku,
          v.price,
          v.cost,
          v.available_quantity,
          v.weekly_sales_units,
          v.weeks_of_stock,
          v.velocity_category,
          v.reorder_urgency,
          p.title as product_title,
          p.vendor
        FROM shopify_variants v
        JOIN shopify_products p ON v.product_id = p.id
        WHERE p.status = 'ACTIVE'
          AND v.sku IS NOT NULL
          AND v.velocity_category IN ('fast', 'medium')
          AND v.reorder_urgency IN ('critical', 'high')
          AND COALESCE(v.weeks_of_stock, 0) <= 8
          AND COALESCE(v.available_quantity, 0) > 0
        ORDER BY 
          CASE v.reorder_urgency WHEN 'critical' THEN 1 ELSE 2 END,
          v.weeks_of_stock ASC
        LIMIT 20
      `);

      const alerts: CashAlert[] = [];
      
      for (const item of reorderItems.rows) {
        const weeksLeft = parseFloat(item.weeks_of_stock) || 0;
        const weeklySales = parseFloat(item.weekly_sales_units) || 0;
        const price = parseFloat(item.price) || 0;
        const cost = parseFloat(item.cost) || 0;
        
        // Calculate potential lost revenue if we stock out
        const potentialLostRevenue = weeklySales * price * Math.max(4, 8 - weeksLeft); // Lost sales for weeks out of stock
        const reorderCost = Math.max(20, weeklySales * 4) * cost; // Cost to reorder 4 weeks worth
        
        let priority: 'critical' | 'high' | 'medium' = 'medium';
        let urgencyScore = 50;
        
        if (item.reorder_urgency === 'critical' || weeksLeft <= 2) {
          priority = 'critical';
          urgencyScore = 95;
        } else if (item.reorder_urgency === 'high' || weeksLeft <= 4) {
          priority = 'high';
          urgencyScore = 80;
        } else {
          urgencyScore = 65;
        }
        
        alerts.push({
          id: `reorder_${item.variant_id}_${Date.now()}`,
          alert_type: 'critical_reorder',
          priority,
          title: `Critical Reorder: ${item.sku}`,
          message: `Fast-selling ${item.product_title} will stock out in ${weeksLeft.toFixed(1)} weeks. Current sales: ${weeklySales.toFixed(1)} units/week.`,
          cash_impact: reorderCost,
          suggested_action: `Reorder ${Math.ceil(weeklySales * 8)} units from ${item.vendor} immediately. Cost: $${reorderCost.toLocaleString()}`,
          variant_ids: [item.variant_id],
          sku_list: [item.sku],
          urgency_score: urgencyScore,
          estimated_resolution_time: priority === 'critical' ? '24 hours' : '3 days',
          cash_recovery_potential: potentialLostRevenue,
          created_at: new Date(),
          requires_attention: true
        });
      }
      
      console.log(`   📦 Generated ${alerts.length} reorder alerts`);
      return alerts;
      
    } catch (error) {
      console.log('⚠️ Error generating reorder alerts:', error.message);
      return [];
    }
  }

  /**
   * Generate dead stock cash drain alerts
   */
  static async generateDeadStockAlerts(): Promise<CashAlert[]> {
    try {
      const deadStockItems = await db.query(`
        SELECT 
          v.id as variant_id,
          v.sku,
          v.price,
          v.cost,
          v.available_quantity,
          v.velocity_category,
          v.last_sale_date,
          v.margin_percentage,
          p.title as product_title
        FROM shopify_variants v
        JOIN shopify_products p ON v.product_id = p.id
        WHERE p.status = 'ACTIVE'
          AND v.sku IS NOT NULL
          AND v.velocity_category = 'dead'
          AND COALESCE(v.available_quantity, 0) >= 5
          AND COALESCE(v.price, 0) > 0
        ORDER BY (v.available_quantity * COALESCE(v.price, 0)) DESC
        LIMIT 15
      `);

      const alerts: CashAlert[] = [];
      
      if (deadStockItems.rows.length > 0) {
        const totalDeadValue = deadStockItems.rows.reduce((sum, item) => {
          return sum + (parseFloat(item.price) * parseInt(item.available_quantity));
        }, 0);
        
        const skuList = deadStockItems.rows.map(item => item.sku);
        const variantIds = deadStockItems.rows.map(item => item.variant_id);
        
        // Estimate potential recovery through clearance
        const estimatedRecovery = totalDeadValue * 0.6; // 60% recovery through aggressive clearance
        
        alerts.push({
          id: `dead_stock_${Date.now()}`,
          alert_type: 'dead_stock_drain',
          priority: 'high',
          title: `Dead Stock Cash Drain: ${deadStockItems.rows.length} Items`,
          message: `$${totalDeadValue.toLocaleString()} tied up in ${deadStockItems.rows.length} items with zero sales in 8+ weeks. This cash could be working elsewhere.`,
          cash_impact: totalDeadValue,
          suggested_action: `Implement aggressive clearance pricing to recover ~$${estimatedRecovery.toLocaleString()}. Use CFO Clearance Engine for optimal pricing.`,
          variant_ids: variantIds,
          sku_list: skuList,
          urgency_score: 75,
          estimated_resolution_time: '2-4 weeks',
          cash_recovery_potential: estimatedRecovery,
          created_at: new Date(),
          requires_attention: true
        });
      }
      
      console.log(`   💀 Generated ${alerts.length} dead stock alerts`);
      return alerts;
      
    } catch (error) {
      console.log('⚠️ Error generating dead stock alerts:', error.message);
      return [];
    }
  }

  /**
   * Generate seasonal urgency alerts
   */
  static async generateSeasonalAlerts(): Promise<CashAlert[]> {
    try {
      const seasonalItems = await db.query(`
        SELECT 
          v.id as variant_id,
          v.sku,
          v.price,
          v.available_quantity,
          v.seasonal_type,
          v.seasonal_end_date,
          v.velocity_category,
          p.title as product_title,
          (v.seasonal_end_date - CURRENT_DATE) as days_remaining
        FROM shopify_variants v
        JOIN shopify_products p ON v.product_id = p.id
        WHERE p.status = 'ACTIVE'
          AND v.sku IS NOT NULL
          AND v.seasonal_item = true
          AND v.seasonal_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '45 days'
          AND COALESCE(v.available_quantity, 0) >= 3
        ORDER BY v.seasonal_end_date ASC, (v.available_quantity * COALESCE(v.price, 0)) DESC
        LIMIT 20
      `);

      const alerts: CashAlert[] = [];
      
      // Group by seasonal type
      const seasonalGroups = new Map();
      for (const item of seasonalItems.rows) {
        const key = item.seasonal_type;
        if (!seasonalGroups.has(key)) {
          seasonalGroups.set(key, []);
        }
        seasonalGroups.get(key).push(item);
      }
      
      for (const [seasonType, items] of seasonalGroups) {
        const totalValue = items.reduce((sum: number, item: any) => {
          return sum + (parseFloat(item.price) * parseInt(item.available_quantity));
        }, 0);
        
        const avgDaysRemaining = items.reduce((sum: number, item: any) => sum + parseInt(item.days_remaining), 0) / items.length;
        const skuList = items.map((item: any) => item.sku);
        const variantIds = items.map((item: any) => item.variant_id);
        
        let priority: 'critical' | 'high' | 'medium' = 'medium';
        let urgencyScore = 60;
        
        if (avgDaysRemaining <= 14) {
          priority = 'critical';
          urgencyScore = 90;
        } else if (avgDaysRemaining <= 30) {
          priority = 'high';
          urgencyScore = 75;
        }
        
        alerts.push({
          id: `seasonal_${seasonType}_${Date.now()}`,
          alert_type: 'seasonal_urgent',
          priority,
          title: `Seasonal Clearance Urgent: ${seasonType.toUpperCase()}`,
          message: `${items.length} ${seasonType} items ($${totalValue.toLocaleString()}) expire in ${avgDaysRemaining.toFixed(0)} days. Risk of 100% loss if not sold.`,
          cash_impact: totalValue,
          suggested_action: `Implement emergency seasonal clearance. Start with 30-50% discounts and increase weekly until sold.`,
          variant_ids: variantIds,
          sku_list: skuList,
          urgency_score: urgencyScore,
          estimated_resolution_time: `${Math.ceil(avgDaysRemaining / 7)} weeks`,
          cash_recovery_potential: totalValue * 0.4, // 40% recovery vs total loss
          created_at: new Date(),
          requires_attention: true
        });
      }
      
      console.log(`   🎃 Generated ${alerts.length} seasonal alerts`);
      return alerts;
      
    } catch (error) {
      console.log('⚠️ Error generating seasonal alerts:', error.message);
      return [];
    }
  }

  /**
   * Generate cash opportunity alerts (clearance recommendations)
   */
  static async generateOpportunityAlerts(): Promise<CashAlert[]> {
    try {
      // Get clearance recommendations from pricing engine
      const clearanceBatch = await ClearancePricingEngine.generateClearanceRecommendations(10);
      
      const alerts: CashAlert[] = [];
      
      if (clearanceBatch.total_items > 0 && clearanceBatch.total_potential_recovery > 0) {
        const skuList = clearanceBatch.items.map(item => item.sku);
        const variantIds = clearanceBatch.items.map(item => item.variant_id);
        
        alerts.push({
          id: `opportunity_clearance_${Date.now()}`,
          alert_type: 'cash_opportunity',
          priority: 'medium',
          title: `Cash Recovery Opportunity: ${clearanceBatch.total_items} Items`,
          message: `Optimize pricing on ${clearanceBatch.total_items} slow-moving items to recover $${clearanceBatch.total_potential_recovery.toLocaleString()} in ${clearanceBatch.estimated_clearance_time} weeks.`,
          cash_impact: 0, // Positive opportunity
          suggested_action: `Apply CFO clearance pricing (avg ${clearanceBatch.avg_discount.toFixed(1)}% discount) to accelerate inventory turnover.`,
          variant_ids: variantIds,
          sku_list: skuList,
          urgency_score: 50,
          estimated_resolution_time: `${clearanceBatch.estimated_clearance_time} weeks`,
          cash_recovery_potential: clearanceBatch.total_potential_recovery,
          created_at: new Date(),
          requires_attention: false
        });
      }
      
      console.log(`   💰 Generated ${alerts.length} opportunity alerts`);
      return alerts;
      
    } catch (error) {
      console.log('⚠️ Error generating opportunity alerts:', error.message);
      return [];
    }
  }

  /**
   * Generate margin protection alerts
   */
  static async generateMarginProtectionAlerts(): Promise<CashAlert[]> {
    try {
      const marginRisks = await db.query(`
        SELECT 
          v.id as variant_id,
          v.sku,
          v.price,
          v.cost,
          v.margin_percentage,
          v.velocity_category,
          p.title as product_title,
          p.vendor
        FROM shopify_variants v
        JOIN shopify_products p ON v.product_id = p.id
        WHERE p.status = 'ACTIVE'
          AND v.sku IS NOT NULL
          AND COALESCE(v.margin_percentage, 0) < 30
          AND COALESCE(v.price, 0) > 0
          AND v.velocity_category IN ('fast', 'medium')
        ORDER BY v.margin_percentage ASC
        LIMIT 10
      `);

      const alerts: CashAlert[] = [];
      
      if (marginRisks.rows.length > 0) {
        const lowMarginItems = marginRisks.rows.filter(item => parseFloat(item.margin_percentage) < 20);
        const criticalItems = marginRisks.rows.filter(item => parseFloat(item.margin_percentage) < 10);
        
        if (criticalItems.length > 0) {
          alerts.push({
            id: `margin_critical_${Date.now()}`,
            alert_type: 'margin_protection',
            priority: 'critical',
            title: `Critical Margin Alert: ${criticalItems.length} Items`,
            message: `${criticalItems.length} fast-selling items have margins below 10%. These are losing money after overhead costs.`,
            cash_impact: 0, // Need analysis
            suggested_action: `Review pricing immediately. Consider supplier negotiation or price increases.`,
            variant_ids: criticalItems.map(item => item.variant_id),
            sku_list: criticalItems.map(item => item.sku),
            urgency_score: 85,
            estimated_resolution_time: '1 week',
            cash_recovery_potential: 0,
            created_at: new Date(),
            requires_attention: true
          });
        }
        
        if (lowMarginItems.length > criticalItems.length) {
          const nonCriticalLowMargin = lowMarginItems.filter(item => parseFloat(item.margin_percentage) >= 10);
          
          alerts.push({
            id: `margin_warning_${Date.now()}`,
            alert_type: 'margin_protection',
            priority: 'medium',
            title: `Low Margin Warning: ${nonCriticalLowMargin.length} Items`,
            message: `${nonCriticalLowMargin.length} items have margins below 20%. Monitor for profitability risk.`,
            cash_impact: 0,
            suggested_action: `Review supplier costs and consider strategic price adjustments.`,
            variant_ids: nonCriticalLowMargin.map(item => item.variant_id),
            sku_list: nonCriticalLowMargin.map(item => item.sku),
            urgency_score: 40,
            estimated_resolution_time: '2 weeks',
            cash_recovery_potential: 0,
            created_at: new Date(),
            requires_attention: false
          });
        }
      }
      
      console.log(`   📊 Generated ${alerts.length} margin protection alerts`);
      return alerts;
      
    } catch (error) {
      console.log('⚠️ Error generating margin alerts:', error.message);
      return [];
    }
  }

  /**
   * Generate comprehensive cash impact summary
   */
  static async generateCashImpactSummary(): Promise<CashImpactSummary> {
    try {
      const alerts = await this.generateAlerts();
      
      const criticalAlerts = alerts.filter(a => a.priority === 'critical');
      const totalCashAtRisk = alerts.reduce((sum, a) => sum + a.cash_impact, 0);
      const recoveryOpportunities = alerts.filter(a => a.cash_recovery_potential > 0);
      const totalRecoveryPotential = recoveryOpportunities.reduce((sum, a) => sum + a.cash_recovery_potential, 0);
      
      // Get cash status
      const cashStatus = await QuickBooksCashManager.getCurrentCashStatus();
      
      // Calculate burn rate (simplified)
      const weeklyBurnRate = 5000; // Would be calculated from actual expenses
      const netCash = cashStatus.available_cash - cashStatus.pending_payables;
      const weeksOfRunway = netCash > 0 ? Math.floor(netCash / weeklyBurnRate) : 0;
      
      // Generate immediate actions
      const immediateActions: string[] = [];
      if (criticalAlerts.length > 0) {
        immediateActions.push(`Address ${criticalAlerts.length} critical alerts immediately`);
      }
      if (totalRecoveryPotential > 10000) {
        immediateActions.push(`Implement clearance pricing to recover $${totalRecoveryPotential.toLocaleString()}`);
      }
      if (cashStatus.cash_adequacy_status === 'critical') {
        immediateActions.push('Emergency cash conservation measures required');
      }
      
      return {
        total_alerts: alerts.length,
        critical_alerts: criticalAlerts.length,
        total_cash_at_risk: totalCashAtRisk,
        recovery_opportunities: recoveryOpportunities.length,
        total_recovery_potential: totalRecoveryPotential,
        cash_adequacy: cashStatus.cash_adequacy_status,
        recommended_immediate_actions: immediateActions,
        weekly_burn_rate: weeklyBurnRate,
        weeks_of_runway: weeksOfRunway
      };
      
    } catch (error) {
      console.error('❌ Error generating cash impact summary:', error);
      throw error;
    }
  }

  /**
   * Store alerts in database
   */
  static async storeAlerts(alerts: CashAlert[]): Promise<void> {
    try {
      for (const alert of alerts) {
        await db.query(`
          INSERT INTO inventory_alerts (
            product_id, variant_id, alert_type, cash_impact_score, 
            priority_level, suggested_action, reasoning, vendor_name, 
            order_value, alert_date, acknowledged
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          alert.variant_ids[0] || null, // First variant as product reference
          alert.variant_ids[0] || null,
          alert.alert_type,
          alert.urgency_score,
          alert.priority,
          alert.suggested_action,
          alert.message,
          'System', // vendor_name
          alert.cash_impact,
          alert.created_at,
          false
        ]);
      }
      
      console.log(`   📁 Stored ${alerts.length} alerts in database`);
      
    } catch (error) {
      console.log('⚠️ Error storing alerts:', error.message);
    }
  }

  /**
   * Get alerts requiring immediate attention
   */
  static async getUrgentAlerts(): Promise<CashAlert[]> {
    try {
      const alerts = await this.generateAlerts();
      return alerts.filter(a => a.requires_attention && a.priority !== 'low');
    } catch (error) {
      console.error('❌ Error getting urgent alerts:', error);
      return [];
    }
  }
}