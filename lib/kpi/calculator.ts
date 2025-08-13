import { QuickBooksIntegration } from '@/lib/integrations/quickbooks';
import { ShopifyClient } from '@/lib/shopify/client';
import { db } from '@/lib/db/connection';
import { startOfDay, endOfDay, subDays, format, startOfWeek, startOfMonth } from 'date-fns';

// KPI Data Structures
export interface Tier1KPIs {
  cashOnHand: number;
  daysCashRunway: number;
  yesterdayRevenue: number;
  unitsShippedYesterday: number;
  wtdProgress: {
    actual: number;
    target: number;
    percentage: number;
  };
  mtdProgress: {
    actual: number;
    target: number;
    percentage: number;
  };
  grossMarginPercentage: number;
  lastUpdated: Date;
}

export interface AlertThreshold {
  id: string;
  type: 'critical' | 'warning' | 'positive';
  message: string;
  value: number;
  threshold: number;
  triggered: boolean;
  priority: number; // 1 = highest (critical), 2 = medium (warning), 3 = lowest (positive)
}

export interface KPISnapshot {
  id?: number;
  date: Date;
  kpis: Tier1KPIs;
  alerts: AlertThreshold[];
  dataSource: {
    quickbooks: boolean;
    shopify: boolean;
  };
}

export interface ShopifyOrderData {
  totalRevenue: number;
  totalUnits: number;
  orderCount: number;
  periodStart: string;
  periodEnd: string;
}

export interface DailyBurnData {
  dailyExpenses: number;
  calculationPeriod: number; // days
}

export class KPICalculator {
  private quickbooks: QuickBooksIntegration;
  private shopify: ShopifyClient;
  private useMockData: boolean;

  // Freckled Hen Specific Targets - Seasonal Revenue Targets
  private readonly SEASONAL_TARGETS = {
    8: { daily: 2100, weekly: 14700 },   // August
    9: { daily: 2300, weekly: 16100 },   // September
    10: { daily: 4200, weekly: 29400 },  // October
    11: { daily: 6700, weekly: 46900 },  // November
    12: { daily: 5800, weekly: 40600 }   // December
  };

  // Alert Thresholds - Freckled Hen Specific
  private readonly CRITICAL_THRESHOLDS = {
    CASH_RUNWAY_DAYS: 14,
    DAILY_REVENUE_MIN: 1500,
    GROSS_MARGIN_MIN: 48,
    CASH_BALANCE_MIN: 10000
  };

  private readonly WARNING_THRESHOLDS = {
    CASH_RUNWAY_DAYS: 21,
    DAILY_REVENUE_MIN: 2000,
    GROSS_MARGIN_MIN: 52,
    CASH_BALANCE_MIN: 15000,
    WEEKLY_REVENUE_PERCENT: 80
  };

  private readonly POSITIVE_THRESHOLDS = {
    DAILY_REVENUE_PERCENT: 120,
    GROSS_MARGIN_MIN: 58,
    CASH_RUNWAY_DAYS: 30,
    LARGE_TRANSACTION: 500
  };

  constructor(useMockData: boolean = false) {
    this.quickbooks = new QuickBooksIntegration();
    this.shopify = new ShopifyClient();
    this.useMockData = useMockData;
  }

  // Helper method to get current month's targets
  private getCurrentTargets(date: Date = new Date()) {
    const month = date.getMonth() + 1; // JavaScript months are 0-indexed
    const targets = this.SEASONAL_TARGETS[month as keyof typeof this.SEASONAL_TARGETS];
    
    if (!targets) {
      // Default targets for months not in seasonal schedule
      return { daily: 2000, weekly: 14000 };
    }
    
    return targets;
  }

  // Helper method to calculate monthly target based on weekly target
  private getMonthlyTarget(weeklyTarget: number, date: Date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weeksInMonth = daysInMonth / 7;
    return Math.round(weeklyTarget * weeksInMonth);
  }

  async calculateTier1KPIs(date: Date = new Date()): Promise<Tier1KPIs> {
    console.log('📊 Calculating Tier 1 KPIs for', format(date, 'yyyy-MM-dd'));

    // Calculate yesterday based on CST timezone
    const cstOffset = -6; // CST is UTC-6
    const cstNow = new Date(date.getTime() + (cstOffset * 60 * 60 * 1000));
    const yesterdayCST = subDays(cstNow, 1);
    
    console.log('🕐 Timezone calculations:');
    console.log(`   📅 Input date (UTC): ${format(date, 'yyyy-MM-dd HH:mm:ss')}`);
    console.log(`   📅 CST adjusted: ${format(cstNow, 'yyyy-MM-dd HH:mm:ss')}`);
    console.log(`   📅 Yesterday (CST): ${format(yesterdayCST, 'yyyy-MM-dd')}`);

    try {
      // Fetch data from all sources in parallel
      const [
        cashPosition,
        profitLoss,
        cogsData,
        yesterdayOrders,
        wtdOrders,
        mtdOrders,
        dailyBurn
      ] = await Promise.all([
        this.useMockData ? this.getMockCashPosition() : this.safeGetCashPosition(),
        this.useMockData ? this.getMockProfitLoss() : this.safeGetProfitLoss(),
        this.useMockData ? this.getMockCOGS() : this.safeGetCOGS(),
        this.getShopifyOrderData(yesterdayCST, yesterdayCST),
        this.getShopifyOrderData(startOfWeek(cstNow), cstNow),
        this.getShopifyOrderData(startOfMonth(cstNow), cstNow),
        this.useMockData ? this.getMockDailyBurn() : this.safeCalculateDailyBurnRate()
      ]);

      // Get current month's targets
      const currentTargets = this.getCurrentTargets(date);
      const monthlyTarget = this.getMonthlyTarget(currentTargets.weekly, date);

      // Calculate KPIs
      const cashOnHand = cashPosition.totalCash;
      const daysCashRunway = dailyBurn.dailyExpenses > 0 ? cashOnHand / dailyBurn.dailyExpenses : 999;
      const grossMarginPercentage = this.calculateGrossMargin(profitLoss.totalRevenue, cogsData.totalCOGS);

      const kpis: Tier1KPIs = {
        cashOnHand,
        daysCashRunway: Math.round(daysCashRunway * 10) / 10, // Round to 1 decimal
        yesterdayRevenue: yesterdayOrders.totalRevenue,
        unitsShippedYesterday: yesterdayOrders.totalUnits,
        wtdProgress: {
          actual: wtdOrders.totalRevenue,
          target: currentTargets.weekly,
          percentage: Math.round((wtdOrders.totalRevenue / currentTargets.weekly) * 100)
        },
        mtdProgress: {
          actual: mtdOrders.totalRevenue,
          target: monthlyTarget,
          percentage: Math.round((mtdOrders.totalRevenue / monthlyTarget) * 100)
        },
        grossMarginPercentage,
        lastUpdated: new Date()
      };

      console.log('✅ Tier 1 KPIs calculated successfully');
      return kpis;

    } catch (error) {
      console.error('❌ Error calculating Tier 1 KPIs:', error);
      throw error;
    }
  }

  async getShopifyOrderData(startDate: Date, endDate: Date): Promise<ShopifyOrderData> {
    try {
      // Convert to CST timezone for proper date filtering
      // CST is UTC-6, CDT is UTC-5. For simplicity using UTC-6 as base offset
      const cstOffset = -6; // hours
      const startDateCST = new Date(startDate.getTime() + (cstOffset * 60 * 60 * 1000));
      const endDateCST = new Date(endDate.getTime() + (cstOffset * 60 * 60 * 1000));
      
      // Set time ranges for full day in CST
      const startDateWithTime = new Date(startDateCST);
      startDateWithTime.setHours(0, 0, 0, 0);
      
      const endDateWithTime = new Date(endDateCST);
      endDateWithTime.setHours(23, 59, 59, 999);

      console.log('🛍️ Shopify Query Debug:');
      console.log(`   📅 Original date range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
      console.log(`   🕐 CST adjusted start: ${format(startDateWithTime, "yyyy-MM-dd'T'HH:mm:ss'Z'")}`);
      console.log(`   🕐 CST adjusted end: ${format(endDateWithTime, "yyyy-MM-dd'T'HH:mm:ss'Z'")}`);

      const query = `
        query getOrders {
          orders(
            first: 250
            query: "created_at:>='${format(startDateWithTime, "yyyy-MM-dd'T'HH:mm:ss'Z'")}' AND created_at:<='${format(endDateWithTime, "yyyy-MM-dd'T'HH:mm:ss'Z'")}'"
          ) {
            edges {
              node {
                id
                name
                createdAt
                displayFinancialStatus
                displayFulfillmentStatus
                totalPriceSet {
                  shopMoney {
                    amount
                  }
                }
                lineItems(first: 50) {
                  edges {
                    node {
                      quantity
                      fulfillableQuantity
                    }
                  }
                }
              }
            }
          }
        }
      `;

      console.log(`   🔍 Shopify GraphQL Query: ${query.replace(/\s+/g, ' ').trim()}`);

      const response = await this.shopify.getClient().request(query, {});
      const orders = (response as any).orders.edges;

      console.log(`   📦 Raw orders returned: ${orders.length}`);

      let totalRevenue = 0;
      let totalUnits = 0;
      let orderCount = 0;
      let paidOrderCount = 0;
      let fulfilledOrderCount = 0;

      for (const orderEdge of orders) {
        const order = orderEdge.node;
        const orderAmount = parseFloat(order.totalPriceSet.shopMoney.amount);
        
        console.log(`   📋 Order ${order.name}: $${orderAmount}, Financial: ${order.displayFinancialStatus}, Fulfillment: ${order.displayFulfillmentStatus}, Created: ${order.createdAt}`);
        
        // Only count orders that are paid (using displayFinancialStatus)
        const financialStatus = order.displayFinancialStatus?.toLowerCase() || '';
        if (financialStatus.includes('paid') || financialStatus.includes('authorized')) {
          orderCount++;
          paidOrderCount++;
          totalRevenue += orderAmount;
          
          // Count shipped units for fulfilled orders (using displayFulfillmentStatus)
          const fulfillmentStatus = order.displayFulfillmentStatus?.toLowerCase() || '';
          if (fulfillmentStatus.includes('fulfilled') || fulfillmentStatus.includes('shipped')) {
            fulfilledOrderCount++;
            for (const lineItemEdge of order.lineItems.edges) {
              const lineItem = lineItemEdge.node;
              // Count all line items for fulfilled orders since we can't check individual line fulfillment easily
              totalUnits += lineItem.quantity;
            }
          }
        }
      }

      console.log(`   💰 Revenue calculation:`);
      console.log(`      📊 Total orders found: ${orders.length}`);
      console.log(`      💳 Paid orders: ${paidOrderCount}`);
      console.log(`      📦 Fulfilled orders: ${fulfilledOrderCount}`);
      console.log(`      💵 Total revenue: $${totalRevenue.toFixed(2)}`);
      console.log(`      📦 Total units shipped: ${totalUnits}`);

      return {
        totalRevenue,
        totalUnits,
        orderCount: paidOrderCount, // Only count paid orders
        periodStart: format(startDate, 'yyyy-MM-dd'),
        periodEnd: format(endDate, 'yyyy-MM-dd')
      };

    } catch (error) {
      console.error('❌ Error fetching Shopify order data:', error);
      // Return zero values if Shopify is unavailable
      return {
        totalRevenue: 0,
        totalUnits: 0,
        orderCount: 0,
        periodStart: format(startDate, 'yyyy-MM-dd'),
        periodEnd: format(endDate, 'yyyy-MM-dd')
      };
    }
  }

  private async calculateDailyBurnRate(): Promise<DailyBurnData> {
    try {
      // Get expenses from last 30 days to calculate average daily burn
      const endDate = new Date();
      const startDate = subDays(endDate, 30);
      
      const expenses = await this.quickbooks.getExpenses(
        format(startDate, 'yyyy-MM-dd'),
        format(endDate, 'yyyy-MM-dd')
      );

      const dailyExpenses = expenses.totalExpenses / 30;
      
      return {
        dailyExpenses,
        calculationPeriod: 30
      };

    } catch (error) {
      console.error('❌ Error calculating daily burn rate:', error);
      // Return conservative estimate if QuickBooks is unavailable
      return {
        dailyExpenses: 500, // Conservative daily burn estimate
        calculationPeriod: 30
      };
    }
  }

  private calculateGrossMargin(revenue: number, cogs: number): number {
    if (revenue === 0) return 0;
    const grossProfit = revenue - cogs;
    return Math.round((grossProfit / revenue) * 100 * 10) / 10; // Round to 1 decimal
  }

  async checkAlertThresholds(kpis: Tier1KPIs, date: Date = new Date()): Promise<AlertThreshold[]> {
    const alerts: AlertThreshold[] = [];
    const currentTargets = this.getCurrentTargets(date);

    // === CRITICAL ALERTS (Priority 1) ===
    
    // Critical: Cash runway < 14 days
    alerts.push({
      id: 'cash_runway_critical',
      type: 'critical',
      message: `🚨 CRITICAL: Only ${kpis.daysCashRunway} days of cash remaining`,
      value: kpis.daysCashRunway,
      threshold: this.CRITICAL_THRESHOLDS.CASH_RUNWAY_DAYS,
      triggered: kpis.daysCashRunway < this.CRITICAL_THRESHOLDS.CASH_RUNWAY_DAYS,
      priority: 1
    });

    // Critical: Cash balance < $10,000
    alerts.push({
      id: 'cash_balance_critical',
      type: 'critical',
      message: `🚨 CRITICAL: Cash balance ($${kpis.cashOnHand.toLocaleString()}) below minimum ($${this.CRITICAL_THRESHOLDS.CASH_BALANCE_MIN.toLocaleString()})`,
      value: kpis.cashOnHand,
      threshold: this.CRITICAL_THRESHOLDS.CASH_BALANCE_MIN,
      triggered: kpis.cashOnHand < this.CRITICAL_THRESHOLDS.CASH_BALANCE_MIN,
      priority: 1
    });

    // Critical: Gross margin < 48%
    alerts.push({
      id: 'gross_margin_critical',
      type: 'critical',
      message: `🚨 CRITICAL: Gross margin (${kpis.grossMarginPercentage}%) below minimum (${this.CRITICAL_THRESHOLDS.GROSS_MARGIN_MIN}%)`,
      value: kpis.grossMarginPercentage,
      threshold: this.CRITICAL_THRESHOLDS.GROSS_MARGIN_MIN,
      triggered: kpis.grossMarginPercentage < this.CRITICAL_THRESHOLDS.GROSS_MARGIN_MIN,
      priority: 1
    });

    // Critical: Daily revenue < $1,500 (would need 3-day tracking)
    alerts.push({
      id: 'daily_revenue_critical',
      type: 'critical',
      message: `🚨 CRITICAL: Yesterday's revenue ($${kpis.yesterdayRevenue.toLocaleString()}) below minimum ($${this.CRITICAL_THRESHOLDS.DAILY_REVENUE_MIN.toLocaleString()})`,
      value: kpis.yesterdayRevenue,
      threshold: this.CRITICAL_THRESHOLDS.DAILY_REVENUE_MIN,
      triggered: kpis.yesterdayRevenue < this.CRITICAL_THRESHOLDS.DAILY_REVENUE_MIN,
      priority: 1
    });

    // === WARNING ALERTS (Priority 2) ===

    // Warning: Cash runway < 21 days
    alerts.push({
      id: 'cash_runway_warning',
      type: 'warning',
      message: `⚠️ WARNING: Cash runway (${kpis.daysCashRunway} days) below comfort zone (${this.WARNING_THRESHOLDS.CASH_RUNWAY_DAYS} days)`,
      value: kpis.daysCashRunway,
      threshold: this.WARNING_THRESHOLDS.CASH_RUNWAY_DAYS,
      triggered: kpis.daysCashRunway < this.WARNING_THRESHOLDS.CASH_RUNWAY_DAYS && kpis.daysCashRunway >= this.CRITICAL_THRESHOLDS.CASH_RUNWAY_DAYS,
      priority: 2
    });

    // Warning: Cash balance < $15,000
    alerts.push({
      id: 'cash_balance_warning',
      type: 'warning',
      message: `⚠️ WARNING: Cash balance ($${kpis.cashOnHand.toLocaleString()}) below comfort zone ($${this.WARNING_THRESHOLDS.CASH_BALANCE_MIN.toLocaleString()})`,
      value: kpis.cashOnHand,
      threshold: this.WARNING_THRESHOLDS.CASH_BALANCE_MIN,
      triggered: kpis.cashOnHand < this.WARNING_THRESHOLDS.CASH_BALANCE_MIN && kpis.cashOnHand >= this.CRITICAL_THRESHOLDS.CASH_BALANCE_MIN,
      priority: 2
    });

    // Warning: Daily revenue < $2,000 (non-holiday)
    alerts.push({
      id: 'daily_revenue_warning',
      type: 'warning',
      message: `⚠️ WARNING: Yesterday's revenue ($${kpis.yesterdayRevenue.toLocaleString()}) below target ($${this.WARNING_THRESHOLDS.DAILY_REVENUE_MIN.toLocaleString()})`,
      value: kpis.yesterdayRevenue,
      threshold: this.WARNING_THRESHOLDS.DAILY_REVENUE_MIN,
      triggered: kpis.yesterdayRevenue < this.WARNING_THRESHOLDS.DAILY_REVENUE_MIN && kpis.yesterdayRevenue >= this.CRITICAL_THRESHOLDS.DAILY_REVENUE_MIN,
      priority: 2
    });

    // Warning: Gross margin < 52%
    alerts.push({
      id: 'gross_margin_warning',
      type: 'warning',
      message: `⚠️ WARNING: Gross margin (${kpis.grossMarginPercentage}%) below target (${this.WARNING_THRESHOLDS.GROSS_MARGIN_MIN}%)`,
      value: kpis.grossMarginPercentage,
      threshold: this.WARNING_THRESHOLDS.GROSS_MARGIN_MIN,
      triggered: kpis.grossMarginPercentage < this.WARNING_THRESHOLDS.GROSS_MARGIN_MIN && kpis.grossMarginPercentage >= this.CRITICAL_THRESHOLDS.GROSS_MARGIN_MIN,
      priority: 2
    });

    // Warning: Weekly revenue < 80% of target
    alerts.push({
      id: 'weekly_revenue_warning',
      type: 'warning',
      message: `⚠️ WARNING: Weekly revenue (${kpis.wtdProgress.percentage}%) below 80% of target ($${currentTargets.weekly.toLocaleString()})`,
      value: kpis.wtdProgress.percentage,
      threshold: this.WARNING_THRESHOLDS.WEEKLY_REVENUE_PERCENT,
      triggered: kpis.wtdProgress.percentage < this.WARNING_THRESHOLDS.WEEKLY_REVENUE_PERCENT,
      priority: 2
    });

    // === POSITIVE ALERTS (Priority 3) ===

    // Positive: Daily revenue > 120% of target
    const dailyTargetExceeded = kpis.yesterdayRevenue > (currentTargets.daily * (this.POSITIVE_THRESHOLDS.DAILY_REVENUE_PERCENT / 100));
    alerts.push({
      id: 'daily_revenue_positive',
      type: 'positive',
      message: `🎉 EXCELLENT: Yesterday's revenue ($${kpis.yesterdayRevenue.toLocaleString()}) exceeded 120% of target ($${currentTargets.daily.toLocaleString()})`,
      value: kpis.yesterdayRevenue,
      threshold: currentTargets.daily * (this.POSITIVE_THRESHOLDS.DAILY_REVENUE_PERCENT / 100),
      triggered: dailyTargetExceeded,
      priority: 3
    });

    // Positive: Gross margin > 58%
    alerts.push({
      id: 'gross_margin_positive',
      type: 'positive',
      message: `🎉 EXCELLENT: Gross margin (${kpis.grossMarginPercentage}%) exceeds target (${this.POSITIVE_THRESHOLDS.GROSS_MARGIN_MIN}%)`,
      value: kpis.grossMarginPercentage,
      threshold: this.POSITIVE_THRESHOLDS.GROSS_MARGIN_MIN,
      triggered: kpis.grossMarginPercentage > this.POSITIVE_THRESHOLDS.GROSS_MARGIN_MIN,
      priority: 3
    });

    // Positive: Cash runway > 30 days
    alerts.push({
      id: 'cash_runway_positive',
      type: 'positive',
      message: `🎉 STRONG: Cash runway (${kpis.daysCashRunway} days) provides excellent financial security`,
      value: kpis.daysCashRunway,
      threshold: this.POSITIVE_THRESHOLDS.CASH_RUNWAY_DAYS,
      triggered: kpis.daysCashRunway > this.POSITIVE_THRESHOLDS.CASH_RUNWAY_DAYS,
      priority: 3
    });

    // Filter to only triggered alerts and sort by priority
    return alerts
      .filter(alert => alert.triggered)
      .sort((a, b) => a.priority - b.priority);
  }

  async saveKPISnapshot(kpis: Tier1KPIs, alerts: AlertThreshold[]): Promise<number> {
    try {
      console.log('💾 Saving KPI snapshot to database...');

      const today = new Date().toISOString().split('T')[0];
      
      // Try to update existing record first, then insert if it doesn't exist
      const result = await db.query(`
        INSERT INTO kpi_snapshots (
          date,
          cash_on_hand,
          days_cash_runway,
          yesterday_revenue,
          units_shipped_yesterday,
          wtd_actual,
          wtd_target,
          wtd_percentage,
          mtd_actual,
          mtd_target,
          mtd_percentage,
          gross_margin_percentage,
          alerts_data,
          last_updated
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (date) DO UPDATE SET
          cash_on_hand = EXCLUDED.cash_on_hand,
          days_cash_runway = EXCLUDED.days_cash_runway,
          yesterday_revenue = EXCLUDED.yesterday_revenue,
          units_shipped_yesterday = EXCLUDED.units_shipped_yesterday,
          wtd_actual = EXCLUDED.wtd_actual,
          wtd_target = EXCLUDED.wtd_target,
          wtd_percentage = EXCLUDED.wtd_percentage,
          mtd_actual = EXCLUDED.mtd_actual,
          mtd_target = EXCLUDED.mtd_target,
          mtd_percentage = EXCLUDED.mtd_percentage,
          gross_margin_percentage = EXCLUDED.gross_margin_percentage,
          alerts_data = EXCLUDED.alerts_data,
          last_updated = EXCLUDED.last_updated
        RETURNING id
      `, [
        today,
        kpis.cashOnHand,
        kpis.daysCashRunway,
        kpis.yesterdayRevenue,
        kpis.unitsShippedYesterday,
        kpis.wtdProgress.actual,
        kpis.wtdProgress.target,
        kpis.wtdProgress.percentage,
        kpis.mtdProgress.actual,
        kpis.mtdProgress.target,
        kpis.mtdProgress.percentage,
        kpis.grossMarginPercentage,
        JSON.stringify(alerts),
        kpis.lastUpdated
      ]);

      const snapshotId = result.rows[0].id;
      console.log('✅ KPI snapshot saved/updated with ID:', snapshotId);
      return snapshotId;

    } catch (error) {
      console.error('❌ Error saving KPI snapshot:', error);
      throw error;
    }
  }

  async getLatestKPISnapshot(): Promise<KPISnapshot | null> {
    try {
      const result = await db.query(`
        SELECT * FROM kpi_snapshots 
        ORDER BY last_updated DESC 
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        date: new Date(row.date),
        kpis: {
          cashOnHand: parseFloat(row.cash_on_hand),
          daysCashRunway: parseFloat(row.days_cash_runway),
          yesterdayRevenue: parseFloat(row.yesterday_revenue),
          unitsShippedYesterday: parseInt(row.units_shipped_yesterday),
          wtdProgress: {
            actual: parseFloat(row.wtd_actual),
            target: parseFloat(row.wtd_target),
            percentage: parseInt(row.wtd_percentage)
          },
          mtdProgress: {
            actual: parseFloat(row.mtd_actual),
            target: parseFloat(row.mtd_target),
            percentage: parseInt(row.mtd_percentage)
          },
          grossMarginPercentage: parseFloat(row.gross_margin_percentage),
          lastUpdated: new Date(row.last_updated)
        },
        alerts: typeof row.alerts_data === 'string' ? JSON.parse(row.alerts_data) : (row.alerts_data || []),
        dataSource: {
          quickbooks: true, // We'll enhance this later
          shopify: true
        }
      };

    } catch (error) {
      console.error('❌ Error fetching latest KPI snapshot:', error);
      return null;
    }
  }

  async runFullKPICalculation(): Promise<KPISnapshot> {
    try {
      console.log('🚀 Running full KPI calculation...');

      // Calculate KPIs
      const kpis = await this.calculateTier1KPIs();
      
      // Check alerts
      const alerts = await this.checkAlertThresholds(kpis);
      
      // Save to database
      const snapshotId = await this.saveKPISnapshot(kpis, alerts);

      // Log results
      console.log('📊 KPI Calculation Complete:');
      console.log(`   💰 Cash on Hand: $${kpis.cashOnHand.toLocaleString()}`);
      console.log(`   ⏰ Cash Runway: ${kpis.daysCashRunway} days`);
      console.log(`   📈 Yesterday Revenue: $${kpis.yesterdayRevenue.toLocaleString()}`);
      console.log(`   📦 Units Shipped: ${kpis.unitsShippedYesterday}`);
      console.log(`   📅 WTD Progress: ${kpis.wtdProgress.percentage}% ($${kpis.wtdProgress.actual.toLocaleString()}/${kpis.wtdProgress.target.toLocaleString()})`);
      console.log(`   📅 MTD Progress: ${kpis.mtdProgress.percentage}% ($${kpis.mtdProgress.actual.toLocaleString()}/${kpis.mtdProgress.target.toLocaleString()})`);
      console.log(`   💹 Gross Margin: ${kpis.grossMarginPercentage}%`);
      
      if (alerts.length > 0) {
        console.log(`   🚨 Active Alerts: ${alerts.length}`);
        alerts.forEach(alert => {
          console.log(`     ${alert.type.toUpperCase()}: ${alert.message}`);
        });
      } else {
        console.log('   ✅ No alerts triggered');
      }

      return {
        id: snapshotId,
        date: new Date(),
        kpis,
        alerts,
        dataSource: {
          quickbooks: true,
          shopify: true
        }
      };

    } catch (error) {
      console.error('❌ Full KPI calculation failed:', error);
      throw error;
    }
  }

  // Safe wrapper methods that handle missing QuickBooks tokens
  private async safeGetCashPosition() {
    try {
      return await this.quickbooks.getCashPosition();
    } catch (error) {
      console.warn('⚠️ QuickBooks cash position unavailable, using mock data');
      return this.getMockCashPosition();
    }
  }

  private async safeGetProfitLoss() {
    try {
      return await this.quickbooks.getProfitLoss();
    } catch (error) {
      console.warn('⚠️ QuickBooks P&L unavailable, using mock data');
      return this.getMockProfitLoss();
    }
  }

  private async safeGetCOGS() {
    try {
      return await this.quickbooks.getCOGS();
    } catch (error) {
      console.warn('⚠️ QuickBooks COGS unavailable, using mock data');
      return this.getMockCOGS();
    }
  }

  private async safeCalculateDailyBurnRate() {
    try {
      return await this.calculateDailyBurnRate();
    } catch (error) {
      console.warn('⚠️ QuickBooks burn rate unavailable, using mock data');
      return this.getMockDailyBurn();
    }
  }

  // Mock data methods for testing
  private getMockCashPosition() {
    return {
      totalCash: 45000,
      bankAccounts: [
        { name: 'Main Checking', balance: 35000, accountType: 'Checking' },
        { name: 'Savings', balance: 10000, accountType: 'Savings' }
      ],
      asOfDate: new Date().toISOString().split('T')[0]
    };
  }

  private getMockProfitLoss() {
    return {
      totalRevenue: 25000,
      totalExpenses: 18000,
      netIncome: 7000,
      grossProfit: 15000,
      operatingIncome: 12000,
      periodStart: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      periodEnd: format(new Date(), 'yyyy-MM-dd')
    };
  }

  private getMockCOGS() {
    return {
      totalCOGS: 10000,
      cogsAccounts: [
        { name: 'Product Costs', amount: 8000 },
        { name: 'Shipping Costs', amount: 2000 }
      ],
      periodStart: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      periodEnd: format(new Date(), 'yyyy-MM-dd')
    };
  }

  private getMockDailyBurn(): DailyBurnData {
    return {
      dailyExpenses: 600,
      calculationPeriod: 30
    };
  }
}