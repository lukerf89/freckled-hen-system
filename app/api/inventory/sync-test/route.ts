import { NextRequest, NextResponse } from 'next/server';
import { GraphQLClient } from 'graphql-request';
import { db } from '@/lib/db/connection';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing inventory sync with small batch...');
    
    const endpoint = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-07/graphql.json`;
    const graphqlClient = new GraphQLClient(endpoint, {
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN!,
        'Content-Type': 'application/json',
      },
    });

    // Test 1: Basic GraphQL connectivity
    console.log('📡 Testing GraphQL connection...');
    const testQuery = `
      query {
        shop {
          name
          myshopifyDomain
        }
      }
    `;
    
    const testResponse = await graphqlClient.request<any>(testQuery);
    console.log(`✅ Connected to shop: ${testResponse.shop.name}`);

    // Test 2: Get first few inventory items
    console.log('📦 Testing inventory items query...');
    const inventoryQuery = `
      query {
        inventoryItems(first: 5) {
          edges {
            node {
              id
              sku
              tracked
              variant {
                id
                title
                product {
                  title
                  status
                }
              }
              inventoryLevels(first: 5) {
                edges {
                  node {
                    id
                    location {
                      id
                      name
                    }
                    quantities(names: ["available"]) {
                      name
                      quantity
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
    
    const inventoryResponse = await graphqlClient.request<any>(inventoryQuery);
    const items = inventoryResponse.inventoryItems.edges;
    
    console.log(`✅ Found ${items.length} inventory items`);
    
    // Test 3: Check database connectivity
    console.log('🗄️  Testing database connection...');
    const dbTest = await db.query('SELECT COUNT(*) FROM shopify_variants');
    console.log(`✅ Database has ${dbTest.rows[0].count} variants`);

    // Test 4: Try to sync one inventory level
    if (items.length > 0) {
      const item = items[0].node;
      if (item.variant && item.inventoryLevels.edges.length > 0) {
        console.log(`🔄 Testing sync for variant: ${item.variant.title}`);
        
        // Find variant in database
        const variantResult = await db.query(
          'SELECT id FROM shopify_variants WHERE shopify_gid = $1', 
          [item.variant.id]
        );
        
        if (variantResult.rows.length > 0) {
          const variantId = variantResult.rows[0].id;
          const level = item.inventoryLevels.edges[0].node;
          
          // Find location in database
          const locationResult = await db.query(
            'SELECT id FROM shopify_locations WHERE shopify_gid = $1', 
            [level.location.id]
          );
          
          if (locationResult.rows.length > 0) {
            const locationId = locationResult.rows[0].id;
            const quantity = level.quantities[0]?.quantity || 0;
            
            await db.query(`
              INSERT INTO shopify_inventory_levels (
                variant_id, location_id, inventory_item_id,
                available_quantity, incoming_quantity, committed_quantity,
                updated_at_shopify, synced_at
              ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              ON CONFLICT (variant_id, location_id) DO UPDATE SET
                available_quantity = EXCLUDED.available_quantity,
                synced_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            `, [
              variantId,
              locationId,
              item.id.split('/').pop(),
              quantity,
              0, // incoming
              0  // committed
            ]);
            
            console.log(`✅ Successfully synced one inventory level`);
          } else {
            console.log(`⚠️ Location not found in database: ${level.location.name}`);
          }
        } else {
          console.log(`⚠️ Variant not found in database: ${item.variant.title}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Inventory sync test completed successfully',
      results: {
        shopConnection: true,
        inventoryItemsFound: items.length,
        databaseVariants: dbTest.rows[0].count,
        testSyncAttempted: items.length > 0
      }
    });
    
  } catch (error) {
    console.error('❌ Inventory sync test failed:', error);
    
    return NextResponse.json({
      error: 'Inventory sync test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}