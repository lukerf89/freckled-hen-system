-- QuickBooks OAuth Tokens Storage
CREATE TABLE IF NOT EXISTS quickbooks_tokens (
    id SERIAL PRIMARY KEY,
    company_id VARCHAR(100) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expires_at TIMESTAMP NOT NULL,
    scope TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_quickbooks_tokens_company_id ON quickbooks_tokens(company_id);
CREATE INDEX IF NOT EXISTS idx_quickbooks_tokens_expires_at ON quickbooks_tokens(expires_at);