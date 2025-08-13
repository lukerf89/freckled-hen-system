import { NextResponse } from 'next/server';
import { KPICalculator } from '@/lib/kpi/calculator';

export async function POST() {
  try {
    console.log('🚀 API: Starting KPI calculation...');
    
    const calculator = new KPICalculator();
    const snapshot = await calculator.runFullKPICalculation();
    
    console.log('✅ API: KPI calculation completed successfully');
    
    return NextResponse.json({
      success: true,
      kpis: snapshot.kpis,
      alerts: snapshot.alerts,
      dataSource: snapshot.dataSource,
      snapshotId: snapshot.id,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ API: KPI calculation failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to calculate KPIs',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    console.log('📊 API: Fetching latest KPI snapshot...');
    
    const calculator = new KPICalculator();
    const snapshot = await calculator.getLatestKPISnapshot();
    
    if (!snapshot) {
      // If no snapshot exists, calculate fresh KPIs
      return POST();
    }
    
    console.log('✅ API: Latest KPI snapshot retrieved');
    
    return NextResponse.json({
      success: true,
      kpis: snapshot.kpis,
      alerts: snapshot.alerts,
      dataSource: snapshot.dataSource,
      snapshotId: snapshot.id,
      timestamp: snapshot.date.toISOString()
    });
    
  } catch (error) {
    console.error('❌ API: Failed to fetch KPI snapshot:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch KPIs',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}