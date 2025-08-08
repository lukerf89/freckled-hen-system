# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Freckled Hen System is a comprehensive e-commerce management and KPI analytics platform built with Next.js. It integrates with Shopify for e-commerce data and QuickBooks for financial data, providing business intelligence and inventory management capabilities.

## Essential Commands

### Development
```bash
npm run dev          # Start development server with Turbopack on port 3000
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Database
```bash
npm run migrate      # Run database migrations (executes all SQL files in migrations/)
```

### Testing & Debugging
```bash
npm run test:setup   # Test environment setup
tsx scripts/test-dependencies.ts      # Verify all dependencies are working
tsx scripts/verify-quickbooks-oauth.ts # Test QuickBooks OAuth flow
tsx scripts/debug-oauth-callback.ts    # Debug OAuth callback issues
```

## Architecture

### Tech Stack
- **Framework**: Next.js 15.4.6 with App Router
- **Database**: PostgreSQL with connection pooling
- **Caching**: Redis (ioredis)
- **Real-time**: Socket.io
- **Styling**: Tailwind CSS 4.0
- **AI**: Google Gemini AI for product optimization

### Key Integrations
1. **Shopify**: GraphQL Admin API for e-commerce data sync
2. **QuickBooks**: OAuth2 integration for financial data
3. **Slack**: Webhook notifications for alerts
4. **Google Gemini**: AI-powered product insights

### Directory Structure
- `app/` - Next.js App Router pages and API routes
  - `api/` - Backend endpoints (ai/, auth/, health/, shopify/, webhooks/)
  - `dashboard/` - Main analytics dashboard
  - `products/` - Product management interface
  - `receiving/` - Inventory receiving workflow
- `components/` - Reusable React components
- `lib/` - Core business logic
  - `db/` - Database connection and pooling
  - `shopify/` - Shopify GraphQL client
  - `quickbooks/` - QuickBooks API client
  - `ai/` - AI service integration
- `migrations/` - SQL schema migrations
- `types/` - TypeScript type definitions

### Database Schema
Key tables include:
- `products` - Product catalog with Shopify sync
- `inventory_transactions` - Stock movement tracking
- `receiving_events` - Inbound inventory management
- KPI tables: `sales_metrics`, `inventory_metrics`, `product_performance`, `customer_metrics`, `operational_metrics`, `marketing_metrics`, `financial_metrics`

## Environment Variables Required

The application requires the following environment variables:
- **Database**: `DATABASE_URL` (PostgreSQL connection string)
- **Redis**: `REDIS_URL`
- **Shopify**: `SHOPIFY_*` credentials and webhook URLs
- **QuickBooks**: `QUICKBOOKS_*` OAuth credentials
- **Google AI**: `GOOGLE_GEMINI_API_KEY`
- **Slack**: `SLACK_WEBHOOK_URL`

## Development Workflow

### Adding New Features
1. For API endpoints, add to `app/api/`
2. For UI pages, add to `app/` following Next.js App Router conventions
3. Shared components go in `components/`
4. Business logic goes in `lib/`
5. Database changes require new migration files in `migrations/`

### Working with Integrations
- Shopify API calls use the GraphQL client in `lib/shopify/`
- QuickBooks API uses OAuth2 flow in `lib/quickbooks/`
- AI features use Gemini client in `lib/ai/`

### Type Safety
- TypeScript is configured with strict mode
- Types are defined in `types/` directory
- Use existing type definitions when available

## Important Notes

- The project uses Vercel for deployment (vercel.json configured)
- Health checks are available at `/api/health`
- OAuth callbacks are handled at `/api/auth/quickbooks/callback`
- Shopify webhooks are received at `/api/webhooks/shopify`
- Real-time features use Socket.io on the same port as the Next.js server