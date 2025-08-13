-- KPI Dashboard Database Schema Extension
-- Phase 1: Core KPI Tracking Tables

-- Sales Performance Tracking
CREATE TABLE IF NOT EXISTS sales_metrics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    
    -- Core Sales Metrics
    total_revenue DECIMAL(12,2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_units_sold INTEGER DEFAULT 0,
    average_order_value DECIMAL(10,2) DEFAULT 0,
    
    -- Customer Metrics
    new_customers INTEGER DEFAULT 0,
    returning_customers INTEGER DEFAULT 0,
    customer_acquisition_cost DECIMAL(10,2) DEFAULT 0,
    
    -- Conversion Metrics
    website_visitors INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    cart_abandonment_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Growth Metrics
    revenue_growth_rate DECIMAL(5,2) DEFAULT 0,
    order_growth_rate DECIMAL(5,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(date, period_type)
);

-- Inventory Performance Metrics
CREATE TABLE IF NOT EXISTS inventory_metrics (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Stock Levels
    opening_stock INTEGER DEFAULT 0,
    closing_stock INTEGER DEFAULT 0,
    stock_received INTEGER DEFAULT 0,
    stock_sold INTEGER DEFAULT 0,
    stock_adjusted INTEGER DEFAULT 0,
    
    -- Performance Metrics
    days_of_inventory DECIMAL(8,2) DEFAULT 0,
    inventory_turnover DECIMAL(8,2) DEFAULT 0,
    stockout_days INTEGER DEFAULT 0,
    overstock_value DECIMAL(10,2) DEFAULT 0,
    
    -- Financial Impact
    carrying_cost DECIMAL(10,2) DEFAULT 0,
    opportunity_cost DECIMAL(10,2) DEFAULT 0,
    shrinkage_value DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(product_id, date)
);

-- Product Performance Analytics
CREATE TABLE IF NOT EXISTS product_performance (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    
    -- Sales Performance
    units_sold INTEGER DEFAULT 0,
    revenue_generated DECIMAL(10,2) DEFAULT 0,
    profit_margin DECIMAL(10,2) DEFAULT 0,
    
    -- Customer Interaction
    product_views INTEGER DEFAULT 0,
    add_to_cart_rate DECIMAL(5,2) DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Inventory Impact
    inventory_velocity DECIMAL(8,2) DEFAULT 0,
    reorder_frequency INTEGER DEFAULT 0,
    
    -- Ranking Metrics
    sales_rank INTEGER DEFAULT 0,
    profit_rank INTEGER DEFAULT 0,
    velocity_rank INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(product_id, date, period_type)
);

-- Customer Lifecycle Analytics
CREATE TABLE IF NOT EXISTS customer_metrics (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(100), -- Shopify customer ID
    email VARCHAR(255),
    
    -- Lifecycle Metrics
    first_order_date DATE,
    last_order_date DATE,
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    
    -- Engagement Metrics
    average_days_between_orders DECIMAL(8,2) DEFAULT 0,
    customer_lifetime_value DECIMAL(12,2) DEFAULT 0,
    predicted_clv DECIMAL(12,2) DEFAULT 0,
    
    -- Behavior Segmentation
    customer_segment VARCHAR(50), -- 'new', 'active', 'at_risk', 'lost', 'vip'
    rfm_score VARCHAR(3), -- Recency, Frequency, Monetary score (111-555)
    churn_probability DECIMAL(5,2) DEFAULT 0,
    
    -- Marketing Metrics
    acquisition_channel VARCHAR(100),
    marketing_cost DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(customer_id)
);

-- Operational Efficiency Metrics
CREATE TABLE IF NOT EXISTS operational_metrics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    metric_category VARCHAR(50) NOT NULL, -- 'fulfillment', 'inventory', 'customer_service', 'marketing'
    
    -- Fulfillment Metrics
    orders_processed INTEGER DEFAULT 0,
    average_processing_time DECIMAL(8,2) DEFAULT 0, -- hours
    same_day_shipments INTEGER DEFAULT 0,
    shipping_accuracy_rate DECIMAL(5,2) DEFAULT 0,
    return_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Cost Metrics
    fulfillment_cost_per_order DECIMAL(10,2) DEFAULT 0,
    shipping_cost_per_order DECIMAL(10,2) DEFAULT 0,
    total_operational_cost DECIMAL(12,2) DEFAULT 0,
    
    -- Quality Metrics
    order_accuracy_rate DECIMAL(5,2) DEFAULT 0,
    customer_satisfaction_score DECIMAL(3,1) DEFAULT 0,
    first_contact_resolution_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Efficiency Metrics
    staff_productivity_score DECIMAL(5,2) DEFAULT 0,
    space_utilization_rate DECIMAL(5,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(date, metric_category)
);

-- Marketing Performance Tracking
CREATE TABLE IF NOT EXISTS marketing_metrics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    campaign_name VARCHAR(255),
    channel VARCHAR(100), -- 'email', 'social', 'google_ads', 'facebook_ads', 'organic', 'direct'
    
    -- Investment Metrics
    ad_spend DECIMAL(10,2) DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    click_through_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Conversion Metrics
    leads_generated INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    cost_per_click DECIMAL(8,2) DEFAULT 0,
    cost_per_conversion DECIMAL(10,2) DEFAULT 0,
    
    -- Revenue Attribution
    attributed_revenue DECIMAL(12,2) DEFAULT 0,
    return_on_ad_spend DECIMAL(8,2) DEFAULT 0,
    customer_acquisition_cost DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(date, campaign_name, channel)
);

-- Financial Performance Summary
CREATE TABLE IF NOT EXISTS financial_metrics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    
    -- Revenue Breakdown
    gross_revenue DECIMAL(12,2) DEFAULT 0,
    net_revenue DECIMAL(12,2) DEFAULT 0,
    refunds_amount DECIMAL(10,2) DEFAULT 0,
    taxes_collected DECIMAL(10,2) DEFAULT 0,
    shipping_revenue DECIMAL(10,2) DEFAULT 0,
    
    -- Cost Structure
    cost_of_goods_sold DECIMAL(12,2) DEFAULT 0,
    shipping_costs DECIMAL(10,2) DEFAULT 0,
    marketing_costs DECIMAL(10,2) DEFAULT 0,
    operational_costs DECIMAL(10,2) DEFAULT 0,
    
    -- Profitability
    gross_profit DECIMAL(12,2) DEFAULT 0,
    gross_profit_margin DECIMAL(5,2) DEFAULT 0,
    net_profit DECIMAL(12,2) DEFAULT 0,
    net_profit_margin DECIMAL(5,2) DEFAULT 0,
    
    -- Cash Flow
    cash_inflow DECIMAL(12,2) DEFAULT 0,
    cash_outflow DECIMAL(12,2) DEFAULT 0,
    net_cash_flow DECIMAL(12,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(date, period_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_metrics_date ON sales_metrics(date);
CREATE INDEX IF NOT EXISTS idx_sales_metrics_period ON sales_metrics(period_type);
CREATE INDEX IF NOT EXISTS idx_inventory_metrics_product_date ON inventory_metrics(product_id, date);
CREATE INDEX IF NOT EXISTS idx_product_performance_date ON product_performance(date);
CREATE INDEX IF NOT EXISTS idx_product_performance_product ON product_performance(product_id);
CREATE INDEX IF NOT EXISTS idx_customer_metrics_segment ON customer_metrics(customer_segment);
CREATE INDEX IF NOT EXISTS idx_customer_metrics_clv ON customer_metrics(customer_lifetime_value);
CREATE INDEX IF NOT EXISTS idx_operational_metrics_date ON operational_metrics(date);
CREATE INDEX IF NOT EXISTS idx_operational_metrics_category ON operational_metrics(metric_category);
CREATE INDEX IF NOT EXISTS idx_marketing_metrics_date ON marketing_metrics(date);
CREATE INDEX IF NOT EXISTS idx_marketing_metrics_channel ON marketing_metrics(channel);
CREATE INDEX IF NOT EXISTS idx_financial_metrics_date ON financial_metrics(date);
CREATE INDEX IF NOT EXISTS idx_financial_metrics_period ON financial_metrics(period_type);