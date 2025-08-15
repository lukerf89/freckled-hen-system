# Freckled Hen Inventory Management - Database Schema

**Overview**: PostgreSQL schema optimized for 3,000+ SKUs with variants, supporting Shopify sync and AI automation.

## Core Tables

### 1. shopify_products
**Purpose**: Parent products from Shopify catalog
```sql
CREATE TABLE shopify_products (
  id SERIAL PRIMARY KEY,
  shopify_id VARCHAR(255) UNIQUE NOT NULL,
  shopify_gid VARCHAR(255) UNIQUE NOT NULL, -- GraphQL ID
  handle VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  vendor VARCHAR(255),
  product_type VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  tags TEXT,
  created_at_shopify TIMESTAMP,
  updated_at_shopify TIMESTAMP,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
**Indexes**: handle, status, synced_at

### 2. shopify_variants
**Purpose**: Individual SKUs/variants for each product
```sql
CREATE TABLE shopify_variants (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES shopify_products(id) ON DELETE CASCADE,
  shopify_id VARCHAR(255) UNIQUE NOT NULL,
  shopify_gid VARCHAR(255) UNIQUE NOT NULL,
  shopify_product_id VARCHAR(255) NOT NULL,
  sku VARCHAR(255),
  barcode VARCHAR(255),
  title VARCHAR(500) NOT NULL,
  option1 VARCHAR(255), -- Size, Color, etc.
  option2 VARCHAR(255),
  option3 VARCHAR(255),
  price DECIMAL(10, 2),
  compare_at_price DECIMAL(10, 2),
  cost DECIMAL(10, 2),
  weight DECIMAL(10, 3),
  weight_unit VARCHAR(10),
  inventory_quantity INTEGER DEFAULT 0,
  available_quantity INTEGER DEFAULT 0,
  inventory_policy VARCHAR(50),
  fulfillment_service VARCHAR(100),
  requires_shipping BOOLEAN DEFAULT true,
  taxable BOOLEAN DEFAULT true,
  position INTEGER,
  created_at_shopify TIMESTAMP,
  updated_at_shopify TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
**Indexes**: sku, barcode, product_id, inventory_quantity, synced_at

### 3. shopify_locations
**Purpose**: Shopify locations/warehouses for inventory tracking
```sql
CREATE TABLE shopify_locations (
  id SERIAL PRIMARY KEY,
  shopify_id VARCHAR(255) UNIQUE NOT NULL,
  shopify_gid VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  address1 VARCHAR(255),
  address2 VARCHAR(255),
  city VARCHAR(255),
  province VARCHAR(255),
  country VARCHAR(255),
  zip VARCHAR(50),
  phone VARCHAR(50),
  active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. shopify_inventory_levels
**Purpose**: Inventory quantities by variant and location
```sql
CREATE TABLE shopify_inventory_levels (
  id SERIAL PRIMARY KEY,
  variant_id INTEGER REFERENCES shopify_variants(id) ON DELETE CASCADE,
  location_id INTEGER REFERENCES shopify_locations(id) ON DELETE CASCADE,
  inventory_item_id VARCHAR(255) NOT NULL,
  available_quantity INTEGER DEFAULT 0,
  incoming_quantity INTEGER DEFAULT 0,
  committed_quantity INTEGER DEFAULT 0,
  updated_at_shopify TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(variant_id, location_id)
);
```
**Indexes**: variant_id, location_id, synced_at

## Media & Collections

### 5. shopify_product_images
**Purpose**: Product images and metadata
```sql
CREATE TABLE shopify_product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES shopify_products(id) ON DELETE CASCADE,
  shopify_id VARCHAR(255) UNIQUE NOT NULL,
  shopify_product_id VARCHAR(255) NOT NULL,
  position INTEGER,
  src TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  alt_text TEXT,
  created_at_shopify TIMESTAMP,
  updated_at_shopify TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
**Indexes**: product_id

### 6. shopify_collections
**Purpose**: Product collections/categories
```sql
CREATE TABLE shopify_collections (
  id SERIAL PRIMARY KEY,
  shopify_id VARCHAR(255) UNIQUE NOT NULL,
  shopify_gid VARCHAR(255) UNIQUE NOT NULL,
  handle VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  collection_type VARCHAR(50), -- 'smart' or 'custom'
  sort_order VARCHAR(50),
  products_count INTEGER DEFAULT 0,
  published BOOLEAN DEFAULT true,
  created_at_shopify TIMESTAMP,
  updated_at_shopify TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
**Indexes**: handle, collection_type

### 7. shopify_product_collections
**Purpose**: Many-to-many relationship between products and collections
```sql
CREATE TABLE shopify_product_collections (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES shopify_products(id) ON DELETE CASCADE,
  collection_id INTEGER REFERENCES shopify_collections(id) ON DELETE CASCADE,
  position INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, collection_id)
);
```
**Indexes**: product_id, collection_id

## Monitoring & Automation

### 8. shopify_sync_history
**Purpose**: Track sync operations and performance
```sql
CREATE TABLE shopify_sync_history (
  id SERIAL PRIMARY KEY,
  sync_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'product', 'inventory'
  status VARCHAR(50) NOT NULL, -- 'started', 'completed', 'failed'
  products_synced INTEGER DEFAULT 0,
  variants_synced INTEGER DEFAULT 0,
  inventory_levels_synced INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  error_details JSONB,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  duration_seconds INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
**Indexes**: status, sync_type, started_at

### 9. inventory_alerts
**Purpose**: Automated inventory alerts and thresholds
```sql
CREATE TABLE inventory_alerts (
  id SERIAL PRIMARY KEY,
  variant_id INTEGER REFERENCES shopify_variants(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL, -- 'low_stock', 'out_of_stock', 'overstock'
  threshold_value INTEGER,
  current_value INTEGER,
  message TEXT,
  severity VARCHAR(20) DEFAULT 'warning', -- 'info', 'warning', 'critical'
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by VARCHAR(255),
  acknowledged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
**Indexes**: variant_id, alert_type, severity, acknowledged

### 10. ai_processing_queue
**Purpose**: Queue for AI automation tasks
```sql
CREATE TABLE ai_processing_queue (
  id SERIAL PRIMARY KEY,
  variant_id INTEGER REFERENCES shopify_variants(id) ON DELETE CASCADE,
  processing_type VARCHAR(50) NOT NULL, -- 'description', 'categorization', 'pricing', 'bundling'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  priority INTEGER DEFAULT 5, -- 1-10, 1 being highest
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
**Indexes**: status, priority + scheduled_at, variant_id

## Extensibility

### 11. shopify_metafields
**Purpose**: Custom data fields for products/variants/collections
```sql
CREATE TABLE shopify_metafields (
  id SERIAL PRIMARY KEY,
  shopify_id VARCHAR(255) UNIQUE NOT NULL,
  namespace VARCHAR(255) NOT NULL,
  key VARCHAR(255) NOT NULL,
  value TEXT,
  value_type VARCHAR(50),
  owner_id VARCHAR(255) NOT NULL,
  owner_resource VARCHAR(50) NOT NULL, -- 'product', 'variant', 'collection'
  created_at_shopify TIMESTAMP,
  updated_at_shopify TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
**Indexes**: owner_id + owner_resource, namespace + key

## Views

### inventory_summary
**Purpose**: Quick overview of inventory status
```sql
CREATE VIEW inventory_summary AS
SELECT 
    p.id as product_id,
    p.title as product_title,
    p.handle as product_handle,
    v.id as variant_id,
    v.sku,
    v.title as variant_title,
    v.price,
    v.inventory_quantity,
    v.available_quantity,
    CASE 
        WHEN v.inventory_quantity <= 0 THEN 'out_of_stock'
        WHEN v.inventory_quantity <= 10 THEN 'low_stock'
        ELSE 'in_stock'
    END as stock_status,
    v.synced_at
FROM shopify_products p
JOIN shopify_variants v ON p.id = v.product_id
WHERE p.status = 'active';
```

### sync_status
**Purpose**: Recent sync history with status classification
```sql
CREATE VIEW sync_status AS
SELECT 
    sync_type,
    status,
    products_synced,
    variants_synced,
    inventory_levels_synced,
    errors_count,
    started_at,
    completed_at,
    duration_seconds,
    CASE 
        WHEN status = 'completed' AND errors_count = 0 THEN 'success'
        WHEN status = 'completed' AND errors_count > 0 THEN 'partial'
        WHEN status = 'failed' THEN 'failed'
        ELSE 'in_progress'
    END as result
FROM shopify_sync_history
ORDER BY started_at DESC
LIMIT 10;
```

## Key Relationships

1. **Products → Variants** (1:Many)
   - One product can have multiple variants (sizes, colors, etc.)

2. **Variants → Inventory Levels** (1:Many)
   - Each variant can have inventory at multiple locations

3. **Locations → Inventory Levels** (1:Many)
   - Each location tracks inventory for multiple variants

4. **Products → Images** (1:Many)
   - Products can have multiple images

5. **Products ↔ Collections** (Many:Many via junction table)
   - Products can belong to multiple collections

6. **Variants → Alerts** (1:Many)
   - Variants can have multiple active alerts

7. **Variants → AI Queue** (1:Many)
   - Variants can have multiple AI processing tasks

## Performance Features

- **Comprehensive Indexing**: All foreign keys, lookup fields, and frequently queried columns
- **Automatic Timestamps**: Updated_at triggers on all main tables
- **Efficient Pagination**: Indexed sync timestamps for incremental updates
- **JSONB Storage**: Flexible data storage for API responses and AI processing
- **Cascade Deletes**: Proper cleanup when parent records are removed

## Scale Optimization

- **Batch Processing**: Designed for efficient bulk operations
- **Incremental Sync**: Track last sync times for delta updates
- **Queue Management**: Priority-based AI processing with retry logic
- **Alert Throttling**: Prevent duplicate alerts with acknowledgment system
- **Connection Pooling**: Optimized for high-concurrency access patterns

This schema supports the full Shopify inventory pipeline with real-time monitoring, AI automation capabilities, and multi-location inventory tracking for 3,000+ SKUs.