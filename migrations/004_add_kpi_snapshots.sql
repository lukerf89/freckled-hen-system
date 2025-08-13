-- KPI Snapshots Table for Historical Tracking
CREATE TABLE IF NOT EXISTS kpi_snapshots (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    
    -- Tier 1 KPIs
    cash_on_hand DECIMAL(12,2) NOT NULL,
    days_cash_runway DECIMAL(8,1) NOT NULL,
    yesterday_revenue DECIMAL(10,2) NOT NULL,
    units_shipped_yesterday INTEGER NOT NULL,
    
    -- WTD Progress
    wtd_actual DECIMAL(10,2) NOT NULL,
    wtd_target DECIMAL(10,2) NOT NULL,
    wtd_percentage INTEGER NOT NULL,
    
    -- MTD Progress
    mtd_actual DECIMAL(10,2) NOT NULL,
    mtd_target DECIMAL(10,2) NOT NULL,
    mtd_percentage INTEGER NOT NULL,
    
    -- Financial Metrics
    gross_margin_percentage DECIMAL(5,1) NOT NULL,
    
    -- Alert Data (JSON)
    alerts_data JSONB DEFAULT '[]',
    
    -- Metadata
    last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one snapshot per date
    UNIQUE(date)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_date ON kpi_snapshots(date);
CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_last_updated ON kpi_snapshots(last_updated);
CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_cash_runway ON kpi_snapshots(days_cash_runway);
CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_alerts ON kpi_snapshots USING GIN(alerts_data);