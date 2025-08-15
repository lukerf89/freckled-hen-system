import { NextRequest, NextResponse } from 'next/server';
import { QuickBooksCashManager } from '@/lib/integrations/quickbooks-cash';

export async function POST(request: NextRequest) {
  try {
    const { orderValue, description } = await request.json();
    
    if (!orderValue || typeof orderValue !== 'number') {
      return NextResponse.json({
        error: 'orderValue (number) is required'
      }, { status: 400 });
    }
    
    console.log(`💰 Checking affordability for ${description || 'order'}: $${orderValue.toLocaleString()}`);
    
    // Check if order can be afforded
    const affordabilityCheck = await QuickBooksCashManager.canAffordOrder(orderValue);
    
    // Get current cash summary for context
    const impactSummary = await QuickBooksCashManager.getCashImpactSummary();
    
    console.log(`${affordabilityCheck.canAfford ? '✅' : '❌'} Affordability result: ${affordabilityCheck.reason}`);
    
    return NextResponse.json({
      success: true,
      orderValue,
      description,
      canAfford: affordabilityCheck.canAfford,
      reason: affordabilityCheck.reason,
      netCashAfter: affordabilityCheck.netCashAfter,
      currentCashStatus: {
        available: impactSummary.cashStatus.available_cash,
        pending: impactSummary.cashStatus.pending_payables,
        net: impactSummary.netCash,
        status: impactSummary.cashStatus.cash_adequacy_status
      },
      recommendation: affordabilityCheck.canAfford 
        ? 'APPROVED_TO_ORDER'
        : impactSummary.netCash > orderValue 
          ? 'REVIEW_CASH_FLOW' 
          : 'INSUFFICIENT_FUNDS',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Affordability check API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check order affordability',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET endpoint to check multiple orders at once
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderValues = searchParams.get('orders');
    
    if (!orderValues) {
      return NextResponse.json({
        error: 'orders parameter required (comma-separated values)'
      }, { status: 400 });
    }
    
    const orders = orderValues.split(',').map(val => parseFloat(val.trim())).filter(val => !isNaN(val));
    
    if (orders.length === 0) {
      return NextResponse.json({
        error: 'No valid order values provided'
      }, { status: 400 });
    }
    
    console.log(`💰 Batch affordability check for ${orders.length} orders`);
    
    // Check each order
    const results = await Promise.all(
      orders.map(async (orderValue, index) => {
        const check = await QuickBooksCashManager.canAffordOrder(orderValue);
        return {
          orderIndex: index,
          orderValue,
          canAfford: check.canAfford,
          reason: check.reason,
          netCashAfter: check.netCashAfter
        };
      })
    );
    
    // Calculate totals
    const totalOrderValue = orders.reduce((sum, val) => sum + val, 0);
    const totalAffordable = results.filter(r => r.canAfford).reduce((sum, r) => sum + r.orderValue, 0);
    const impactSummary = await QuickBooksCashManager.getCashImpactSummary();
    
    return NextResponse.json({
      success: true,
      batchCheck: {
        totalOrders: orders.length,
        totalValue: totalOrderValue,
        totalAffordable: totalAffordable,
        affordableCount: results.filter(r => r.canAfford).length,
        canAffordAll: results.every(r => r.canAfford)
      },
      orders: results,
      currentCashStatus: impactSummary.cashStatus,
      recommendation: results.every(r => r.canAfford) 
        ? 'ALL_ORDERS_APPROVED' 
        : totalAffordable > 0 
          ? 'PARTIAL_APPROVAL' 
          : 'NO_ORDERS_APPROVED',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Batch affordability check API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check batch order affordability',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}