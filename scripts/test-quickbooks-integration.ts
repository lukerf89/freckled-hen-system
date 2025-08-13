import dotenv from 'dotenv';
import { QuickBooksIntegration } from '@/lib/integrations/quickbooks';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testQuickBooksIntegration() {
  console.log('🧪 Testing QuickBooks Integration...\n');

  const qb = new QuickBooksIntegration(process.env.QUICKBOOKS_COMPANY_ID || '');

  try {
    // Test 1: Connection Test
    console.log('1️⃣ Testing connection...');
    const isConnected = await qb.testConnection();
    if (!isConnected) {
      throw new Error('QuickBooks connection failed');
    }
    console.log('✅ Connection successful\n');

    // Test 2: Cash Position
    console.log('2️⃣ Testing getCashPosition()...');
    const cashPosition = await qb.getCashPosition();
    console.log('💰 Cash Position:', {
      totalCash: cashPosition.totalCash,
      numberOfAccounts: cashPosition.bankAccounts.length,
      asOfDate: cashPosition.asOfDate
    });
    console.log('✅ Cash position fetched successfully\n');

    // Test 3: Profit & Loss
    console.log('3️⃣ Testing getProfitLoss()...');
    const profitLoss = await qb.getProfitLoss();
    console.log('📊 Profit & Loss:', {
      totalRevenue: profitLoss.totalRevenue,
      totalExpenses: profitLoss.totalExpenses,
      netIncome: profitLoss.netIncome,
      grossProfit: profitLoss.grossProfit,
      period: `${profitLoss.periodStart} to ${profitLoss.periodEnd}`
    });
    console.log('✅ P&L report fetched successfully\n');

    // Test 4: COGS
    console.log('4️⃣ Testing getCOGS()...');
    const cogs = await qb.getCOGS();
    console.log('📦 COGS Data:', {
      totalCOGS: cogs.totalCOGS,
      numberOfAccounts: cogs.cogsAccounts.length,
      period: `${cogs.periodStart} to ${cogs.periodEnd}`
    });
    console.log('✅ COGS data fetched successfully\n');

    // Test 5: Expenses
    console.log('5️⃣ Testing getExpenses()...');
    const expenses = await qb.getExpenses();
    console.log('💸 Expense Breakdown:', {
      totalExpenses: expenses.totalExpenses,
      numberOfCategories: expenses.expenseCategories.length,
      topExpense: expenses.expenseCategories[0]?.category || 'N/A',
      period: `${expenses.periodStart} to ${expenses.periodEnd}`
    });
    console.log('✅ Expense breakdown fetched successfully\n');

    console.log('🎉 All QuickBooks integration tests passed!');

  } catch (error) {
    console.error('❌ QuickBooks integration test failed:', error);
    process.exit(1);
  }
}

// Run the test
testQuickBooksIntegration();