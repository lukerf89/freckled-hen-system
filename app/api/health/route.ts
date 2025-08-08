import { NextResponse } from 'next/server';
import { checkDatabaseConnection } from '@/lib/db/connection';
import { ShopifyClient } from '@/lib/shopify/client';

export async function GET() {
  const status = {
    database: false,
    shopify: false,
    ai: false,
  };
  
  // Check database
  status.database = await checkDatabaseConnection();
  
  // Check Shopify
  try {
    const shopify = new ShopifyClient();
    await shopify.testConnection();
    status.shopify = true;
  } catch (error) {
    status.shopify = false;
  }
  
  // Check AI
  status.ai = !!process.env.GEMINI_API_KEY;
  
  return NextResponse.json(status);
}