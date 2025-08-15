import { NextRequest, NextResponse } from 'next/server';
import { InventorySync } from '@/lib/db/inventory';
import { db } from '@/lib/db/connection';

export async function POST(request: NextRequest) {
  try {
    console.log('🏷️ Collections Sync: Starting collections only sync...');
    
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
    
    // Run collections only sync
    const result = await inventorySync.syncCollectionsOnly();
    
    console.log(`✅ Collections sync completed successfully`);
    console.log(`   - Collections Synced: ${result.collectionsCount}`);
    
    return NextResponse.json({
      success: true,
      message: 'Collections sync completed',
      result
    });
    
  } catch (error) {
    console.error('❌ Collections sync error:', error);
    
    return NextResponse.json({
      error: 'Collections sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get collections statistics
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_collections,
        COUNT(CASE WHEN collection_type = 'smart' THEN 1 END) as smart_collections,
        COUNT(CASE WHEN collection_type = 'custom' THEN 1 END) as custom_collections,
        SUM(products_count) as total_products_in_collections,
        MAX(synced_at) as last_sync
      FROM shopify_collections
    `);
    
    const topCollections = await db.query(`
      SELECT 
        title,
        handle,
        collection_type,
        products_count,
        synced_at
      FROM shopify_collections
      ORDER BY products_count DESC
      LIMIT 10
    `);
    
    const productCollectionStats = await db.query(`
      SELECT 
        COUNT(DISTINCT product_id) as products_with_collections,
        COUNT(DISTINCT collection_id) as collections_with_products,
        COUNT(*) as total_relationships
      FROM shopify_product_collections
    `);
    
    const productsWithoutCollections = await db.query(`
      SELECT COUNT(*) as count
      FROM shopify_products p
      WHERE NOT EXISTS (
        SELECT 1 FROM shopify_product_collections pc 
        WHERE pc.product_id = p.id
      )
    `);
    
    return NextResponse.json({
      success: true,
      stats: stats.rows[0],
      topCollections: topCollections.rows,
      productCollectionStats: productCollectionStats.rows[0],
      productsWithoutCollections: productsWithoutCollections.rows[0].count,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching collections stats:', error);
    
    return NextResponse.json({
      error: 'Failed to fetch collections statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}