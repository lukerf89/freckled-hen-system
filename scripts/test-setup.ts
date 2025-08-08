import dotenv from 'dotenv';
import { checkDatabaseConnection } from '../lib/db/connection';
import { runMigrations } from '../lib/db/migrate';
import { ShopifyClient } from '../lib/shopify/client';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function testSetup() {
  console.log('🧪 Testing Freckled Hen System Setup...\n');
  
  // Test Database
  console.log('1. Testing Database Connection...');
  const dbConnected = await checkDatabaseConnection();
  if (!dbConnected) {
    console.error('❌ Database connection failed. Check DATABASE_URL');
    process.exit(1);
  }
  
  // Run Migrations
  console.log('\n2. Running Database Migrations...');
  try {
    await runMigrations();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
  
  // Test Shopify
  console.log('\n3. Testing Shopify Connection...');
  const shopify = new ShopifyClient();
  const shopifyConnected = await shopify.testConnection();
  if (!shopifyConnected) {
    console.error('❌ Shopify connection failed. Check API credentials');
    process.exit(1);
  }
  
  // Test Gemini (if API key is set)
  console.log('\n4. Testing AI Service...');
  if (process.env.GEMINI_API_KEY) {
    console.log('✅ Gemini API key configured');
  } else {
    console.log('⚠️  Gemini API key not set (AI features will be disabled)');
  }
  
  console.log('\n✅ All systems operational!');
  console.log('\nYou can now run: npm run dev');
  process.exit(0);
}

testSetup();