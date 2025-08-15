/**
 * Sales Velocity Calculator
 * Tracks weekly sales patterns and calculates velocity metrics for dynamic pricing
 * Integrates with SKU Classification for comprehensive profitability intelligence
 */

import { db } from '../db/connection';
import { ShopifyClient } from '../shopify/client';

export interface SalesVelocityData {
  variant_id: number;
  sku: string;
  weekly_sales_units: number;
  weekly_sales_revenue: number;
  velocity_category: 'fast' | 'medium' | 'slow' | 'dead';
  weeks_of_stock: number;
  reorder_urgency: 'critical' | 'high' | 'medium' | 'low';
  price_elasticity_score: number;
  last_sale_date: Date | null;
  trend_direction: 'increasing' | 'stable' | 'declining';
}

export interface VelocityStats {
  totalVariants: number;
  fastMovers: number;
  mediumMovers: number;
  slowMovers: number;
  deadStock: number;
  criticalReorders: number;
  averageVelocity: number;
  totalWeeklyRevenue: number;
}

export class SalesVelocityCalculator {

  /**
   * Calculate sales velocity for all variants using Shopify order data
   */
  static async calculateAllVelocities(): Promise<{ stats: VelocityStats; processed: number }> {
    console.log('📈 Sales Velocity Calculator: Starting velocity analysis...');
    
    try {
      // First, get recent order data from Shopify (last 8 weeks for trend analysis)
      console.log('🛒 Fetching recent order data from Shopify...');
      const salesData = await this.fetchRecentSalesData();
      
      console.log(`📊 Processing velocity for ${salesData.length} variants with sales data...`);

      // Get all variants to calculate velocity (including zero-sales variants)
      const allVariants = await db.query(`
        SELECT 
          v.id as variant_id,
          v.sku,
          v.price,
          v.available_quantity,
          v.cost,
          p.title as product_title,
          v.title as variant_title
        FROM shopify_variants v
        JOIN shopify_products p ON v.product_id = p.id
        WHERE p.status = 'ACTIVE' 
          AND v.sku IS NOT NULL 
          AND v.sku != ''
        ORDER BY v.id
      `);

      console.log(`🔍 Calculating velocity for ${allVariants.rows.length} total variants...`);

      let stats: VelocityStats = {
        totalVariants: 0,
        fastMovers: 0,
        mediumMovers: 0,
        slowMovers: 0,
        deadStock: 0,
        criticalReorders: 0,
        averageVelocity: 0,
        totalWeeklyRevenue: 0
      };

      let totalVelocity = 0;
      let batchCount = 0;
      const batchSize = 100;

      // Process in batches for performance
      for (let i = 0; i < allVariants.rows.length; i += batchSize) {
        const batch = allVariants.rows.slice(i, i + batchSize);
        batchCount++;
        
        console.log(`⚡ Processing velocity batch ${batchCount}: variants ${i + 1}-${Math.min(i + batchSize, allVariants.rows.length)}`);
        
        for (const variant of batch) {
          try {
            // Find sales data for this variant
            const variantSales = salesData.filter(sale => sale.variant_id === variant.variant_id);
            
            // Calculate velocity metrics
            const velocityData = this.calculateVariantVelocity(variant, variantSales);
            
            // Update database with velocity data
            await this.updateVariantVelocity(variant.variant_id, velocityData);
            
            // Update stats
            stats.totalVariants++;
            totalVelocity += velocityData.weekly_sales_units;
            stats.totalWeeklyRevenue += velocityData.weekly_sales_revenue;
            
            switch (velocityData.velocity_category) {
              case 'fast': stats.fastMovers++; break;
              case 'medium': stats.mediumMovers++; break;
              case 'slow': stats.slowMovers++; break;
              case 'dead': stats.deadStock++; break;
            }
            
            if (velocityData.reorder_urgency === 'critical') {
              stats.criticalReorders++;
            }
            
          } catch (error) {
            console.error(`❌ Error calculating velocity for variant ${variant.variant_id}:`, error.message);
          }
        }
        
        // Progress update every 5 batches
        if (batchCount % 5 === 0) {
          console.log(`   📈 Progress: ${stats.totalVariants}/${allVariants.rows.length} variants processed`);
        }
      }

      // Calculate final stats
      stats.averageVelocity = stats.totalVariants > 0 ? totalVelocity / stats.totalVariants : 0;

      console.log(`✅ Sales Velocity Analysis Complete! Processed ${stats.totalVariants} variants`);
      
      return { 
        stats, 
        processed: stats.totalVariants 
      };

    } catch (error) {
      console.error('❌ Sales velocity calculation failed:', error);
      throw error;
    }
  }

  /**
   * Fetch recent sales data from Shopify (last 8 weeks)
   */
  static async fetchRecentSalesData(): Promise<any[]> {
    try {
      const eightWeeksAgo = new Date();
      eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56); // 8 weeks * 7 days
      
      const createdAtMinStr = eightWeeksAgo.toISOString();
      
      const query = `
        query GetRecentOrders {
          orders(first: 250, query: "created_at:>='${createdAtMinStr}' AND financial_status:paid") {
            edges {
              node {
                id
                createdAt
                processedAt
                financialStatus
                fulfillmentStatus
                lineItems(first: 100) {
                  edges {
                    node {
                      variant {
                        id
                        sku
                      }
                      quantity
                      originalUnitPriceSet {
                        shopMoney {
                          amount
                        }
                      }
                    }
                  }
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;

      let allSalesData: any[] = [];
      let hasNextPage = true;
      let cursor = null;
      let pageCount = 0;

      while (hasNextPage && pageCount < 20) { // Limit to prevent runaway
        console.log(`   📦 Fetching orders page ${pageCount + 1}...`);
        const shopifyClient = new ShopifyClient();
        const response = await shopifyClient.getClient().request(query) as any;
        
        if (response.orders?.edges) {
          // Process orders into sales data
          for (const orderEdge of response.orders.edges) {
            const order = orderEdge.node;
            
            // Only include paid orders
            if (order.financialStatus === 'paid') {
              for (const lineItemEdge of order.lineItems.edges) {
                const lineItem = lineItemEdge.node;
                
                if (lineItem.variant && lineItem.variant.id) {
                  allSalesData.push({
                    variant_id: parseInt(lineItem.variant.id.replace('gid://shopify/ProductVariant/', '')),
                    sku: lineItem.variant.sku,
                    quantity_sold: lineItem.quantity,
                    unit_price: parseFloat(lineItem.originalUnitPriceSet.shopMoney.amount),
                    sale_revenue: lineItem.quantity * parseFloat(lineItem.originalUnitPriceSet.shopMoney.amount),
                    order_date: new Date(order.createdAt),
                    week_of_year: this.getWeekOfYear(new Date(order.createdAt))
                  });
                }
              }
            }
          }
          
          hasNextPage = response.orders.pageInfo.hasNextPage;
          cursor = response.orders.pageInfo.endCursor;
          pageCount++;
        } else {
          hasNextPage = false;
        }
      }

      console.log(`   ✅ Fetched ${allSalesData.length} line items from ${pageCount} pages of orders`);
      
      // Group by variant and sum weekly totals
      const weeklySalesMap = new Map();
      
      for (const sale of allSalesData) {
        const key = `${sale.variant_id}`;
        if (!weeklySalesMap.has(key)) {
          weeklySalesMap.set(key, {
            variant_id: sale.variant_id,
            sku: sale.sku,
            total_units: 0,
            total_revenue: 0,
            sales_weeks: new Set(),
            last_sale_date: null
          });
        }
        
        const existing = weeklySalesMap.get(key);
        existing.total_units += sale.quantity_sold;
        existing.total_revenue += sale.sale_revenue;
        existing.sales_weeks.add(sale.week_of_year);
        
        if (!existing.last_sale_date || sale.order_date > existing.last_sale_date) {
          existing.last_sale_date = sale.order_date;
        }
      }

      // Convert to array and calculate weekly averages
      const result = Array.from(weeklySalesMap.values()).map(data => ({
        ...data,
        weekly_sales_units: data.total_units / 8, // Average over 8 weeks
        weekly_sales_revenue: data.total_revenue / 8,
        sales_frequency: data.sales_weeks.size // How many different weeks had sales
      }));

      console.log(`   📊 Processed into ${result.length} unique variants with sales data`);
      return result;

    } catch (error) {
      console.error('❌ Error fetching Shopify sales data:', error);
      throw error;
    }
  }

  /**
   * Calculate velocity metrics for a single variant
   */
  static calculateVariantVelocity(variant: any, salesData: any[]): SalesVelocityData {
    const { variant_id, sku, price, available_quantity } = variant;
    
    // Aggregate sales data for this variant
    const totalUnits = salesData.reduce((sum, sale) => sum + (sale.total_units || 0), 0);
    const totalRevenue = salesData.reduce((sum, sale) => sum + (sale.total_revenue || 0), 0);
    const weeklyUnits = salesData.length > 0 ? salesData[0].weekly_sales_units || 0 : 0;
    const weeklyRevenue = salesData.length > 0 ? salesData[0].weekly_sales_revenue || 0 : 0;
    const lastSaleDate = salesData.length > 0 ? salesData[0].last_sale_date : null;
    const salesFrequency = salesData.length > 0 ? salesData[0].sales_frequency || 0 : 0;

    // 1. Determine velocity category
    let velocity_category: 'fast' | 'medium' | 'slow' | 'dead';
    if (weeklyUnits >= 2) {
      velocity_category = 'fast';     // 2+ units per week
    } else if (weeklyUnits >= 0.5) {
      velocity_category = 'medium';   // 0.5-2 units per week  
    } else if (weeklyUnits > 0) {
      velocity_category = 'slow';     // Some sales but <0.5 per week
    } else {
      velocity_category = 'dead';     // No sales in 8 weeks
    }

    // 2. Calculate weeks of stock remaining
    const currentStock = parseInt(available_quantity) || 0;
    let weeks_of_stock = 0;
    if (weeklyUnits > 0) {
      weeks_of_stock = currentStock / weeklyUnits;
    } else if (currentStock > 0) {
      weeks_of_stock = 999; // Effectively infinite for dead stock
    }

    // 3. Determine reorder urgency
    let reorder_urgency: 'critical' | 'high' | 'medium' | 'low';
    if (velocity_category === 'fast' && weeks_of_stock <= 4) {
      reorder_urgency = 'critical';
    } else if (velocity_category === 'fast' && weeks_of_stock <= 8) {
      reorder_urgency = 'high';
    } else if (velocity_category === 'medium' && weeks_of_stock <= 12) {
      reorder_urgency = 'medium';
    } else {
      reorder_urgency = 'low';
    }

    // 4. Calculate price elasticity score (simplified)
    // Higher score = more price sensitive (can handle deeper discounts)
    let price_elasticity_score = 50; // Base score
    if (velocity_category === 'dead') price_elasticity_score = 90;      // Dead stock = very elastic
    else if (velocity_category === 'slow') price_elasticity_score = 75; // Slow = fairly elastic
    else if (velocity_category === 'medium') price_elasticity_score = 60; // Medium = moderately elastic
    else if (velocity_category === 'fast') price_elasticity_score = 30;  // Fast = less elastic

    // 5. Determine trend direction
    let trend_direction: 'increasing' | 'stable' | 'declining';
    if (salesFrequency >= 6) {
      trend_direction = 'increasing';  // Sales in 6+ weeks = consistent/growing
    } else if (salesFrequency >= 3) {
      trend_direction = 'stable';      // Sales in 3-5 weeks = stable
    } else {
      trend_direction = 'declining';   // Sales in <3 weeks = declining
    }

    return {
      variant_id,
      sku: sku || '',
      weekly_sales_units: Math.round(weeklyUnits * 100) / 100,
      weekly_sales_revenue: Math.round(weeklyRevenue * 100) / 100,
      velocity_category,
      weeks_of_stock: Math.round(weeks_of_stock * 10) / 10,
      reorder_urgency,
      price_elasticity_score,
      last_sale_date: lastSaleDate,
      trend_direction
    };
  }

  /**
   * Update variant with velocity data
   */
  static async updateVariantVelocity(variantId: number, velocityData: SalesVelocityData): Promise<void> {
    await db.query(`
      UPDATE shopify_variants SET
        weekly_sales_units = $1,
        weekly_sales_revenue = $2,
        velocity_category = $3,
        weeks_of_stock = $4,
        reorder_urgency = $5,
        price_elasticity_score = $6,
        last_sale_date = $7,
        trend_direction = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
    `, [
      velocityData.weekly_sales_units,
      velocityData.weekly_sales_revenue,
      velocityData.velocity_category,
      velocityData.weeks_of_stock,
      velocityData.reorder_urgency,
      velocityData.price_elasticity_score,
      velocityData.last_sale_date,
      velocityData.trend_direction,
      variantId
    ]);
  }

  /**
   * Get velocity statistics for reporting
   */
  static async getVelocityStats(): Promise<any> {
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_variants,
        COUNT(*) FILTER (WHERE velocity_category = 'fast') as fast_movers,
        COUNT(*) FILTER (WHERE velocity_category = 'medium') as medium_movers,
        COUNT(*) FILTER (WHERE velocity_category = 'slow') as slow_movers,
        COUNT(*) FILTER (WHERE velocity_category = 'dead') as dead_stock,
        COUNT(*) FILTER (WHERE reorder_urgency = 'critical') as critical_reorders,
        COUNT(*) FILTER (WHERE reorder_urgency = 'high') as high_reorders,
        COUNT(*) FILTER (WHERE weeks_of_stock <= 8 AND velocity_category = 'fast') as fast_running_low,
        AVG(weekly_sales_units) as avg_weekly_units,
        SUM(weekly_sales_revenue) as total_weekly_revenue,
        AVG(price_elasticity_score) as avg_elasticity,
        COUNT(*) FILTER (WHERE trend_direction = 'increasing') as trending_up,
        COUNT(*) FILTER (WHERE trend_direction = 'declining') as trending_down
      FROM shopify_variants 
      WHERE sku IS NOT NULL
    `);

    return stats.rows[0];
  }

  /**
   * Find variants that need immediate attention
   */
  static async findCriticalVelocityAlerts(): Promise<any[]> {
    const alerts = await db.query(`
      SELECT 
        v.id, v.sku, v.price, v.available_quantity,
        v.weekly_sales_units, v.weeks_of_stock, 
        v.velocity_category, v.reorder_urgency,
        p.title as product_title
      FROM shopify_variants v
      JOIN shopify_products p ON v.product_id = p.id
      WHERE v.sku IS NOT NULL 
        AND (
          -- Fast movers running low
          (v.velocity_category = 'fast' AND v.weeks_of_stock <= 4)
          -- Dead stock taking up space
          OR (v.velocity_category = 'dead' AND v.available_quantity >= 10)
          -- Declining trends on good inventory
          OR (v.trend_direction = 'declining' AND v.available_quantity >= 20)
        )
      ORDER BY 
        CASE v.reorder_urgency 
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          ELSE 4
        END,
        v.weekly_sales_revenue DESC
      LIMIT 50
    `);

    return alerts.rows;
  }

  /**
   * Helper: Get week of year for date
   */
  private static getWeekOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + start.getDay() + 1) / 7);
  }
}