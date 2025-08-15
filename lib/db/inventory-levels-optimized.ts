import { GraphQLClient } from 'graphql-request';
import { db } from './connection';

/**
 * Optimized inventory levels sync that uses pagination instead of variant ID filtering
 * This approach is more reliable and avoids the GraphQL query complexity issues
 */
export class OptimizedInventorySync {
  private graphqlClient: GraphQLClient;
  
  constructor() {
    const endpoint = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-07/graphql.json`;
    this.graphqlClient = new GraphQLClient(endpoint, {
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN!,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Sync all inventory levels using pagination approach
   */
  async syncAllInventoryLevels(): Promise<number> {
    console.log('🚀 Starting optimized inventory levels sync...');
    
    // Get all locations first
    const locationsResult = await db.query('SELECT id, shopify_gid FROM shopify_locations WHERE active = true');
    const locations = locationsResult.rows;
    console.log(`📍 Found ${locations.length} active locations`);
    
    let totalCount = 0;
    let hasNextPage = true;
    let cursor: string | null = null;
    let batchCount = 0;
    
    while (hasNextPage) {
      batchCount++;
      console.log(`📦 Processing batch ${batchCount}${cursor ? ` (cursor: ${cursor.substring(0, 20)}...)` : ''}`);
      
      const query = `
        query($cursor: String) {
          inventoryItems(first: 100, after: $cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              node {
                id
                sku
                tracked
                requiresShipping
                variant {
                  id
                  title
                  sku
                  product {
                    id
                    title
                    status
                  }
                }
                inventoryLevels(first: 20) {
                  edges {
                    node {
                      id
                      location {
                        id
                        name
                      }
                      quantities(names: ["available", "incoming", "committed", "on_hand"]) {
                        name
                        quantity
                      }
                      updatedAt
                    }
                  }
                }
              }
            }
          }
        }
      `;
      
      try {
        const variables = cursor ? { cursor } : {};
        const response = await this.graphqlClient.request<any>(query, variables);
        
        hasNextPage = response.inventoryItems.pageInfo.hasNextPage;
        cursor = response.inventoryItems.pageInfo.endCursor;
        
        let batchSyncCount = 0;
        
        for (const edge of response.inventoryItems.edges) {
          const item = edge.node;
          
          // Skip if no variant or variant's product is not active
          if (!item.variant || item.variant.product.status !== 'ACTIVE') {
            continue;
          }
          
          // Find the variant in our database
          const variantResult = await db.query(
            'SELECT id FROM shopify_variants WHERE shopify_gid = $1', 
            [item.variant.id]
          );
          
          if (variantResult.rows.length === 0) {
            continue; // Variant not in our database, skip
          }
          
          const variantId = variantResult.rows[0].id;
          
          // Process each inventory level for this item
          for (const levelEdge of item.inventoryLevels.edges) {
            const level = levelEdge.node;
            
            // Find the location in our database
            const location = locations.find(l => l.shopify_gid === level.location.id);
            if (!location) continue;
            
            // Extract quantities
            const quantities = level.quantities.reduce((acc: any, q: any) => {
              acc[q.name] = q.quantity;
              return acc;
            }, {});
            
            try {
              await db.query(`
                INSERT INTO shopify_inventory_levels (
                  variant_id, location_id, inventory_item_id,
                  available_quantity, incoming_quantity, committed_quantity,
                  updated_at_shopify, synced_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
                ON CONFLICT (variant_id, location_id) DO UPDATE SET
                  inventory_item_id = EXCLUDED.inventory_item_id,
                  available_quantity = EXCLUDED.available_quantity,
                  incoming_quantity = EXCLUDED.incoming_quantity,
                  committed_quantity = EXCLUDED.committed_quantity,
                  updated_at_shopify = EXCLUDED.updated_at_shopify,
                  synced_at = CURRENT_TIMESTAMP,
                  updated_at = CURRENT_TIMESTAMP
              `, [
                variantId,
                location.id,
                item.id.split('/').pop(),
                quantities.available || 0,
                quantities.incoming || 0,
                quantities.committed || 0,
                level.updatedAt
              ]);
              
              batchSyncCount++;
              totalCount++;
              
            } catch (dbError) {
              console.error(`Error inserting inventory level for variant ${item.variant.id}:`, dbError);
            }
          }
        }
        
        console.log(`   ✅ Batch ${batchCount}: Synced ${batchSyncCount} inventory levels (Total: ${totalCount})`);
        
        // Rate limiting - add delay every 5 batches
        if (batchCount % 5 === 0) {
          console.log(`   ⏳ Rate limiting pause...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          // Smaller delay between requests
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
      } catch (error) {
        console.error(`❌ Error in batch ${batchCount}:`, error);
        
        // On error, wait longer and continue
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // If it's a rate limit error, we might want to continue
        if (error instanceof Error && error.message.includes('rate')) {
          console.log(`   ⚠️ Rate limit hit, continuing after delay...`);
          continue;
        }
        
        // For other errors, we might want to break or continue based on the error
        break;
      }
    }
    
    console.log(`✅ Optimized inventory sync completed. Total levels synced: ${totalCount}`);
    return totalCount;
  }
}