import { NextRequest, NextResponse } from 'next/server';
import { QuickBooksCashManager } from '@/lib/integrations/quickbooks-cash';

export async function POST(request: NextRequest) {
  try {
    console.log('💰 Cash sync API: Starting QuickBooks cash balance sync...');
    
    // Perform cash balance sync
    const result = await QuickBooksCashManager.syncCashBalance();
    
    console.log('✅ Cash sync API: Sync completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'QuickBooks cash balance synced successfully',
      data: {
        available_cash: result.cashData.available,
        pending_payables: result.cashData.pendingPayables,
        cash_adequacy_status: result.status,
        last_updated: result.cashData.lastUpdated
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Cash sync API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'QuickBooks cash sync failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Cash status API: Getting current cash status...');
    
    // Get current cash status and impact summary
    const [cashStatus, impactSummary] = await Promise.all([
      QuickBooksCashManager.getCurrentCashStatus(),
      QuickBooksCashManager.getCashImpactSummary()
    ]);
    
    return NextResponse.json({
      success: true,
      cashStatus,
      impactSummary,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Cash status API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get cash status',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}