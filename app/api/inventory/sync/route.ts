import { NextRequest, NextResponse } from 'next/server';
import { InventorySync } from '@/lib/db/inventory';
import { db } from '@/lib/db/connection';

export async function POST(request: NextRequest) {
  try {
    console.log('📦 Inventory Sync API: Starting full sync...');
    
    // Optional: Add authentication check here
    // const authHeader = request.headers.get('authorization');
    // if (!authHeader || authHeader !== `Bearer ${process.env.API_SECRET}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    
    // Check if a sync is already in progress
    const activeSync = await db.query(`
      SELECT id, started_at 
      FROM shopify_sync_history 
      WHERE status = 'started' 
      ORDER BY started_at DESC 
      LIMIT 1
    `);
    
    if (activeSync.rows.length > 0) {
      const startTime = new Date(activeSync.rows[0].started_at);
      const minutesAgo = Math.floor((Date.now() - startTime.getTime()) / 60000);
      
      // If sync has been running for more than 30 minutes, consider it stale
      if (minutesAgo < 30) {
        return NextResponse.json({
          error: 'Sync already in progress',
          syncId: activeSync.rows[0].id,
          startedAt: startTime,
          minutesRunning: minutesAgo
        }, { status: 409 });
      }
    }
    
    // Initialize sync service
    const sync = new InventorySync();
    
    // Perform full sync
    const result = await sync.fullSync();
    
    // Get summary statistics
    const stats = await sync.getInventoryStats();
    
    console.log('✅ Inventory Sync API: Full sync completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Full inventory sync completed',
      result: {
        productsCount: result.productsCount,
        variantsCount: result.variantsCount,
        locationsCount: result.locationsCount,
        inventoryLevelsCount: result.inventoryLevelsCount,
        syncId: result.syncId,
        errors: result.errors
      },
      stats: {
        totalProducts: stats.total_products,
        totalVariants: stats.total_variants,
        inStockVariants: stats.in_stock_variants,
        outOfStockVariants: stats.out_of_stock_variants,
        lowStockVariants: stats.low_stock_variants,
        totalUnits: stats.total_units,
        totalInventoryValue: stats.total_inventory_value,
        lastSync: stats.last_sync
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Inventory Sync API Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get sync status and statistics
    const syncHistory = await db.query(`
      SELECT 
        id,
        sync_type,
        status,
        products_synced,
        variants_synced,
        inventory_levels_synced,
        errors_count,
        started_at,
        completed_at,
        duration_seconds
      FROM shopify_sync_history
      ORDER BY started_at DESC
      LIMIT 10
    `);
    
    const stats = await db.query(`
      WITH inventory_totals AS (
        SELECT 
          il.variant_id,
          SUM(il.available_quantity) as total_available
        FROM shopify_inventory_levels il
        GROUP BY il.variant_id
      )
      SELECT 
        COUNT(DISTINCT p.id) as total_products,
        COUNT(DISTINCT v.id) as total_variants,
        COUNT(DISTINCT CASE WHEN COALESCE(it.total_available, 0) > 0 THEN v.id END) as in_stock_variants,
        COUNT(DISTINCT CASE WHEN COALESCE(it.total_available, 0) = 0 THEN v.id END) as out_of_stock_variants,
        COUNT(DISTINCT CASE WHEN it.total_available <= 10 AND it.total_available > 0 THEN v.id END) as low_stock_variants,
        SUM(COALESCE(it.total_available, 0)) as total_units,
        SUM(COALESCE(it.total_available, 0) * v.price) as total_inventory_value,
        MAX(il.synced_at) as last_sync
      FROM shopify_products p
      LEFT JOIN shopify_variants v ON p.id = v.product_id
      LEFT JOIN inventory_totals it ON v.id = it.variant_id
      LEFT JOIN shopify_inventory_levels il ON v.id = il.variant_id
      WHERE p.status = 'ACTIVE'
    `);
    
    const lowStock = await db.query(`
      WITH inventory_totals AS (
        SELECT 
          il.variant_id,
          SUM(il.available_quantity) as total_available
        FROM shopify_inventory_levels il
        GROUP BY il.variant_id
      )
      SELECT 
        p.title as product_title,
        v.sku,
        v.title as variant_title,
        COALESCE(it.total_available, 0) as inventory_quantity
      FROM shopify_variants v
      JOIN shopify_products p ON v.product_id = p.id
      LEFT JOIN inventory_totals it ON v.id = it.variant_id
      WHERE COALESCE(it.total_available, 0) > 0 
        AND COALESCE(it.total_available, 0) <= 10
        AND p.status = 'ACTIVE'
      ORDER BY it.total_available ASC
      LIMIT 20
    `);
    
    // Transform database field names to match frontend expectations
    const statsData = stats.rows[0];
    const formattedStats = {
      totalProducts: statsData.total_products,
      totalVariants: statsData.total_variants,
      inStockVariants: statsData.in_stock_variants,
      outOfStockVariants: statsData.out_of_stock_variants,
      lowStockVariants: statsData.low_stock_variants,
      totalUnits: statsData.total_units,
      totalInventoryValue: statsData.total_inventory_value,
      lastSync: statsData.last_sync
    };
    
    return NextResponse.json({
      success: true,
      syncHistory: syncHistory.rows,
      stats: formattedStats,
      lowStockItems: lowStock.rows,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Inventory Sync Status Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}