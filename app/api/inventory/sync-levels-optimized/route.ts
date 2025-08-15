import { NextRequest, NextResponse } from 'next/server';
import { OptimizedInventorySync } from '@/lib/db/inventory-levels-optimized';
import { db } from '@/lib/db/connection';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Optimized Inventory Levels Sync: Starting...');
    
    // Check if there's already a sync in progress
    const activeSyncs = await db.query(`
      SELECT id, sync_type, started_at, 
             EXTRACT(EPOCH FROM (NOW() - started_at))/60 as minutes_running
      FROM shopify_sync_history 
      WHERE status = 'started'
    `);
    
    if (activeSyncs.rows.length > 0) {
      const activeSync = activeSyncs.rows[0];
      console.log(`⚠️ Sync already in progress: ${activeSync.sync_type} (running for ${Math.floor(activeSync.minutes_running)} minutes)`);
      
      return NextResponse.json({
        error: 'Sync already in progress',
        details: {
          syncId: activeSync.id,
          syncType: activeSync.sync_type,
          minutesRunning: Math.floor(activeSync.minutes_running)
        }
      }, { status: 409 });
    }
    
    // Start sync tracking
    const syncResult = await db.query(`
      INSERT INTO shopify_sync_history (sync_type, status, started_at)
      VALUES ('inventory_levels_optimized', 'started', CURRENT_TIMESTAMP)
      RETURNING id
    `);
    const syncId = syncResult.rows[0].id;
    
    const startTime = Date.now();
    
    try {
      // Initialize optimized sync service
      const inventorySync = new OptimizedInventorySync();
      
      // Run optimized inventory levels sync
      const totalSynced = await inventorySync.syncAllInventoryLevels();
      
      // Complete sync tracking
      const duration = Math.floor((Date.now() - startTime) / 1000);
      await db.query(`
        UPDATE shopify_sync_history 
        SET status = 'completed', 
            completed_at = CURRENT_TIMESTAMP,
            summary = $2
        WHERE id = $1
      `, [syncId, JSON.stringify({
        inventory_levels_synced: totalSynced,
        duration_seconds: duration
      })]);
      
      console.log(`✅ Optimized inventory levels sync completed successfully`);
      console.log(`   - Total Inventory Levels Synced: ${totalSynced}`);
      console.log(`   - Duration: ${duration} seconds`);
      
      return NextResponse.json({
        success: true,
        message: 'Optimized inventory levels sync completed',
        result: {
          inventoryLevelsCount: totalSynced,
          duration: duration
        }
      });
      
    } catch (syncError) {
      // Mark sync as failed
      await db.query(`
        UPDATE shopify_sync_history 
        SET status = 'failed', 
            completed_at = CURRENT_TIMESTAMP,
            summary = $2
        WHERE id = $1
      `, [syncId, JSON.stringify({
        error: syncError instanceof Error ? syncError.message : 'Unknown error'
      })]);
      
      throw syncError;
    }
    
  } catch (error) {
    console.error('❌ Optimized inventory levels sync error:', error);
    
    return NextResponse.json({
      error: 'Optimized inventory levels sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get inventory levels statistics with timing info
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_levels,
        COUNT(DISTINCT variant_id) as variants_with_levels,
        COUNT(DISTINCT location_id) as locations_with_levels,
        SUM(available_quantity) as total_available,
        SUM(incoming_quantity) as total_incoming,
        SUM(committed_quantity) as total_committed,
        MAX(synced_at) as last_sync,
        MIN(synced_at) as first_sync
      FROM shopify_inventory_levels
    `);
    
    const recentSyncs = await db.query(`
      SELECT sync_type, status, started_at, completed_at,
             EXTRACT(EPOCH FROM (completed_at - started_at)) as duration_seconds,
             summary
      FROM shopify_sync_history 
      WHERE sync_type LIKE '%inventory%'
      ORDER BY started_at DESC 
      LIMIT 5
    `);
    
    return NextResponse.json({
      success: true,
      stats: stats.rows[0],
      recentSyncs: recentSyncs.rows,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching optimized inventory levels stats:', error);
    
    return NextResponse.json({
      error: 'Failed to fetch optimized inventory levels statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}