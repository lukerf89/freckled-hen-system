/**
 * CFO Clearance Pricing Engine
 * Implements aggressive cash-recovery pricing using multi-factor analysis
 * Integrates SKU classification, sales velocity, and cash impact scoring
 */

import { db } from '../db/connection';
import { QuickBooksCashManager } from '../integrations/quickbooks-cash';

export interface ClearancePricingRecommendation {
  variant_id: number;
  sku: string;
  current_price: number;
  recommended_price: number;
  discount_percentage: number;
  clearance_tier: string;
  reasoning: string;
  urgency_score: number;
  cash_recovery_potential: number;
  profit_protection_threshold: number;
  seasonal_urgency: boolean;
  days_to_seasonal_end?: number;
}

export interface ClearanceBatch {
  batch_id: string;
  items: ClearancePricingRecommendation[];
  total_potential_recovery: number;
  total_items: number;
  avg_discount: number;
  cash_impact_score: number;
  estimated_clearance_time: number; // weeks
}

export interface PricingMode {
  mode: 'aggressive' | 'conservative' | 'emergency';
  cash_urgency: 'safe' | 'tight' | 'critical';
  seasonal_pressure: boolean;
  description: string;
}

export class ClearancePricingEngine {

  /**
   * Generate clearance pricing recommendations for all eligible items
   */
  static async generateClearanceRecommendations(
    maxItems: number = 100,
    forcedMode?: 'aggressive' | 'conservative' | 'emergency'
  ): Promise<ClearanceBatch> {
    console.log('💰 CFO Clearance Pricing Engine: Generating recommendations...');
    
    try {
      // 1. Determine pricing mode based on cash situation
      const pricingMode = await this.determinePricingMode(forcedMode);
      console.log(`📊 Pricing Mode: ${pricingMode.mode.toUpperCase()} (${pricingMode.description})`);

      // 2. Get eligible items for clearance
      const eligibleItems = await this.getEligibleClearanceItems(maxItems);
      console.log(`🔍 Found ${eligibleItems.length} eligible items for clearance`);

      if (eligibleItems.length === 0) {
        return {
          batch_id: `empty_${Date.now()}`,
          items: [],
          total_potential_recovery: 0,
          total_items: 0,
          avg_discount: 0,
          cash_impact_score: 0,
          estimated_clearance_time: 0
        };
      }

      // 3. Calculate pricing recommendations for each item
      const recommendations: ClearancePricingRecommendation[] = [];
      let totalRecovery = 0;
      let totalDiscounts = 0;

      for (const item of eligibleItems) {
        const recommendation = await this.calculateItemPricing(item, pricingMode);
        recommendations.push(recommendation);
        totalRecovery += recommendation.cash_recovery_potential;
        totalDiscounts += recommendation.discount_percentage;
      }

      // 4. Sort by urgency and cash impact
      recommendations.sort((a, b) => {
        // Primary: Seasonal urgency
        if (a.seasonal_urgency && !b.seasonal_urgency) return -1;
        if (!a.seasonal_urgency && b.seasonal_urgency) return 1;
        
        // Secondary: Urgency score
        if (b.urgency_score !== a.urgency_score) {
          return b.urgency_score - a.urgency_score;
        }
        
        // Tertiary: Cash recovery potential
        return b.cash_recovery_potential - a.cash_recovery_potential;
      });

      const batch: ClearanceBatch = {
        batch_id: `clearance_${Date.now()}`,
        items: recommendations,
        total_potential_recovery: totalRecovery,
        total_items: recommendations.length,
        avg_discount: totalDiscounts / recommendations.length,
        cash_impact_score: await this.calculateBatchCashImpact(recommendations),
        estimated_clearance_time: await this.estimateClearanceTime(recommendations)
      };

      console.log(`✅ Generated ${batch.total_items} clearance recommendations`);
      console.log(`💵 Total recovery potential: $${batch.total_potential_recovery.toLocaleString()}`);
      console.log(`📉 Average discount: ${batch.avg_discount.toFixed(1)}%`);

      return batch;

    } catch (error) {
      console.error('❌ Clearance pricing generation failed:', error);
      throw error;
    }
  }

  /**
   * Determine optimal pricing mode based on cash status and seasonal pressure
   */
  static async determinePricingMode(forcedMode?: string): Promise<PricingMode> {
    try {
      // Get current cash status
      const cashStatus = await QuickBooksCashManager.getCurrentCashStatus();
      
      // Check seasonal pressure (Q4 items approaching end dates)
      const seasonalPressure = await this.assessSeasonalPressure();
      
      // Override if mode is forced
      if (forcedMode) {
        return {
          mode: forcedMode as any,
          cash_urgency: cashStatus.cash_adequacy_status,
          seasonal_pressure: seasonalPressure,
          description: `Forced ${forcedMode} mode`
        };
      }

      // Determine mode based on cash adequacy and seasonal pressure
      let mode: 'aggressive' | 'conservative' | 'emergency';
      let description: string;

      if (cashStatus.cash_adequacy_status === 'critical') {
        mode = 'emergency';
        description = 'Emergency cash recovery needed';
      } else if (cashStatus.cash_adequacy_status === 'tight' || seasonalPressure) {
        mode = 'aggressive';
        description = seasonalPressure ? 
          'Aggressive seasonal clearance' : 
          'Aggressive cash generation';
      } else {
        mode = 'conservative';
        description = 'Conservative profit protection';
      }

      return {
        mode,
        cash_urgency: cashStatus.cash_adequacy_status,
        seasonal_pressure: seasonalPressure,
        description
      };

    } catch (error) {
      console.log('⚠️ Error determining pricing mode, defaulting to conservative');
      return {
        mode: 'conservative',
        cash_urgency: 'safe',
        seasonal_pressure: false,
        description: 'Default conservative mode'
      };
    }
  }

  /**
   * Assess if there's seasonal pressure (items approaching end dates)
   */
  static async assessSeasonalPressure(): Promise<boolean> {
    try {
      const result = await db.query(`
        SELECT COUNT(*) as seasonal_urgent
        FROM shopify_variants 
        WHERE seasonal_item = true 
          AND seasonal_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
          AND available_quantity > 0
      `);
      
      const urgentCount = parseInt(result.rows[0]?.seasonal_urgent) || 0;
      return urgentCount > 50; // Pressure if 50+ items ending soon
      
    } catch (error) {
      console.log('⚠️ Error assessing seasonal pressure:', error.message);
      return false;
    }
  }

  /**
   * Get items eligible for clearance pricing
   */
  static async getEligibleClearanceItems(maxItems: number): Promise<any[]> {
    try {
      // Multi-criteria selection for clearance candidates
      const items = await db.query(`
        SELECT 
          v.id as variant_id,
          v.sku,
          v.price,
          v.cost,
          v.available_quantity,
          v.margin_percentage,
          v.velocity_category,
          v.weeks_of_stock,
          v.seasonal_item,
          v.seasonal_type,
          v.seasonal_end_date,
          v.clearance_tier,
          v.profit_protection_threshold,
          v.cash_impact_score,
          v.weekly_sales_units,
          v.last_sale_date,
          v.q4_item,
          p.title as product_title,
          p.vendor
        FROM shopify_variants v
        JOIN shopify_products p ON v.product_id = p.id
        WHERE p.status = 'ACTIVE'
          AND v.sku IS NOT NULL
          AND v.available_quantity > 0
          AND COALESCE(v.price, 0) > 0
          AND (
            -- Dead stock (no sales in 8+ weeks)
            v.velocity_category = 'dead'
            -- Slow movers with high inventory
            OR (v.velocity_category = 'slow' AND v.available_quantity >= 10)
            -- Seasonal items approaching end date
            OR (v.seasonal_item = true AND v.seasonal_end_date <= CURRENT_DATE + INTERVAL '60 days')
            -- High inventory weeks of stock
            OR (COALESCE(v.weeks_of_stock, 0) > 20)
            -- Low cash impact but taking space
            OR (v.available_quantity >= 20 AND COALESCE(v.weekly_sales_units, 0) < 0.5)
          )
        ORDER BY 
          -- Prioritize seasonal urgency
          CASE WHEN v.seasonal_item = true AND v.seasonal_end_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 ELSE 2 END,
          -- Then by cash impact potential
          v.cash_impact_score DESC,
          -- Then by inventory value (high-value items first)
          (v.available_quantity * COALESCE(v.price, 0)) DESC
        LIMIT $1
      `, [maxItems]);

      return items.rows;

    } catch (error) {
      console.error('❌ Error getting eligible clearance items:', error);
      throw error;
    }
  }

  /**
   * Calculate specific pricing recommendation for an item
   */
  static async calculateItemPricing(
    item: any, 
    pricingMode: PricingMode
  ): Promise<ClearancePricingRecommendation> {
    const {
      variant_id,
      sku,
      price,
      cost,
      available_quantity,
      margin_percentage,
      velocity_category,
      weeks_of_stock,
      seasonal_item,
      seasonal_type,
      seasonal_end_date,
      profit_protection_threshold,
      cash_impact_score,
      weekly_sales_units,
      last_sale_date
    } = item;

    const currentPrice = parseFloat(price) || 0;
    const wholesaleCost = parseFloat(cost) || 0;
    const margin = parseFloat(margin_percentage) || 0;
    const quantity = parseInt(available_quantity) || 0;
    const protectionThreshold = parseFloat(profit_protection_threshold) || 25;

    // 1. Determine base discount based on item characteristics
    let baseDiscount = 0;
    let clearanceTier = 'standard_clearance';
    let urgencyScore = 50;

    // Category-based base discounts
    if (velocity_category === 'dead') {
      baseDiscount = 40;
      urgencyScore = 90;
      clearanceTier = 'dead_stock_liquidation';
    } else if (velocity_category === 'slow') {
      baseDiscount = 25;
      urgencyScore = 70;
      clearanceTier = 'slow_mover_clearance';
    } else if (seasonal_item) {
      baseDiscount = 30;
      urgencyScore = 80;
      clearanceTier = 'seasonal_clearance';
    } else {
      baseDiscount = 15;
      urgencyScore = 40;
      clearanceTier = 'standard_clearance';
    }

    // 2. Apply pricing mode adjustments
    let modeMultiplier = 1.0;
    switch (pricingMode.mode) {
      case 'emergency':
        modeMultiplier = 1.8; // Up to 80% more aggressive
        urgencyScore += 30;
        break;
      case 'aggressive':
        modeMultiplier = 1.4; // Up to 40% more aggressive
        urgencyScore += 15;
        break;
      case 'conservative':
        modeMultiplier = 0.7; // 30% less aggressive
        urgencyScore -= 10;
        break;
    }

    baseDiscount *= modeMultiplier;

    // 3. Seasonal urgency boost
    let seasonalUrgency = false;
    let daysToSeasonalEnd = 0;
    
    if (seasonal_item && seasonal_end_date) {
      const endDate = new Date(seasonal_end_date);
      const today = new Date();
      daysToSeasonalEnd = Math.max(0, Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
      
      if (daysToSeasonalEnd <= 30) {
        seasonalUrgency = true;
        const seasonalBoost = Math.max(0, (30 - daysToSeasonalEnd) / 30 * 25); // Up to 25% boost
        baseDiscount += seasonalBoost;
        urgencyScore += 20;
      }
    }

    // 4. Inventory pressure adjustment
    if (quantity > 50) {
      baseDiscount += 10; // High inventory gets extra discount
      urgencyScore += 10;
    } else if (quantity > 20) {
      baseDiscount += 5;
      urgencyScore += 5;
    }

    // 5. Apply profit protection limits
    const finalDiscount = Math.min(baseDiscount, protectionThreshold);
    const recommendedPrice = currentPrice * (1 - finalDiscount / 100);

    // 6. Calculate cash recovery potential
    const estimatedWeeklySales = this.estimateWeeklySalesWithDiscount(
      parseFloat(weekly_sales_units) || 0,
      finalDiscount,
      velocity_category
    );
    
    const cashRecoveryPotential = Math.min(quantity, estimatedWeeklySales * 8) * recommendedPrice;

    // 7. Generate reasoning
    let reasoning = `${clearanceTier.replace(/_/g, ' ')} (${pricingMode.mode} mode)`;
    if (seasonalUrgency) {
      reasoning += `, ${daysToSeasonalEnd} days until season end`;
    }
    if (velocity_category === 'dead') {
      reasoning += ', zero sales in 8+ weeks';
    }
    if (quantity > 20) {
      reasoning += `, high inventory (${quantity} units)`;
    }

    return {
      variant_id,
      sku: sku || '',
      current_price: currentPrice,
      recommended_price: Math.round(recommendedPrice * 100) / 100,
      discount_percentage: Math.round(finalDiscount * 100) / 100,
      clearance_tier: clearanceTier,
      reasoning,
      urgency_score: Math.min(100, Math.max(0, urgencyScore)),
      cash_recovery_potential: Math.round(cashRecoveryPotential),
      profit_protection_threshold: protectionThreshold,
      seasonal_urgency: seasonalUrgency,
      days_to_seasonal_end: seasonalUrgency ? daysToSeasonalEnd : undefined
    };
  }

  /**
   * Estimate weekly sales with applied discount
   */
  static estimateWeeklySalesWithDiscount(
    currentWeeklySales: number,
    discountPercentage: number,
    velocityCategory: string
  ): number {
    let baseMultiplier = 1.0;
    
    // Different categories respond differently to discounts
    switch (velocityCategory) {
      case 'dead':
        baseMultiplier = 3.0; // Dead stock can see big jumps
        break;
      case 'slow':
        baseMultiplier = 2.0; // Slow items get good boost
        break;
      case 'medium':
        baseMultiplier = 1.5; // Medium items get moderate boost
        break;
      case 'fast':
        baseMultiplier = 1.2; // Fast items already selling well
        break;
      default:
        baseMultiplier = 1.5;
    }

    // Discount-based multiplier (diminishing returns)
    const discountMultiplier = 1 + (discountPercentage / 100) * baseMultiplier;
    
    // For dead stock, ensure minimum movement
    if (currentWeeklySales === 0 && velocityCategory === 'dead') {
      return Math.max(0.5, discountPercentage / 20); // At least some movement
    }

    return currentWeeklySales * discountMultiplier;
  }

  /**
   * Calculate overall cash impact for a batch
   */
  static async calculateBatchCashImpact(recommendations: ClearancePricingRecommendation[]): Promise<number> {
    let totalImpact = 0;
    
    for (const rec of recommendations) {
      // Weight by urgency and recovery potential
      const impact = rec.cash_recovery_potential * (rec.urgency_score / 100);
      totalImpact += impact;
    }
    
    return Math.round(totalImpact);
  }

  /**
   * Estimate time to clear inventory
   */
  static async estimateClearanceTime(recommendations: ClearancePricingRecommendation[]): Promise<number> {
    if (recommendations.length === 0) return 0;
    
    // Average weeks based on urgency scores
    const avgUrgency = recommendations.reduce((sum, rec) => sum + rec.urgency_score, 0) / recommendations.length;
    
    // Higher urgency = faster clearance
    if (avgUrgency >= 80) return 2; // 2 weeks for high urgency
    if (avgUrgency >= 60) return 4; // 4 weeks for medium urgency
    if (avgUrgency >= 40) return 8; // 8 weeks for lower urgency
    
    return 12; // 12 weeks for low urgency items
  }

  /**
   * Apply clearance pricing to Shopify (preview mode)
   */
  static async previewClearanceBatch(batchId: string): Promise<{
    success: boolean;
    preview: any[];
    totalImpact: string;
  }> {
    try {
      // This would integrate with Shopify to preview price changes
      // For now, return a preview structure
      
      return {
        success: true,
        preview: [
          'This would connect to Shopify Admin API',
          'Preview price changes before applying',
          'Track clearance performance',
          'Generate clearance reports'
        ],
        totalImpact: 'Ready for Shopify integration'
      };
      
    } catch (error) {
      console.error('❌ Error previewing clearance batch:', error);
      throw error;
    }
  }

  /**
   * Get clearance pricing statistics
   */
  static async getClearanceStats(): Promise<any> {
    try {
      const stats = await db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE velocity_category = 'dead') as dead_stock_items,
          COUNT(*) FILTER (WHERE velocity_category = 'slow' AND available_quantity >= 10) as slow_overstocked,
          COUNT(*) FILTER (WHERE v.seasonal_item = true AND v.seasonal_end_date <= CURRENT_DATE + INTERVAL '30 days') as seasonal_urgent,
          COUNT(*) FILTER (WHERE COALESCE(weeks_of_stock, 0) > 20) as excess_inventory,
          SUM(available_quantity * COALESCE(price, 0)) FILTER (WHERE velocity_category = 'dead') as dead_stock_value,
          AVG(margin_percentage) FILTER (WHERE velocity_category = 'dead') as avg_dead_margin,
          COUNT(*) as total_active_variants
        FROM shopify_variants v
        JOIN shopify_products p ON v.product_id = p.id
        WHERE p.status = 'ACTIVE' 
          AND v.sku IS NOT NULL 
          AND v.available_quantity > 0
      `);

      return stats.rows[0];
      
    } catch (error) {
      console.error('❌ Error getting clearance stats:', error);
      throw error;
    }
  }
}