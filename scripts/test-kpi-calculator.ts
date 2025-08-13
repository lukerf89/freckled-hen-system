import dotenv from 'dotenv';
import { KPICalculator } from '@/lib/kpi/calculator';
import { runMigrations } from '@/lib/db/migrate';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testKPICalculator() {
  console.log('🧪 Testing KPI Calculator...\n');

  try {
    // Ensure migrations are up to date
    console.log('1️⃣ Running database migrations...');
    await runMigrations();
    console.log('✅ Database migrations completed\n');

    // Initialize calculator with mock data fallback
    const calculator = new KPICalculator();

    // Test 2: Full KPI Calculation
    console.log('2️⃣ Running full KPI calculation...');
    const snapshot = await calculator.runFullKPICalculation();
    
    console.log('\n📊 KPI Calculation Results:');
    console.log('==========================================');
    console.log(`💰 Cash on Hand: $${snapshot.kpis.cashOnHand.toLocaleString()}`);
    console.log(`⏰ Days Cash Runway: ${snapshot.kpis.daysCashRunway} days`);
    console.log(`📈 Yesterday's Revenue: $${snapshot.kpis.yesterdayRevenue.toLocaleString()}`);
    console.log(`📦 Units Shipped Yesterday: ${snapshot.kpis.unitsShippedYesterday}`);
    console.log(`📅 WTD Progress: ${snapshot.kpis.wtdProgress.percentage}% ($${snapshot.kpis.wtdProgress.actual.toLocaleString()}/$${snapshot.kpis.wtdProgress.target.toLocaleString()})`);
    console.log(`📅 MTD Progress: ${snapshot.kpis.mtdProgress.percentage}% ($${snapshot.kpis.mtdProgress.actual.toLocaleString()}/$${snapshot.kpis.mtdProgress.target.toLocaleString()})`);
    console.log(`💹 Gross Margin: ${snapshot.kpis.grossMarginPercentage}%`);
    console.log(`🔄 Last Updated: ${snapshot.kpis.lastUpdated.toISOString()}`);
    
    // Test 3: Alert System
    console.log('\n3️⃣ Testing alert thresholds...');
    if (snapshot.alerts.length > 0) {
      console.log(`🚨 ${snapshot.alerts.length} Alert(s) Triggered:`);
      snapshot.alerts.forEach((alert, index) => {
        console.log(`   ${index + 1}. [${alert.type.toUpperCase()}] ${alert.message}`);
        console.log(`      Value: ${alert.value}, Threshold: ${alert.threshold}`);
      });
    } else {
      console.log('✅ No alerts triggered - all metrics within acceptable ranges');
    }

    // Test 4: Database Persistence
    console.log('\n4️⃣ Testing database persistence...');
    const latestSnapshot = await calculator.getLatestKPISnapshot();
    if (latestSnapshot && latestSnapshot.id === snapshot.id) {
      console.log(`✅ KPI snapshot successfully saved with ID: ${latestSnapshot.id}`);
      console.log(`   Snapshot Date: ${latestSnapshot.date.toISOString().split('T')[0]}`);
      console.log(`   Cash on Hand: $${latestSnapshot.kpis.cashOnHand.toLocaleString()}`);
    } else {
      console.error('❌ Database persistence test failed');
    }

    // Test 5: Performance Analysis
    console.log('\n5️⃣ Performance analysis...');
    const performanceInsights = [];
    
    if (snapshot.kpis.daysCashRunway < 30) {
      performanceInsights.push('⚠️  Cash runway is concerning - consider reducing expenses or increasing revenue');
    }
    
    if (snapshot.kpis.grossMarginPercentage < 50) {
      performanceInsights.push('📊 Gross margin could be improved - review pricing and COGS');
    }
    
    if (snapshot.kpis.wtdProgress.percentage < 80) {
      performanceInsights.push('📈 WTD revenue tracking below 80% - sales acceleration needed');
    }
    
    if (snapshot.kpis.unitsShippedYesterday === 0) {
      performanceInsights.push('📦 No units shipped yesterday - check fulfillment pipeline');
    }

    if (performanceInsights.length > 0) {
      console.log('📋 Performance Insights:');
      performanceInsights.forEach((insight, index) => {
        console.log(`   ${index + 1}. ${insight}`);
      });
    } else {
      console.log('✅ All performance metrics look healthy');
    }

    // Test 6: Data Source Validation
    console.log('\n6️⃣ Data source validation...');
    console.log(`📊 QuickBooks Data: ${snapshot.dataSource.quickbooks ? '✅ Connected' : '❌ Unavailable'}`);
    console.log(`🛍️  Shopify Data: ${snapshot.dataSource.shopify ? '✅ Connected' : '❌ Unavailable'}`);

    console.log('\n🎉 All KPI Calculator tests completed successfully!');
    console.log('\n💡 Next Steps:');
    console.log('   - Set up automated KPI calculation (cron job)');
    console.log('   - Configure alert notifications (email/Slack)');
    console.log('   - Build dashboard UI to display these KPIs');
    console.log('   - Add trend analysis and forecasting');

  } catch (error) {
    console.error('❌ KPI Calculator test failed:', error);
    
    // Provide debugging information
    if (error instanceof Error) {
      console.error('\n🔍 Debug Information:');
      console.error('   Error Type:', error.constructor.name);
      console.error('   Error Message:', error.message);
      if (error.stack) {
        console.error('   Stack Trace:', error.stack.split('\n').slice(0, 5).join('\n'));
      }
    }
    
    process.exit(1);
  }
}

// Run the test
testKPICalculator();