# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev --turbopack` - Start development server with Turbopack
- `npm run build` - Build the Next.js application
- `npm run start` - Start production server
- `npm run lint` - Lint the codebase
- `npm run test:setup` - Run test setup script (validates database and API connections)
- `npm run test:quickbooks` - Test QuickBooks integration and data fetching
- `npm run migrate` - Run database migrations

## Environment Requirements

The application requires the following environment variables (typically in `.env.local`):

- `DATABASE_URL` - PostgreSQL connection string
- `SHOPIFY_STORE_DOMAIN` - Shopify store domain
- `SHOPIFY_ACCESS_TOKEN` - Shopify Admin API access token
- `GEMINI_API_KEY` - Google Gemini AI API key
- `SLACK_WEBHOOK_URL` - Slack webhook for KPI notifications
- `CRON_SECRET` - Secret for authenticating cron job requests
- QuickBooks OAuth credentials:
  - `QUICKBOOKS_CLIENT_ID`
  - `QUICKBOOKS_CLIENT_SECRET`
  - `QUICKBOOKS_REDIRECT_URI`
  - `QUICKBOOKS_ENVIRONMENT` - "sandbox" or "production"
  - `QUICKBOOKS_COMPANY_ID` - QuickBooks company ID (9341455142039676)

## Architecture Overview

This is a Next.js 15 application using the App Router pattern that integrates multiple external services:

### Core Integrations
- **Shopify**: Product catalog management via GraphQL Admin API
- **QuickBooks**: Accounting integration with OAuth2 authentication
- **PostgreSQL**: Primary database for inventory and transaction tracking
- **Google Gemini AI**: AI-powered features for product management

### Database Architecture
The system uses PostgreSQL with a migration-based schema:
- `products` - Core product catalog with Shopify integration
- `inventory_transactions` - Tracks all inventory movements
- `receiving_events` - Manages product receiving workflows
- `kpi_snapshots` - Stores daily KPI calculations and alerts
- `quickbooks_tokens` - Stores OAuth tokens for QuickBooks integration
- `migrations` - Tracks executed database migrations

### Key Library Components

- **Database Connection** (`lib/db/connection.ts`): Connection pool management with health checks
- **Database Migrations** (`lib/db/migrate.ts`): Sequential SQL migration runner
- **QuickBooks OAuth** (`lib/quickbooks/oauth.ts`): Complete OAuth2 implementation for QuickBooks API
- **QuickBooks Integration** (`lib/integrations/quickbooks.ts`): KPI data fetching service with methods for cash position, P&L, COGS, and expenses
- **KPI Calculator** (`lib/kpi/calculator.ts`): Real-time business metrics calculation engine with Freckled Hen specific targets and alert thresholds
- **Shopify Client** (`lib/shopify/client.ts`): GraphQL client for Shopify Admin API with CST timezone handling

### API Architecture
The application follows Next.js App Router API patterns:
- Health check endpoint at `/api/health` validates all external service connections
- QuickBooks OAuth flow at `/api/auth/quickbooks/`
- KPI calculation endpoint at `/api/kpi/calculate` for real-time business metrics
- Daily report cron job at `/api/cron/daily-report` for automated Slack notifications
- Webhook handlers in `/api/webhooks/`

### Frontend Structure
- Uses Tailwind CSS v4 with Geist fonts
- Recharts for data visualization and KPI charts
- Component organization follows domain-driven structure (`components/products/`, `components/receiving/`)
- KPI Dashboard at `/dashboard/kpi` with real-time metrics and auto-refresh

## Testing and Validation

Use `npm run test:setup` to validate that all external service connections are properly configured. This script will test:
- Database connectivity
- Shopify API access
- QuickBooks OAuth configuration
- AI service availability

## KPI System Features

### Freckled Hen Specific Targets
- **Seasonal Revenue Targets**: Monthly targets from August (peak season) through December
- **Three-Tier Alert System**: Critical, Warning, and Positive thresholds for all metrics
- **CST Timezone Handling**: Proper timezone conversion for accurate "yesterday" calculations
- **Real-time Shopify Integration**: Live order data with proper financial and fulfillment status filtering

### Daily Automated Reporting
- **Scheduled Cron Job**: Runs daily at 9:00 AM CST via Vercel cron
- **Slack Integration**: Formatted business status reports sent to Slack webhook
- **Comprehensive Metrics**: Cash position, revenue trends, progress tracking, and business alerts

## Deployment

The application is configured for Vercel deployment with:
- Function timeout: 30 seconds for API routes
- Build output directory: `.next`
- Target region: `iad1` (US East)
- Cron job scheduling: Daily at 9:00 AM CST for automated reports