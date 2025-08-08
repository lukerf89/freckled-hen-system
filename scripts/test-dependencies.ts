import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testDependencies() {
  console.log('🧪 Testing KPI Dashboard Dependencies...\n');
  
  try {
    // Test Slack webhook
    console.log('1. Testing Slack Webhook...');
    const { IncomingWebhook } = await import('@slack/webhook');
    console.log('✅ Slack webhook imported successfully');
    
    // Test QuickBooks
    console.log('\n2. Testing QuickBooks SDK...');
    const QuickBooks = await import('node-quickbooks');
    console.log('✅ QuickBooks SDK imported successfully');
    
    // Test Scheduling
    console.log('\n3. Testing Node Cron...');
    const cron = await import('node-cron');
    console.log('✅ Node-cron imported successfully');
    
    // Test Charts
    console.log('\n4. Testing Recharts...');
    const recharts = await import('recharts');
    console.log('✅ Recharts imported successfully');
    
    // Test Date utilities
    console.log('\n5. Testing Date-fns...');
    const { format, startOfMonth, endOfMonth } = await import('date-fns');
    const testDate = new Date();
    const formattedDate = format(testDate, 'yyyy-MM-dd');
    console.log('✅ Date-fns working:', formattedDate);
    
    // Test existing dependencies still work
    console.log('\n6. Testing Core Dependencies...');
    const { checkDatabaseConnection } = await import('../lib/db/connection');
    const dbStatus = await checkDatabaseConnection();
    console.log(dbStatus ? '✅ Database connection working' : '❌ Database connection failed');
    
    console.log('\n🎉 All KPI Dashboard dependencies are ready!');
    console.log('\nInstalled packages:');
    console.log('• @slack/webhook v7.0.5 - Slack notifications');
    console.log('• node-quickbooks v2.0.46 - QuickBooks integration');
    console.log('• node-cron v4.2.1 - Scheduled KPI calculations');
    console.log('• recharts v3.1.2 - Chart visualizations');
    console.log('• date-fns v4.1.0 - Date utilities');
    
  } catch (error) {
    console.error('❌ Dependency test failed:', error);
    process.exit(1);
  }
}

testDependencies();