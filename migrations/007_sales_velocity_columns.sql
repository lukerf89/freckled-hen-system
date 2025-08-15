-- Migration 007: Add Sales Velocity Tracking Columns
-- Adds weekly sales tracking and velocity categorization for dynamic pricing

-- Add velocity tracking columns to shopify_variants
ALTER TABLE shopify_variants ADD COLUMN IF NOT EXISTS weekly_sales_units DECIMAL(10,2) DEFAULT 0;
ALTER TABLE shopify_variants ADD COLUMN IF NOT EXISTS weekly_sales_revenue DECIMAL(10,2) DEFAULT 0;
ALTER TABLE shopify_variants ADD COLUMN IF NOT EXISTS velocity_category VARCHAR(20) DEFAULT 'unknown';
ALTER TABLE shopify_variants ADD COLUMN IF NOT EXISTS weeks_of_stock DECIMAL(10,1) DEFAULT 0;
ALTER TABLE shopify_variants ADD COLUMN IF NOT EXISTS reorder_urgency VARCHAR(20) DEFAULT 'low';
ALTER TABLE shopify_variants ADD COLUMN IF NOT EXISTS price_elasticity_score INTEGER DEFAULT 50;
ALTER TABLE shopify_variants ADD COLUMN IF NOT EXISTS last_sale_date DATE;
ALTER TABLE shopify_variants ADD COLUMN IF NOT EXISTS trend_direction VARCHAR(20) DEFAULT 'stable';

-- Create index for velocity queries
CREATE INDEX IF NOT EXISTS idx_variants_velocity ON shopify_variants(velocity_category, reorder_urgency);
CREATE INDEX IF NOT EXISTS idx_variants_weeks_stock ON shopify_variants(weeks_of_stock) WHERE weeks_of_stock <= 12;
CREATE INDEX IF NOT EXISTS idx_variants_last_sale ON shopify_variants(last_sale_date) WHERE last_sale_date IS NOT NULL;

-- Add constraints for velocity categories
ALTER TABLE shopify_variants ADD CONSTRAINT IF NOT EXISTS chk_velocity_category 
  CHECK (velocity_category IN ('fast', 'medium', 'slow', 'dead', 'unknown'));

ALTER TABLE shopify_variants ADD CONSTRAINT IF NOT EXISTS chk_reorder_urgency 
  CHECK (reorder_urgency IN ('critical', 'high', 'medium', 'low'));

ALTER TABLE shopify_variants ADD CONSTRAINT IF NOT EXISTS chk_trend_direction 
  CHECK (trend_direction IN ('increasing', 'stable', 'declining'));

-- Add comment to migration tracker
INSERT INTO migrations (filename, executed_at) 
VALUES ('007_sales_velocity_columns.sql', CURRENT_TIMESTAMP)
ON CONFLICT (filename) DO UPDATE SET executed_at = CURRENT_TIMESTAMP;