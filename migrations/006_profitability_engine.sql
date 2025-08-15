-- Migration 006: CFO Profitability Engine Schema
-- Adds advanced profitability fields and cash management tables
-- Supports automated clearance pricing and cash impact scoring

-- 1. Add profitability fields to shopify_products table
ALTER TABLE shopify_products ADD COLUMN IF NOT EXISTS wholesale_cost DECIMAL(10,2);
ALTER TABLE shopify_products ADD COLUMN IF NOT EXISTS margin_percentage DECIMAL(5,2);
ALTER TABLE shopify_products ADD COLUMN IF NOT EXISTS cash_impact_score DECIMAL(8,2) DEFAULT 0;
ALTER TABLE shopify_products ADD COLUMN IF NOT EXISTS q4_item BOOLEAN DEFAULT false;
ALTER TABLE shopify_products ADD COLUMN IF NOT EXISTS seasonal_item BOOLEAN DEFAULT false;
ALTER TABLE shopify_products ADD COLUMN IF NOT EXISTS traffic_driver BOOLEAN DEFAULT false;
ALTER TABLE shopify_products ADD COLUMN IF NOT EXISTS clearance_candidate BOOLEAN DEFAULT false;
ALTER TABLE shopify_products ADD COLUMN IF NOT EXISTS days_no_sales INTEGER DEFAULT 0;
ALTER TABLE shopify_products ADD COLUMN IF NOT EXISTS weekly_revenue DECIMAL(10,2) DEFAULT 0;
ALTER TABLE shopify_products ADD COLUMN IF NOT EXISTS last_sale_date TIMESTAMP;
ALTER TABLE shopify_products ADD COLUMN IF NOT EXISTS sell_through_rate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE shopify_products ADD COLUMN IF NOT EXISTS seasonal_type VARCHAR(20);
ALTER TABLE shopify_products ADD COLUMN IF NOT EXISTS seasonal_end_date DATE;
ALTER TABLE shopify_products ADD COLUMN IF NOT EXISTS clearance_tier VARCHAR(20);
ALTER TABLE shopify_products ADD COLUMN IF NOT EXISTS profit_protection_threshold DECIMAL(5,2);
ALTER TABLE shopify_products ADD COLUMN IF NOT EXISTS psychological_price_point DECIMAL(8,2);
ALTER TABLE shopify_products ADD COLUMN IF NOT EXISTS bundle_eligible BOOLEAN DEFAULT false;

-- 2. Add profitability fields to shopify_variants table (for individual SKU tracking)
ALTER TABLE shopify_variants ADD COLUMN IF NOT EXISTS wholesale_cost DECIMAL(10,2);
ALTER TABLE shopify_variants ADD COLUMN IF NOT EXISTS margin_percentage DECIMAL(5,2);
ALTER TABLE shopify_variants ADD COLUMN IF NOT EXISTS cash_impact_score DECIMAL(8,2) DEFAULT 0;
ALTER TABLE shopify_variants ADD COLUMN IF NOT EXISTS q4_item BOOLEAN DEFAULT false;
ALTER TABLE shopify_variants ADD COLUMN IF NOT EXISTS seasonal_item BOOLEAN DEFAULT false;
ALTER TABLE shopify_variants ADD COLUMN IF NOT EXISTS traffic_driver BOOLEAN DEFAULT false;
ALTER TABLE shopify_variants ADD COLUMN IF NOT EXISTS clearance_candidate BOOLEAN DEFAULT false;
ALTER TABLE shopify_variants ADD COLUMN IF NOT EXISTS days_no_sales INTEGER DEFAULT 0;
ALTER TABLE shopify_variants ADD COLUMN IF NOT EXISTS weekly_revenue DECIMAL(10,2) DEFAULT 0;
ALTER TABLE shopify_variants ADD COLUMN IF NOT EXISTS last_sale_date TIMESTAMP;
ALTER TABLE shopify_variants ADD COLUMN IF NOT EXISTS sell_through_rate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE shopify_variants ADD COLUMN IF NOT EXISTS seasonal_type VARCHAR(20);
ALTER TABLE shopify_variants ADD COLUMN IF NOT EXISTS seasonal_end_date DATE;
ALTER TABLE shopify_variants ADD COLUMN IF NOT EXISTS clearance_tier VARCHAR(20);
ALTER TABLE shopify_variants ADD COLUMN IF NOT EXISTS profit_protection_threshold DECIMAL(5,2);
ALTER TABLE shopify_variants ADD COLUMN IF NOT EXISTS psychological_price_point DECIMAL(8,2);
ALTER TABLE shopify_variants ADD COLUMN IF NOT EXISTS bundle_eligible BOOLEAN DEFAULT false;

-- 3. Daily cash status tracking
CREATE TABLE IF NOT EXISTS daily_cash_status (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE DEFAULT CURRENT_DATE,
  available_cash DECIMAL(12,2),
  pending_payables DECIMAL(12,2),
  critical_orders_value DECIMAL(12,2),
  weekly_pipeline_value DECIMAL(12,2),
  cash_adequacy_status VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Inventory alerts and profitability tracking
CREATE TABLE IF NOT EXISTS inventory_alerts (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES shopify_products(id),
  variant_id INTEGER REFERENCES shopify_variants(id),
  alert_type VARCHAR(30),
  cash_impact_score DECIMAL(8,2),
  priority_level VARCHAR(20),
  suggested_action TEXT,
  reasoning TEXT,
  vendor_name VARCHAR(100),
  order_value DECIMAL(10,2),
  alert_date DATE DEFAULT CURRENT_DATE,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by VARCHAR(100),
  acknowledged_at TIMESTAMP
);

-- 5. CFO's clearance pricing matrix
CREATE TABLE IF NOT EXISTS clearance_pricing_rules (
  id SERIAL PRIMARY KEY,
  rule_name VARCHAR(50) UNIQUE,
  clearance_mode VARCHAR(20),
  age_days_min INTEGER,
  age_days_max INTEGER,
  margin_category VARCHAR(20),
  base_discount_percent DECIMAL(5,2),
  velocity_penalty_percent DECIMAL(5,2),
  seasonal_boost_percent DECIMAL(5,2),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Product profitability analysis log
CREATE TABLE IF NOT EXISTS profitability_analysis (
  id SERIAL PRIMARY KEY,
  analysis_date DATE DEFAULT CURRENT_DATE,
  total_products INTEGER,
  high_margin_count INTEGER, -- 60%+
  medium_margin_count INTEGER, -- 50-59%
  low_margin_count INTEGER, -- <50%
  clearance_candidates INTEGER,
  total_clearance_potential DECIMAL(12,2),
  cash_impact_total DECIMAL(12,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Insert CFO's aggressive pricing matrix
INSERT INTO clearance_pricing_rules (rule_name, clearance_mode, age_days_min, age_days_max, margin_category, base_discount_percent) VALUES
-- High margin (60%+) products - Can afford deeper discounts
('aggressive_high_0_30', 'aggressive', 0, 30, 'high_60plus', 25.00),
('aggressive_high_31_60', 'aggressive', 31, 60, 'high_60plus', 40.00),
('aggressive_high_61_90', 'aggressive', 61, 90, 'high_60plus', 60.00),
('aggressive_high_90plus', 'aggressive', 90, 999, 'high_60plus', 75.00),

-- Normal margin (50-59%) products
('aggressive_normal_0_30', 'aggressive', 0, 30, 'normal_50to59', 20.00),
('aggressive_normal_31_60', 'aggressive', 31, 60, 'normal_50to59', 35.00),
('aggressive_normal_61_90', 'aggressive', 61, 90, 'normal_50to59', 50.00),
('aggressive_normal_90plus', 'aggressive', 90, 999, 'normal_50to59', 65.00),

-- Low margin (<50%) products - Conservative discounting
('aggressive_low_0_30', 'aggressive', 0, 30, 'low_below50', 15.00),
('aggressive_low_31_60', 'aggressive', 31, 60, 'low_below50', 30.00),
('aggressive_low_61_90', 'aggressive', 61, 90, 'low_below50', 40.00),
('aggressive_low_90plus', 'aggressive', 90, 999, 'low_below50', 50.00),

-- Conservative pricing mode (fallback)
('conservative_high_0_60', 'conservative', 0, 60, 'high_60plus', 15.00),
('conservative_high_61plus', 'conservative', 61, 999, 'high_60plus', 30.00),
('conservative_normal_0_60', 'conservative', 0, 60, 'normal_50to59', 10.00),
('conservative_normal_61plus', 'conservative', 61, 999, 'normal_50to59', 25.00),
('conservative_low_0_60', 'conservative', 0, 60, 'low_below50', 5.00),
('conservative_low_61plus', 'conservative', 61, 999, 'low_below50', 15.00);

-- 8. Create performance indexes for the CFO engine
CREATE INDEX IF NOT EXISTS idx_products_cash_impact ON shopify_products(cash_impact_score DESC);
CREATE INDEX IF NOT EXISTS idx_variants_cash_impact ON shopify_variants(cash_impact_score DESC);
CREATE INDEX IF NOT EXISTS idx_products_clearance_tier ON shopify_products(clearance_tier);
CREATE INDEX IF NOT EXISTS idx_variants_clearance_tier ON shopify_variants(clearance_tier);
CREATE INDEX IF NOT EXISTS idx_products_seasonal ON shopify_products(q4_item, seasonal_item);
CREATE INDEX IF NOT EXISTS idx_variants_seasonal ON shopify_variants(q4_item, seasonal_item);
CREATE INDEX IF NOT EXISTS idx_products_margin ON shopify_products(margin_percentage DESC);
CREATE INDEX IF NOT EXISTS idx_variants_margin ON shopify_variants(margin_percentage DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_priority ON inventory_alerts(priority_level, alert_date);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_type ON inventory_alerts(alert_type, alert_date);
CREATE INDEX IF NOT EXISTS idx_daily_cash_date ON daily_cash_status(date DESC);
CREATE INDEX IF NOT EXISTS idx_clearance_rules_lookup ON clearance_pricing_rules(clearance_mode, margin_category, age_days_min, age_days_max);

-- 9. Add triggers to automatically update cash impact scores
CREATE OR REPLACE FUNCTION update_cash_impact_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate cash impact score: margin × weekly_revenue × urgency_multiplier
  NEW.cash_impact_score = COALESCE(NEW.margin_percentage, 0) * COALESCE(NEW.weekly_revenue, 0) * 
    CASE 
      WHEN COALESCE(NEW.inventory_quantity, 0) = 0 THEN 3.0 -- Out of stock urgency
      WHEN COALESCE(NEW.inventory_quantity, 0) <= 7 THEN 2.0 -- Low stock urgency  
      ELSE 1.0 -- Normal stock
    END;
  
  -- Determine clearance tier based on margin and sell-through
  NEW.clearance_tier = CASE
    WHEN COALESCE(NEW.margin_percentage, 0) >= 60 AND COALESCE(NEW.sell_through_rate, 0) < 15 THEN 'cash_generator'
    WHEN COALESCE(NEW.sell_through_rate, 0) < 20 AND COALESCE(NEW.days_no_sales, 0) > 60 THEN 'space_maker'
    WHEN COALESCE(NEW.sell_through_rate, 0) < 10 OR COALESCE(NEW.days_no_sales, 0) > 90 THEN 'bundle_builder'
    ELSE 'standard_clearance'
  END;
  
  -- Mark as clearance candidate if slow moving
  NEW.clearance_candidate = (COALESCE(NEW.days_no_sales, 0) > 60 OR COALESCE(NEW.sell_through_rate, 0) < 20);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to both products and variants
DROP TRIGGER IF EXISTS trigger_update_product_cash_impact ON shopify_products;
CREATE TRIGGER trigger_update_product_cash_impact
  BEFORE UPDATE ON shopify_products
  FOR EACH ROW EXECUTE FUNCTION update_cash_impact_score();

DROP TRIGGER IF EXISTS trigger_update_variant_cash_impact ON shopify_variants;  
CREATE TRIGGER trigger_update_variant_cash_impact
  BEFORE UPDATE ON shopify_variants
  FOR EACH ROW EXECUTE FUNCTION update_cash_impact_score();

-- 10. Create system performance tracking table (if not exists)
CREATE TABLE IF NOT EXISTS system_performance (
  id SERIAL PRIMARY KEY,
  endpoint VARCHAR(100),
  method VARCHAR(10),
  response_time_ms INTEGER,
  success BOOLEAN,
  request_size_bytes INTEGER,
  error_message TEXT,
  user_id VARCHAR(100),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_performance_endpoint ON system_performance(endpoint, timestamp DESC);

-- Migration complete
INSERT INTO profitability_analysis (
  analysis_date, total_products, created_at
) VALUES (
  CURRENT_DATE, 
  (SELECT COUNT(*) FROM shopify_products), 
  CURRENT_TIMESTAMP
);