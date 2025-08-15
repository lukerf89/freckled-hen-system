import { NextRequest, NextResponse } from 'next/server';
import { InventorySync } from '@/lib/db/inventory';
import { db } from '@/lib/db/connection';

export async function POST(request: NextRequest) {
  try {
    console.log('📊 Inventory Levels Sync: Starting inventory levels only sync...');
    
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
    
    // Initialize sync service
    const inventorySync = new InventorySync();
    
    // Run inventory levels only sync
    const result = await inventorySync.syncInventoryLevelsOnly();
    
    console.log(`✅ Inventory levels sync completed successfully`);
    console.log(`   - Inventory Levels Synced: ${result.inventoryLevelsCount}`);
    
    return NextResponse.json({
      success: true,
      message: 'Inventory levels sync completed',
      result
    });
    
  } catch (error) {
    console.error('❌ Inventory levels sync error:', error);
    
    return NextResponse.json({
      error: 'Inventory levels sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get inventory levels statistics
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_levels,
        COUNT(DISTINCT variant_id) as variants_with_levels,
        COUNT(DISTINCT location_id) as locations_with_levels,
        SUM(available_quantity) as total_available,
        SUM(incoming_quantity) as total_incoming,
        SUM(committed_quantity) as total_committed,
        MAX(synced_at) as last_sync
      FROM shopify_inventory_levels
    `);
    
    const locationBreakdown = await db.query(`
      SELECT 
        l.name as location_name,
        COUNT(il.id) as levels_count,
        SUM(il.available_quantity) as total_available,
        SUM(il.incoming_quantity) as total_incoming
      FROM shopify_locations l
      LEFT JOIN shopify_inventory_levels il ON l.id = il.location_id
      GROUP BY l.id, l.name
      ORDER BY l.is_primary DESC, l.name
    `);
    
    const variantsWithoutLevels = await db.query(`
      SELECT COUNT(*) as count
      FROM shopify_variants v
      WHERE NOT EXISTS (
        SELECT 1 FROM shopify_inventory_levels il 
        WHERE il.variant_id = v.id
      )
    `);
    
    return NextResponse.json({
      success: true,
      stats: stats.rows[0],
      locationBreakdown: locationBreakdown.rows,
      variantsWithoutLevels: variantsWithoutLevels.rows[0].count,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching inventory levels stats:', error);
    
    return NextResponse.json({
      error: 'Failed to fetch inventory levels statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}