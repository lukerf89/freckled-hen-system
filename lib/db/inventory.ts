import { db } from './connection';
import { ShopifyClient } from '../shopify/client';
import { GraphQLClient } from 'graphql-request';

interface ShopifyProduct {
  id: string;
  handle: string;
  title: string;
  vendor: string | null;
  productType: string | null;
  status: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  variants: {
    edges: Array<{
      node: ShopifyVariant;
    }>;
  };
  images: {
    edges: Array<{
      node: ShopifyImage;
    }>;
  };
  collections?: {
    edges: Array<{
      node: {
        id: string;
        handle: string;
        title: string;
      };
    }>;
  };
}

interface ShopifyVariant {
  id: string;
  sku: string | null;
  barcode: string | null;
  title: string;
  selectedOptions: Array<{
    name: string;
    value: string;
  }>;
  price: string;
  compareAtPrice: string | null;
  inventoryQuantity: number | null;
  inventoryItem: {
    id: string;
    unitCost: {
      amount: string;
    } | null;
  };
  taxable: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

interface ShopifyImage {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  altText: string | null;
}

interface ShopifyLocation {
  id: string;
  name: string;
  address: {
    address1: string | null;
    address2: string | null;
    city: string | null;
    province: string | null;
    country: string | null;
    zip: string | null;
    phone: string | null;
  };
  isActive: boolean;
  isPrimary: boolean;
}

interface SyncResult {
  success: boolean;
  productsCount: number;
  variantsCount: number;
  locationsCount: number;
  inventoryLevelsCount: number;
  collectionsCount?: number;
  errors: any[];
  syncId: number;
}

export class InventorySync {
  private shopifyClient: ShopifyClient;
  private graphqlClient: GraphQLClient;
  private syncId: number | null = null;

  constructor() {
    this.shopifyClient = new ShopifyClient();
    this.graphqlClient = this.shopifyClient.getClient();
  }

  /**
   * Perform a full sync of all products, variants, and inventory from Shopify
   */
  async fullSync(): Promise<SyncResult> {
    console.log('🚀 Starting full inventory sync from Shopify...');
    const startTime = Date.now();
    const errors: any[] = [];
    
    try {
      // Start sync tracking
      this.syncId = await this.startSyncTracking('full');
      
      // 1. Sync locations first
      console.log('📍 Syncing locations...');
      const locationsCount = await this.syncLocations();
      
      // 2. Sync all products with variants
      console.log('📦 Syncing products and variants...');
      const { productsCount, variantsCount } = await this.syncProducts();
      
      // 3. Sync inventory levels
      console.log('📊 Syncing inventory levels...');
      const inventoryLevelsCount = await this.syncInventoryLevels();
      
      // 4. Sync collections
      console.log('🏷️ Syncing collections...');
      await this.syncCollections();
      
      // Complete sync tracking
      const duration = Math.floor((Date.now() - startTime) / 1000);
      await this.completeSyncTracking(this.syncId, 'completed', {
        products_synced: productsCount,
        variants_synced: variantsCount,
        inventory_levels_synced: inventoryLevelsCount,
        errors_count: errors.length,
        duration_seconds: duration
      });
      
      console.log(`✅ Full sync completed in ${duration} seconds`);
      console.log(`   - Products: ${productsCount}`);
      console.log(`   - Variants: ${variantsCount}`);
      console.log(`   - Locations: ${locationsCount}`);
      console.log(`   - Inventory Levels: ${inventoryLevelsCount}`);
      
      return {
        success: true,
        productsCount,
        variantsCount,
        locationsCount,
        inventoryLevelsCount,
        errors,
        syncId: this.syncId
      };
      
    } catch (error) {
      console.error('❌ Full sync failed:', error);
      
      if (this.syncId) {
        await this.completeSyncTracking(this.syncId, 'failed', {
          errors_count: 1,
          error_details: { message: error instanceof Error ? error.message : 'Unknown error' }
        });
      }
      
      throw error;
    }
  }

  /**
   * Sync all locations from Shopify
   */
  private async syncLocations(): Promise<number> {
    const query = `
      query {
        locations(first: 10) {
          edges {
            node {
              id
              name
              address {
                address1
                address2
                city
                province
                country
                zip
                phone
              }
              isActive
              isPrimary
            }
          }
        }
      }
    `;
    
    const response = await this.graphqlClient.request<{ locations: { edges: Array<{ node: ShopifyLocation }> } }>(query);
    let count = 0;
    
    for (const edge of response.locations.edges) {
      const location = edge.node;
      const shopifyId = location.id.split('/').pop()!;
      
      await db.query(`
        INSERT INTO shopify_locations (
          shopify_id, shopify_gid, name, address1, address2, 
          city, province, country, zip, phone, active, is_primary
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (shopify_id) DO UPDATE SET
          name = EXCLUDED.name,
          address1 = EXCLUDED.address1,
          address2 = EXCLUDED.address2,
          city = EXCLUDED.city,
          province = EXCLUDED.province,
          country = EXCLUDED.country,
          zip = EXCLUDED.zip,
          phone = EXCLUDED.phone,
          active = EXCLUDED.active,
          is_primary = EXCLUDED.is_primary,
          updated_at = CURRENT_TIMESTAMP
      `, [
        shopifyId,
        location.id,
        location.name,
        location.address.address1,
        location.address.address2,
        location.address.city,
        location.address.province,
        location.address.country,
        location.address.zip,
        location.address.phone,
        location.isActive,
        location.isPrimary
      ]);
      
      count++;
    }
    
    return count;
  }

  /**
   * Sync all products and variants from Shopify
   */
  private async syncProducts(): Promise<{ productsCount: number; variantsCount: number }> {
    let productsCount = 0;
    let variantsCount = 0;
    let hasNextPage = true;
    let cursor: string | null = null;
    
    while (hasNextPage) {
      const query = `
        query getProducts($cursor: String) {
          products(first: 50, after: $cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              node {
                id
                handle
                title
                vendor
                productType
                status
                tags
                createdAt
                updatedAt
                publishedAt
                variants(first: 100) {
                  edges {
                    node {
                      id
                      sku
                      barcode
                      title
                      selectedOptions {
                        name
                        value
                      }
                      price
                      compareAtPrice
                      inventoryQuantity
                      inventoryItem {
                        id
                        unitCost {
                          amount
                        }
                      }
                      taxable
                      position
                      createdAt
                      updatedAt
                    }
                  }
                }
                images(first: 10) {
                  edges {
                    node {
                      id
                      url
                      width
                      height
                      altText
                    }
                  }
                }
              }
            }
          }
        }
      `;
      
      const response = await this.graphqlClient.request<{
        products: {
          pageInfo: { hasNextPage: boolean; endCursor: string };
          edges: Array<{ node: ShopifyProduct }>;
        };
      }>(query, { cursor });
      
      for (const edge of response.products.edges) {
        const product = edge.node;
        const { productId, variantsSynced } = await this.syncSingleProduct(product);
        
        if (productId > 0) {
          productsCount++;
          variantsCount += variantsSynced;
        }
      }
      
      hasNextPage = response.products.pageInfo.hasNextPage;
      cursor = response.products.pageInfo.endCursor;
      
      console.log(`   Synced ${productsCount} products, ${variantsCount} variants so far...`);
    }
    
    return { productsCount, variantsCount };
  }

  /**
   * Sync a single product with its variants
   */
  private async syncSingleProduct(product: ShopifyProduct): Promise<{ productId: number; variantsSynced: number }> {
    const shopifyId = product.id.split('/').pop()!;
    
    try {
      // Insert or update product
      const productResult = await db.query(`
        INSERT INTO shopify_products (
          shopify_id, shopify_gid, handle, title, vendor, 
          product_type, status, tags, created_at_shopify, 
          updated_at_shopify, published_at, synced_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
        ON CONFLICT (shopify_id) DO UPDATE SET
          handle = EXCLUDED.handle,
          title = EXCLUDED.title,
          vendor = EXCLUDED.vendor,
          product_type = EXCLUDED.product_type,
          status = EXCLUDED.status,
          tags = EXCLUDED.tags,
          updated_at_shopify = EXCLUDED.updated_at_shopify,
          published_at = EXCLUDED.published_at,
          synced_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `, [
        shopifyId,
        product.id,
        product.handle,
        product.title,
        product.vendor,
        product.productType,
        product.status.toUpperCase(),
        product.tags.join(','),
        product.createdAt,
        product.updatedAt,
        product.publishedAt
      ]);
      
      const productId = productResult.rows[0].id;
      let variantsSynced = 0;
      
      // Sync variants
      for (const variantEdge of product.variants.edges) {
        const variant = variantEdge.node;
        const variantShopifyId = variant.id.split('/').pop()!;
        
        // Parse options
        const option1 = variant.selectedOptions[0]?.value || null;
        const option2 = variant.selectedOptions[1]?.value || null;
        const option3 = variant.selectedOptions[2]?.value || null;
        
        // Parse cost if available
        const cost = variant.inventoryItem?.unitCost?.amount ? 
          parseFloat(variant.inventoryItem.unitCost.amount) : null;
        
        await db.query(`
          INSERT INTO shopify_variants (
            product_id, shopify_id, shopify_gid, shopify_product_id,
            sku, barcode, title, option1, option2, option3,
            price, compare_at_price, cost, weight, weight_unit,
            inventory_quantity, available_quantity, requires_shipping,
            taxable, position, created_at_shopify, updated_at_shopify,
            synced_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, CURRENT_TIMESTAMP)
          ON CONFLICT (shopify_id) DO UPDATE SET
            product_id = EXCLUDED.product_id,
            sku = EXCLUDED.sku,
            barcode = EXCLUDED.barcode,
            title = EXCLUDED.title,
            option1 = EXCLUDED.option1,
            option2 = EXCLUDED.option2,
            option3 = EXCLUDED.option3,
            price = EXCLUDED.price,
            compare_at_price = EXCLUDED.compare_at_price,
            cost = EXCLUDED.cost,
            weight = EXCLUDED.weight,
            weight_unit = EXCLUDED.weight_unit,
            inventory_quantity = EXCLUDED.inventory_quantity,
            available_quantity = EXCLUDED.available_quantity,
            requires_shipping = EXCLUDED.requires_shipping,
            taxable = EXCLUDED.taxable,
            position = EXCLUDED.position,
            updated_at_shopify = EXCLUDED.updated_at_shopify,
            synced_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        `, [
          productId,
          variantShopifyId,
          variant.id,
          shopifyId,
          variant.sku,
          variant.barcode,
          variant.title,
          option1,
          option2,
          option3,
          parseFloat(variant.price),
          variant.compareAtPrice ? parseFloat(variant.compareAtPrice) : null,
          cost,
          null, // weight
          null, // weight_unit
          variant.inventoryQuantity,
          variant.inventoryQuantity, // available_quantity same as inventory_quantity initially
          true, // requires_shipping - default to true
          variant.taxable,
          variant.position,
          variant.createdAt,
          variant.updatedAt
        ]);
        
        variantsSynced++;
      }
      
      // Sync images
      let position = 0;
      for (const imageEdge of product.images.edges) {
        const image = imageEdge.node;
        const imageShopifyId = image.id.split('/').pop()!;
        
        await db.query(`
          INSERT INTO shopify_product_images (
            product_id, shopify_id, shopify_product_id, position,
            src, width, height, alt_text
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (shopify_id) DO UPDATE SET
            position = EXCLUDED.position,
            src = EXCLUDED.src,
            width = EXCLUDED.width,
            height = EXCLUDED.height,
            alt_text = EXCLUDED.alt_text,
            updated_at = CURRENT_TIMESTAMP
        `, [
          productId,
          imageShopifyId,
          shopifyId,
          position++,
          image.url,
          image.width,
          image.height,
          image.altText
        ]);
      }
      
      return { productId, variantsSynced };
      
    } catch (error) {
      console.error(`Error syncing product ${product.handle}:`, error);
      return { productId: 0, variantsSynced: 0 };
    }
  }

  /**
   * Sync inventory levels for all variants
   */
  private async syncInventoryLevels(): Promise<number> {
    // Get all locations
    const locationsResult = await db.query('SELECT id, shopify_gid FROM shopify_locations WHERE active = true');
    const locations = locationsResult.rows;
    
    // Get all variants in batches
    const variantsResult = await db.query(`
      SELECT v.id, v.shopify_gid, v.shopify_id
      FROM shopify_variants v
      JOIN shopify_products p ON v.product_id = p.id
      WHERE p.status = 'ACTIVE'
    `);
    
    let count = 0;
    const batchSize = 100;
    
    for (let i = 0; i < variantsResult.rows.length; i += batchSize) {
      const batch = variantsResult.rows.slice(i, i + batchSize);
      // Escape the GraphQL IDs properly for the query
      const variantIds = batch.map(v => {
        // Escape backslashes and quotes in the GID
        const escapedGid = v.shopify_gid.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        return `\\"${escapedGid}\\"`;
      }).join(',');
      
      for (const location of locations) {
        const query = `
          query {
            inventoryItems(first: 100, query: "variant_id:[${variantIds}]") {
              edges {
                node {
                  id
                  variant {
                    id
                  }
                  inventoryLevels(first: 10) {
                    edges {
                      node {
                        id
                        location {
                          id
                        }
                        quantities(names: ["available", "incoming", "committed"]) {
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
          const response = await this.graphqlClient.request<any>(query);
          
          for (const edge of response.inventoryItems.edges) {
            const item = edge.node;
            const variantGid = item.variant.id;
            const variant = batch.find(v => v.shopify_gid === variantGid);
            
            if (variant && item.inventoryLevels.edges.length > 0) {
              // Find the inventory level for the current location
              const levelEdge = item.inventoryLevels.edges.find((e: any) => 
                e.node.location.id === location.shopify_gid
              );
              
              if (levelEdge) {
                const level = levelEdge.node;
                
                // Extract quantities from the quantities array
                const quantities = level.quantities.reduce((acc: any, q: any) => {
                  acc[q.name] = q.quantity;
                  return acc;
                }, {});
                
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
                  variant.id,
                  location.id,
                  item.id.split('/').pop(),
                  quantities.available || 0,
                  quantities.incoming || 0,
                  quantities.committed || 0,
                  level.updatedAt
                ]);
                
                count++;
              }
            }
          }
        } catch (error) {
          console.error(`Error syncing inventory levels for batch:`, error);
        }
      }
      
      console.log(`   Synced ${count} inventory levels so far...`);
    }
    
    return count;
  }

  /**
   * Sync collections from Shopify
   */
  private async syncCollections(): Promise<number> {
    let count = 0;
    let hasNextPage = true;
    let cursor: string | null = null;
    
    while (hasNextPage) {
      const query = `
        query getCollections($cursor: String) {
          collections(first: 50, after: $cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              node {
                id
                handle
                title
                sortOrder
                productsCount {
                  count
                }
                ruleSet {
                  appliedDisjunctively
                }
                updatedAt
              }
            }
          }
        }
      `;
      
      const response = await this.graphqlClient.request<any>(query, { cursor });
      
      for (const edge of response.collections.edges) {
        const collection = edge.node;
        const shopifyId = collection.id.split('/').pop()!;
        const collectionType = collection.ruleSet ? 'smart' : 'custom';
        // Extract the count from the productsCount object
        const productsCount = collection.productsCount?.count || 0;
        
        await db.query(`
          INSERT INTO shopify_collections (
            shopify_id, shopify_gid, handle, title,
            collection_type, sort_order, products_count,
            published, updated_at_shopify, synced_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
          ON CONFLICT (shopify_id) DO UPDATE SET
            handle = EXCLUDED.handle,
            title = EXCLUDED.title,
            collection_type = EXCLUDED.collection_type,
            sort_order = EXCLUDED.sort_order,
            products_count = EXCLUDED.products_count,
            updated_at_shopify = EXCLUDED.updated_at_shopify,
            synced_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        `, [
          shopifyId,
          collection.id,
          collection.handle,
          collection.title,
          collectionType,
          collection.sortOrder,
          productsCount,
          true,
          collection.updatedAt
        ]);
        
        count++;
        
        // Sync products in collection
        await this.syncCollectionProducts(shopifyId, collection.id);
      }
      
      hasNextPage = response.collections.pageInfo.hasNextPage;
      cursor = response.collections.pageInfo.endCursor;
    }
    
    console.log(`   Synced ${count} collections`);
    return count;
  }

  /**
   * Sync products belonging to a collection
   */
  private async syncCollectionProducts(collectionDbId: string, collectionGid: string): Promise<void> {
    const query = `
      query getCollectionProducts($collectionId: ID!) {
        collection(id: $collectionId) {
          products(first: 250) {
            edges {
              node {
                id
              }
            }
          }
        }
      }
    `;
    
    try {
      const response = await this.graphqlClient.request<any>(query, { collectionId: collectionGid });
      
      // Get collection ID from database
      const collectionResult = await db.query(
        'SELECT id FROM shopify_collections WHERE shopify_id = $1',
        [collectionDbId]
      );
      
      if (collectionResult.rows.length === 0) return;
      
      const collectionId = collectionResult.rows[0].id;
      
      for (const edge of response.collection.products.edges) {
        const productShopifyId = edge.node.id.split('/').pop()!;
        
        // Get product ID from database
        const productResult = await db.query(
          'SELECT id FROM shopify_products WHERE shopify_id = $1',
          [productShopifyId]
        );
        
        if (productResult.rows.length > 0) {
          const productId = productResult.rows[0].id;
          
          await db.query(`
            INSERT INTO shopify_product_collections (product_id, collection_id)
            VALUES ($1, $2)
            ON CONFLICT (product_id, collection_id) DO NOTHING
          `, [productId, collectionId]);
        }
      }
    } catch (error) {
      console.error(`Error syncing products for collection ${collectionDbId}:`, error);
    }
  }

  /**
   * Start tracking a sync operation
   */
  private async startSyncTracking(syncType: string): Promise<number> {
    const result = await db.query(`
      INSERT INTO shopify_sync_history (sync_type, status, started_at)
      VALUES ($1, 'started', CURRENT_TIMESTAMP)
      RETURNING id
    `, [syncType]);
    
    return result.rows[0].id;
  }

  /**
   * Complete tracking a sync operation
   */
  private async completeSyncTracking(syncId: number, status: string, data: any): Promise<void> {
    await db.query(`
      UPDATE shopify_sync_history
      SET status = $2,
          products_synced = $3,
          variants_synced = $4,
          inventory_levels_synced = $5,
          errors_count = $6,
          error_details = $7,
          completed_at = CURRENT_TIMESTAMP,
          duration_seconds = $8
      WHERE id = $1
    `, [
      syncId,
      status,
      data.products_synced || 0,
      data.variants_synced || 0,
      data.inventory_levels_synced || 0,
      data.errors_count || 0,
      data.error_details ? JSON.stringify(data.error_details) : null,
      data.duration_seconds || 0
    ]);
  }

  /**
   * Sync only collections (useful for re-syncing after product sync)
   */
  async syncCollectionsOnly(): Promise<SyncResult> {
    console.log('🚀 Starting collections only sync...');
    const startTime = Date.now();
    const errors: any[] = [];
    
    try {
      // Start sync tracking
      this.syncId = await this.startSyncTracking('collections');
      
      // Sync collections
      console.log('🏷️ Syncing collections...');
      const collectionsCount = await this.syncCollections();
      
      // Complete sync tracking
      const duration = Math.floor((Date.now() - startTime) / 1000);
      await this.completeSyncTracking(this.syncId, 'completed', {
        products_synced: 0,
        variants_synced: 0,
        inventory_levels_synced: 0,
        collections_synced: collectionsCount,
        errors_count: errors.length,
        duration_seconds: duration
      });
      
      console.log(`✅ Collections sync completed in ${duration} seconds`);
      console.log(`   - Collections: ${collectionsCount}`);
      
      return {
        success: true,
        productsCount: 0,
        variantsCount: 0,
        locationsCount: 0,
        inventoryLevelsCount: 0,
        collectionsCount: collectionsCount,
        errors,
        syncId: this.syncId
      };
      
    } catch (error) {
      console.error('❌ Collections sync failed:', error);
      
      if (this.syncId) {
        await this.completeSyncTracking(this.syncId, 'failed', {
          errors_count: 1,
          error_details: { message: error instanceof Error ? error.message : 'Unknown error' }
        });
      }
      
      throw error;
    }
  }

  /**
   * Sync only inventory levels (useful for re-syncing after product sync)
   */
  async syncInventoryLevelsOnly(): Promise<SyncResult> {
    console.log('🚀 Starting inventory levels only sync...');
    const startTime = Date.now();
    const errors: any[] = [];
    
    try {
      // Start sync tracking
      this.syncId = await this.startSyncTracking('inventory_levels');
      
      // Sync inventory levels
      console.log('📊 Syncing inventory levels...');
      const inventoryLevelsCount = await this.syncInventoryLevels();
      
      // Complete sync tracking
      const duration = Math.floor((Date.now() - startTime) / 1000);
      await this.completeSyncTracking(this.syncId, 'completed', {
        products_synced: 0,
        variants_synced: 0,
        inventory_levels_synced: inventoryLevelsCount,
        errors_count: errors.length,
        duration_seconds: duration
      });
      
      console.log(`✅ Inventory levels sync completed in ${duration} seconds`);
      console.log(`   - Inventory Levels: ${inventoryLevelsCount}`);
      
      return {
        success: true,
        productsCount: 0,
        variantsCount: 0,
        locationsCount: 0,
        inventoryLevelsCount,
        errors,
        syncId: this.syncId
      };
      
    } catch (error) {
      console.error('❌ Inventory levels sync failed:', error);
      
      if (this.syncId) {
        await this.completeSyncTracking(this.syncId, 'failed', {
          errors_count: 1,
          error_details: { message: error instanceof Error ? error.message : 'Unknown error' }
        });
      }
      
      throw error;
    }
  }

  /**
   * Get inventory statistics
   */
  async getInventoryStats(): Promise<any> {
    const stats = await db.query(`
      SELECT 
        COUNT(DISTINCT p.id) as total_products,
        COUNT(DISTINCT v.id) as total_variants,
        COUNT(DISTINCT CASE WHEN v.inventory_quantity > 0 THEN v.id END) as in_stock_variants,
        COUNT(DISTINCT CASE WHEN v.inventory_quantity = 0 THEN v.id END) as out_of_stock_variants,
        COUNT(DISTINCT CASE WHEN v.inventory_quantity <= 10 AND v.inventory_quantity > 0 THEN v.id END) as low_stock_variants,
        SUM(v.inventory_quantity) as total_units,
        SUM(v.inventory_quantity * v.price) as total_inventory_value,
        MAX(p.synced_at) as last_sync
      FROM shopify_products p
      LEFT JOIN shopify_variants v ON p.id = v.product_id
      WHERE p.status = 'ACTIVE'
    `);
    
    const recentSync = await db.query(`
      SELECT * FROM shopify_sync_history
      ORDER BY started_at DESC
      LIMIT 1
    `);
    
    return {
      ...stats.rows[0],
      last_sync_details: recentSync.rows[0] || null
    };
  }

  /**
   * Check for low stock items
   */
  async checkLowStock(threshold: number = 10): Promise<any[]> {
    const result = await db.query(`
      SELECT 
        p.title as product_title,
        p.handle,
        v.sku,
        v.title as variant_title,
        v.inventory_quantity,
        v.price
      FROM shopify_variants v
      JOIN shopify_products p ON v.product_id = p.id
      WHERE v.inventory_quantity > 0 
        AND v.inventory_quantity <= $1
        AND p.status = 'ACTIVE'
      ORDER BY v.inventory_quantity ASC
    `, [threshold]);
    
    return result.rows;
  }

  /**
   * Get out of stock items
   */
  async getOutOfStock(): Promise<any[]> {
    const result = await db.query(`
      SELECT 
        p.title as product_title,
        p.handle,
        v.sku,
        v.title as variant_title,
        v.price,
        v.updated_at_shopify as last_updated
      FROM shopify_variants v
      JOIN shopify_products p ON v.product_id = p.id
      WHERE v.inventory_quantity = 0
        AND p.status = 'ACTIVE'
      ORDER BY p.title, v.position
    `);
    
    return result.rows;
  }
}