import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Inventory Sync Reset: Starting reset process...');
    
    // Optional: Add authentication check here
    // const authHeader = request.headers.get('authorization');
    // if (!authHeader || authHeader !== `Bearer ${process.env.API_SECRET}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    
    // Get current stuck syncs
    const stuckSyncs = await db.query(`
      SELECT 
        id,
        sync_type,
        started_at,
        EXTRACT(EPOCH FROM (NOW() - started_at))/60 as minutes_running
      FROM shopify_sync_history 
      WHERE status = 'started' 
      ORDER BY started_at DESC
    `);
    
    console.log(`📊 Found ${stuckSyncs.rows.length} stuck sync(s)`);
    
    if (stuckSyncs.rows.length > 0) {
      stuckSyncs.rows.forEach(sync => {
        console.log(`   - Sync ID ${sync.id}: ${sync.sync_type} (running ${Math.floor(sync.minutes_running)} minutes)`);
      });
    }
    
    // Update all 'started' syncs to 'failed' with reset reason
    const resetResult = await db.query(`
      UPDATE shopify_sync_history
      SET 
        status = 'failed',
        completed_at = CURRENT_TIMESTAMP,
        duration_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at))::integer,
        error_details = jsonb_build_object(
          'reason', 'Reset via API',
          'reset_timestamp', CURRENT_TIMESTAMP::text,
          'original_status', 'started'
        ),
        errors_count = COALESCE(errors_count, 0) + 1
      WHERE status = 'started'
      RETURNING id, sync_type, started_at
    `);
    
    console.log(`✅ Reset ${resetResult.rows.length} stuck sync record(s)`);
    
    // Get updated sync status
    const currentStatus = await db.query(`
      SELECT 
        COUNT(*) as total_syncs,
        COUNT(CASE WHEN status = 'started' THEN 1 END) as active_syncs,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_syncs,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_syncs,
        MAX(started_at) as last_sync_attempt
      FROM shopify_sync_history
    `);
    
    const status = currentStatus.rows[0];
    
    // Also clear any potentially orphaned locks (if you have a separate locks table)
    // This is optional depending on your implementation
    
    console.log('🧹 Sync reset completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Sync status reset successfully',
      reset_details: {
        stuck_syncs_found: stuckSyncs.rows.length,
        syncs_reset: resetResult.rows.length,
        reset_sync_ids: resetResult.rows.map(row => row.id)
      },
      current_status: {
        total_syncs: parseInt(status.total_syncs),
        active_syncs: parseInt(status.active_syncs),
        completed_syncs: parseInt(status.completed_syncs),
        failed_syncs: parseInt(status.failed_syncs),
        last_sync_attempt: status.last_sync_attempt,
        can_start_new_sync: parseInt(status.active_syncs) === 0
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Inventory Sync Reset Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during reset',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get current sync status without making changes
    const syncStatus = await db.query(`
      SELECT 
        id,
        sync_type,
        status,
        started_at,
        completed_at,
        duration_seconds,
        products_synced,
        variants_synced,
        errors_count,
        CASE 
          WHEN status = 'started' THEN 
            EXTRACT(EPOCH FROM (NOW() - started_at))/60
          ELSE NULL 
        END as minutes_running
      FROM shopify_sync_history 
      ORDER BY started_at DESC
      LIMIT 10
    `);
    
    const activeSyncs = syncStatus.rows.filter(sync => sync.status === 'started');
    const stuckSyncs = activeSyncs.filter(sync => sync.minutes_running > 30); // Consider stuck if running > 30 minutes
    
    const summary = await db.query(`
      SELECT 
        COUNT(*) as total_syncs,
        COUNT(CASE WHEN status = 'started' THEN 1 END) as active_syncs,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_syncs,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_syncs
      FROM shopify_sync_history
    `);
    
    return NextResponse.json({
      success: true,
      sync_status: {
        recent_syncs: syncStatus.rows,
        active_syncs: activeSyncs.length,
        stuck_syncs: stuckSyncs.length,
        stuck_sync_details: stuckSyncs.map(sync => ({
          id: sync.id,
          sync_type: sync.sync_type,
          minutes_running: Math.floor(sync.minutes_running),
          started_at: sync.started_at
        })),
        summary: summary.rows[0],
        needs_reset: stuckSyncs.length > 0
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Sync Status Check Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}