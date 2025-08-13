-- Migration: Add Shopify Inventory Tables
-- Version: 003
-- Description: Creates tables for Shopify product and inventory management

-- Products table (parent products from Shopify)
CREATE TABLE IF NOT EXISTS shopify_products (
  id SERIAL PRIMARY KEY,
  shopify_id VARCHAR(255) UNIQUE NOT NULL,
  shopify_gid VARCHAR(255) UNIQUE NOT NULL,
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

CREATE INDEX idx_shopify_products_handle ON shopify_products(handle);
CREATE INDEX idx_shopify_products_status ON shopify_products(status);
CREATE INDEX idx_shopify_products_synced ON shopify_products(synced_at);

-- Product variants table (individual SKUs)
CREATE TABLE IF NOT EXISTS shopify_variants (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES shopify_products(id) ON DELETE CASCADE,
  shopify_id VARCHAR(255) UNIQUE NOT NULL,
  shopify_gid VARCHAR(255) UNIQUE NOT NULL,
  shopify_product_id VARCHAR(255) NOT NULL,
  sku VARCHAR(255),
  barcode VARCHAR(255),
  title VARCHAR(500) NOT NULL,
  option1 VARCHAR(255),
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

CREATE INDEX idx_shopify_variants_sku ON shopify_variants(sku);
CREATE INDEX idx_shopify_variants_barcode ON shopify_variants(barcode);
CREATE INDEX idx_shopify_variants_product ON shopify_variants(product_id);
CREATE INDEX idx_shopify_variants_inventory ON shopify_variants(inventory_quantity);
CREATE INDEX idx_shopify_variants_synced ON shopify_variants(synced_at);

-- Inventory locations
CREATE TABLE IF NOT EXISTS shopify_locations (
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

-- Inventory levels by location
CREATE TABLE IF NOT EXISTS shopify_inventory_levels (
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

CREATE INDEX idx_inventory_levels_variant ON shopify_inventory_levels(variant_id);
CREATE INDEX idx_inventory_levels_location ON shopify_inventory_levels(location_id);
CREATE INDEX idx_inventory_levels_synced ON shopify_inventory_levels(synced_at);

-- Product images
CREATE TABLE IF NOT EXISTS shopify_product_images (
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

CREATE INDEX idx_product_images_product ON shopify_product_images(product_id);

-- Sync history and monitoring
CREATE TABLE IF NOT EXISTS shopify_sync_history (
  id SERIAL PRIMARY KEY,
  sync_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
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

CREATE INDEX idx_sync_history_status ON shopify_sync_history(status);
CREATE INDEX idx_sync_history_type ON shopify_sync_history(sync_type);
CREATE INDEX idx_sync_history_started ON shopify_sync_history(started_at);

-- Inventory alerts
CREATE TABLE IF NOT EXISTS inventory_alerts (
  id SERIAL PRIMARY KEY,
  variant_id INTEGER REFERENCES shopify_variants(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL,
  threshold_value INTEGER,
  current_value INTEGER,
  message TEXT,
  severity VARCHAR(20) DEFAULT 'warning',
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by VARCHAR(255),
  acknowledged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_alerts_variant ON inventory_alerts(variant_id);
CREATE INDEX idx_inventory_alerts_type ON inventory_alerts(alert_type);
CREATE INDEX idx_inventory_alerts_severity ON inventory_alerts(severity);
CREATE INDEX idx_inventory_alerts_acknowledged ON inventory_alerts(acknowledged);

-- AI processing queue
CREATE TABLE IF NOT EXISTS ai_processing_queue (
  id SERIAL PRIMARY KEY,
  variant_id INTEGER REFERENCES shopify_variants(id) ON DELETE CASCADE,
  processing_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  priority INTEGER DEFAULT 5,
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

CREATE INDEX idx_ai_queue_status ON ai_processing_queue(status);
CREATE INDEX idx_ai_queue_priority ON ai_processing_queue(priority, scheduled_at);
CREATE INDEX idx_ai_queue_variant ON ai_processing_queue(variant_id);

-- Collections
CREATE TABLE IF NOT EXISTS shopify_collections (
  id SERIAL PRIMARY KEY,
  shopify_id VARCHAR(255) UNIQUE NOT NULL,
  shopify_gid VARCHAR(255) UNIQUE NOT NULL,
  handle VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  collection_type VARCHAR(50),
  sort_order VARCHAR(50),
  products_count INTEGER DEFAULT 0,
  published BOOLEAN DEFAULT true,
  created_at_shopify TIMESTAMP,
  updated_at_shopify TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_collections_handle ON shopify_collections(handle);
CREATE INDEX idx_collections_type ON shopify_collections(collection_type);

-- Product-Collection relationships
CREATE TABLE IF NOT EXISTS shopify_product_collections (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES shopify_products(id) ON DELETE CASCADE,
  collection_id INTEGER REFERENCES shopify_collections(id) ON DELETE CASCADE,
  position INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, collection_id)
);

CREATE INDEX idx_product_collections_product ON shopify_product_collections(product_id);
CREATE INDEX idx_product_collections_collection ON shopify_product_collections(collection_id);

-- Metafields
CREATE TABLE IF NOT EXISTS shopify_metafields (
  id SERIAL PRIMARY KEY,
  shopify_id VARCHAR(255) UNIQUE NOT NULL,
  namespace VARCHAR(255) NOT NULL,
  key VARCHAR(255) NOT NULL,
  value TEXT,
  value_type VARCHAR(50),
  owner_id VARCHAR(255) NOT NULL,
  owner_resource VARCHAR(50) NOT NULL,
  created_at_shopify TIMESTAMP,
  updated_at_shopify TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_metafields_owner ON shopify_metafields(owner_id, owner_resource);
CREATE INDEX idx_metafields_namespace_key ON shopify_metafields(namespace, key);

-- Update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_shopify_products_updated_at BEFORE UPDATE ON shopify_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopify_variants_updated_at BEFORE UPDATE ON shopify_variants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopify_locations_updated_at BEFORE UPDATE ON shopify_locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopify_inventory_levels_updated_at BEFORE UPDATE ON shopify_inventory_levels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopify_product_images_updated_at BEFORE UPDATE ON shopify_product_images
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_alerts_updated_at BEFORE UPDATE ON inventory_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_processing_queue_updated_at BEFORE UPDATE ON ai_processing_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopify_collections_updated_at BEFORE UPDATE ON shopify_collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopify_metafields_updated_at BEFORE UPDATE ON shopify_metafields
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE OR REPLACE VIEW inventory_summary AS
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
WHERE p.status = 'ACTIVE';

CREATE OR REPLACE VIEW sync_status AS
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