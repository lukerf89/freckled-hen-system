/**
 * QuickBooks Cash Management Integration
 * Connects to existing QB OAuth system and provides cash-aware inventory decisions
 */

import { db } from '../db/connection';

export interface CashStatus {
  available_cash: number;
  pending_payables: number;
  critical_orders_value: number;
  weekly_pipeline_value: number;
  cash_adequacy_status: 'safe' | 'tight' | 'critical';
  last_updated: string;
}

export interface CashBalanceData {
  available: number;
  pendingPayables: number;
  lastUpdated: string;
}

export class QuickBooksCashManager {
  
  /**
   * Main method to sync cash balance from QuickBooks
   */
  static async syncCashBalance(): Promise<{ success: boolean; cashData: CashBalanceData; status: string }> {
    try {
      console.log('💰 Syncing QuickBooks cash balance...');
      
      // Fetch current cash data from QuickBooks
      const cashData = await this.fetchQuickBooksBalance();
      
      // Calculate cash adequacy status
      const cashStatus = this.calculateCashAdequacy(
        cashData.available, 
        cashData.pendingPayables
      );

      // Store in daily cash status table
      await db.query(`
        INSERT INTO daily_cash_status (
          date, available_cash, pending_payables, cash_adequacy_status,
          updated_at
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (date) 
        DO UPDATE SET 
          available_cash = EXCLUDED.available_cash,
          pending_payables = EXCLUDED.pending_payables,
          cash_adequacy_status = EXCLUDED.cash_adequacy_status,
          updated_at = CURRENT_TIMESTAMP
      `, [
        new Date().toISOString().split('T')[0], // Today's date
        cashData.available,
        cashData.pendingPayables,
        cashStatus
      ]);

      console.log(`✅ Cash balance synced: $${cashData.available.toLocaleString()} (${cashStatus})`);

      return { 
        success: true, 
        cashData, 
        status: cashStatus 
      };
      
    } catch (error) {
      console.error('❌ QuickBooks cash sync failed:', error);
      throw new Error(`Cash sync failed: ${error.message}`);
    }
  }

  /**
   * Fetch cash balance from QuickBooks using existing integration
   */
  static async fetchQuickBooksBalance(): Promise<CashBalanceData> {
    try {
      // Import the existing QuickBooks integration
      const { QuickBooksIntegration } = await import('./quickbooks');
      
      // Get cash position from QuickBooks
      const cashPosition = await QuickBooksIntegration.getCashPosition();
      
      // For now, we'll use a conservative estimate for pending payables
      // This could be enhanced with actual QB payables data later
      const estimatedPayables = cashPosition.totalCash * 0.15; // Conservative 15% of cash

      return {
        available: cashPosition.totalCash,
        pendingPayables: estimatedPayables,
        lastUpdated: cashPosition.asOfDate
      };

    } catch (error) {
      console.error('❌ Error fetching QuickBooks balance:', error);
      
      // Fallback to last known cash status if QB is unavailable
      const fallback = await this.getLastKnownCashStatus();
      if (fallback) {
        console.log('⚠️ Using last known cash status as fallback');
        return {
          available: fallback.available_cash || 0,
          pendingPayables: fallback.pending_payables || 0,
          lastUpdated: fallback.updated_at
        };
      }
      
      throw new Error(`QuickBooks connection failed: ${error.message}`);
    }
  }

  /**
   * Calculate cash adequacy status based on CFO's thresholds
   */
  static calculateCashAdequacy(available: number, payables: number): 'safe' | 'tight' | 'critical' {
    const netCash = available - payables;
    const minimumBuffer = 5000; // $5K minimum operating buffer (CFO's threshold)
    
    if (netCash > minimumBuffer * 2) {
      return 'safe';   // >$10K net cash
    }
    
    if (netCash > minimumBuffer) {
      return 'tight';  // $5K-$10K net cash
    }
    
    return 'critical'; // <$5K net cash
  }

  /**
   * Get current cash status (today's data or sync if needed)
   */
  static async getCurrentCashStatus(): Promise<CashStatus> {
    try {
      // Try to get today's cash status first
      const result = await db.query(`
        SELECT * FROM daily_cash_status 
        WHERE date = CURRENT_DATE 
        ORDER BY updated_at DESC 
        LIMIT 1
      `);
      
      if (result.rows.length === 0) {
        // No data for today, sync now
        console.log('📅 No cash data for today, syncing from QuickBooks...');
        await this.syncCashBalance();
        
        // Get the newly synced data
        const newResult = await db.query(`
          SELECT * FROM daily_cash_status 
          WHERE date = CURRENT_DATE 
          ORDER BY updated_at DESC 
          LIMIT 1
        `);
        
        if (newResult.rows.length > 0) {
          return this.formatCashStatus(newResult.rows[0]);
        }
      }
      
      return this.formatCashStatus(result.rows[0]);
      
    } catch (error) {
      console.error('❌ Error getting current cash status:', error);
      
      // Return safe fallback values
      return {
        available_cash: 0,
        pending_payables: 0,
        critical_orders_value: 0,
        weekly_pipeline_value: 0,
        cash_adequacy_status: 'critical',
        last_updated: new Date().toISOString()
      };
    }
  }

  /**
   * Get last known cash status for fallback
   */
  static async getLastKnownCashStatus() {
    try {
      const result = await db.query(`
        SELECT * FROM daily_cash_status 
        ORDER BY date DESC, updated_at DESC 
        LIMIT 1
      `);
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('❌ Error getting last known cash status:', error);
      return null;
    }
  }

  /**
   * Format database row to CashStatus interface
   */
  private static formatCashStatus(row: any): CashStatus {
    return {
      available_cash: parseFloat(row.available_cash) || 0,
      pending_payables: parseFloat(row.pending_payables) || 0,
      critical_orders_value: parseFloat(row.critical_orders_value) || 0,
      weekly_pipeline_value: parseFloat(row.weekly_pipeline_value) || 0,
      cash_adequacy_status: row.cash_adequacy_status || 'critical',
      last_updated: row.updated_at || new Date().toISOString()
    };
  }

  /**
   * Calculate if we can afford a specific order value
   */
  static async canAffordOrder(orderValue: number): Promise<{ canAfford: boolean; reason: string; netCashAfter: number }> {
    try {
      const cashStatus = await this.getCurrentCashStatus();
      const netCash = cashStatus.available_cash - cashStatus.pending_payables;
      const netCashAfter = netCash - orderValue;
      const minimumBuffer = 5000;

      if (netCashAfter > minimumBuffer) {
        return {
          canAfford: true,
          reason: `Safe to order. Net cash after: $${netCashAfter.toLocaleString()}`,
          netCashAfter
        };
      }

      if (netCashAfter > 0) {
        return {
          canAfford: false,
          reason: `Order would leave only $${netCashAfter.toLocaleString()} (below $${minimumBuffer.toLocaleString()} minimum)`,
          netCashAfter
        };
      }

      return {
        canAfford: false,
        reason: `Insufficient funds. Would overdraw by $${Math.abs(netCashAfter).toLocaleString()}`,
        netCashAfter
      };

    } catch (error) {
      return {
        canAfford: false,
        reason: `Unable to verify cash status: ${error.message}`,
        netCashAfter: 0
      };
    }
  }

  /**
   * Get cash impact summary for dashboard
   */
  static async getCashImpactSummary() {
    try {
      const cashStatus = await this.getCurrentCashStatus();
      
      // Get total value of critical reorder alerts (use 0 for now since alerts haven't been generated yet)
      const criticalOrders = await db.query(`
        SELECT 0 as total_value, 0 as count
      `);

      // Get potential clearance recovery
      const clearanceRecovery = await db.query(`
        SELECT SUM(COALESCE(available_quantity, 0) * COALESCE(price, 0) * 0.4) as potential_recovery,
               COUNT(*) as items
        FROM shopify_variants 
        WHERE COALESCE(clearance_candidate, false) = true 
          AND COALESCE(available_quantity, 0) > 0
      `);

      const criticalOrderValue = parseFloat(criticalOrders.rows[0]?.total_value) || 0;
      const recoveryPotential = parseFloat(clearanceRecovery.rows[0]?.potential_recovery) || 0;
      const netCash = cashStatus.available_cash - cashStatus.pending_payables;

      return {
        cashStatus,
        criticalOrderValue,
        criticalOrderCount: parseInt(criticalOrders.rows[0]?.count) || 0,
        clearanceRecoveryPotential: recoveryPotential,
        clearanceItemCount: parseInt(clearanceRecovery.rows[0]?.items) || 0,
        netCash,
        canAffordCriticalOrders: netCash > criticalOrderValue + 5000, // $5K buffer
        cashUtilizationPercent: netCash > 0 ? Math.round((criticalOrderValue / netCash) * 100) : 0
      };

    } catch (error) {
      console.error('❌ Error getting cash impact summary:', error);
      throw error;
    }
  }
}