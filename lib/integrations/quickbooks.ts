import QuickBooks from 'node-quickbooks';
import { db } from '@/lib/db/connection';
import { QuickBooksOAuth } from '@/lib/quickbooks/oauth';

interface QuickBooksTokens {
  access_token: string;
  refresh_token: string;
  company_id: string;
  expires_at: Date;
}

interface CashPosition {
  totalCash: number;
  bankAccounts: Array<{
    name: string;
    balance: number;
    accountType: string;
  }>;
  asOfDate: string;
}

interface ProfitLoss {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  grossProfit: number;
  operatingIncome: number;
  periodStart: string;
  periodEnd: string;
}

interface COGSData {
  totalCOGS: number;
  cogsAccounts: Array<{
    name: string;
    amount: number;
  }>;
  periodStart: string;
  periodEnd: string;
}

interface ExpenseBreakdown {
  totalExpenses: number;
  expenseCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  periodStart: string;
  periodEnd: string;
}

export class QuickBooksIntegration {
  private companyId: string;

  constructor(companyId: string = '9341455142039676') {
    this.companyId = companyId;
  }

  private async getStoredTokens(): Promise<QuickBooksTokens | null> {
    try {
      const result = await db.query(
        'SELECT access_token, refresh_token, company_id, expires_at FROM quickbooks_tokens WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1',
        [this.companyId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('❌ Error fetching stored tokens:', error);
      return null;
    }
  }

  private async updateStoredTokens(tokens: Partial<QuickBooksTokens>): Promise<void> {
    try {
      await db.query(
        'UPDATE quickbooks_tokens SET access_token = $1, refresh_token = $2, expires_at = $3, updated_at = CURRENT_TIMESTAMP WHERE company_id = $4',
        [tokens.access_token, tokens.refresh_token, tokens.expires_at, this.companyId]
      );
    } catch (error) {
      console.error('❌ Error updating stored tokens:', error);
      throw error;
    }
  }

  private async refreshTokensIfNeeded(tokens: QuickBooksTokens): Promise<string> {
    const now = new Date();
    const expiresAt = new Date(tokens.expires_at);

    if (now >= expiresAt) {
      console.log('🔄 Access token expired, refreshing...');
      
      const oauth = new QuickBooksOAuth({
        clientId: process.env.QUICKBOOKS_CLIENT_ID!,
        clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET!,
        redirectUri: process.env.QUICKBOOKS_REDIRECT_URI!,
        environment: (process.env.QUICKBOOKS_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox'
      });

      const refreshedTokens = await oauth.refreshAccessToken(tokens.refresh_token);
      
      const newExpiresAt = new Date(now.getTime() + (refreshedTokens.expires_in * 1000));
      
      await this.updateStoredTokens({
        access_token: refreshedTokens.access_token,
        refresh_token: refreshedTokens.refresh_token,
        expires_at: newExpiresAt
      });

      return refreshedTokens.access_token;
    }

    return tokens.access_token;
  }

  private async getQuickBooksClient(): Promise<any> {
    const tokens = await this.getStoredTokens();
    if (!tokens) {
      throw new Error('No QuickBooks tokens found. Please complete OAuth flow first.');
    }

    const accessToken = await this.refreshTokensIfNeeded(tokens);
    
    const isProduction = process.env.QUICKBOOKS_ENVIRONMENT === 'production';
    
    return new QuickBooks(
      process.env.QUICKBOOKS_CLIENT_ID!,
      process.env.QUICKBOOKS_CLIENT_SECRET!,
      accessToken,
      false, // no token secret needed for OAuth2
      this.companyId,
      !isProduction, // sandbox mode
      true, // enable debugging
      null, // minor version
      '2.0' // version
    );
  }

  async getCashPosition(): Promise<CashPosition> {
    try {
      console.log('💰 Fetching cash position from QuickBooks...');
      const qbo = await this.getQuickBooksClient();

      return new Promise((resolve, reject) => {
        qbo.findAccounts([
          { field: 'AccountType', value: 'Bank', operator: '=' },
          { field: 'Active', value: true, operator: '=' }
        ], (err: any, accounts: any) => {
          if (err) {
            console.error('❌ Error fetching bank accounts:', err);
            reject(err);
            return;
          }

          let totalCash = 0;
          const bankAccounts = accounts.QueryResponse.Account?.map((account: any) => {
            const balance = parseFloat(account.CurrentBalance || '0');
            totalCash += balance;
            
            return {
              name: account.Name,
              balance: balance,
              accountType: account.AccountSubType || account.AccountType
            };
          }) || [];

          resolve({
            totalCash,
            bankAccounts,
            asOfDate: new Date().toISOString().split('T')[0]
          });
        });
      });
    } catch (error) {
      console.error('❌ Error in getCashPosition:', error);
      throw error;
    }
  }

  async getProfitLoss(startDate?: string, endDate?: string): Promise<ProfitLoss> {
    try {
      console.log('📊 Fetching Profit & Loss report from QuickBooks...');
      const qbo = await this.getQuickBooksClient();

      const start = startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
      const end = endDate || new Date().toISOString().split('T')[0];

      return new Promise((resolve, reject) => {
        qbo.reportProfitAndLoss({
          start_date: start,
          end_date: end,
          summarize_column_by: 'Total'
        }, (err: any, report: any) => {
          if (err) {
            console.error('❌ Error fetching P&L report:', err);
            reject(err);
            return;
          }

          let totalRevenue = 0;
          let totalExpenses = 0;
          let grossProfit = 0;

          const rows = report?.Rows || [];
          
          for (const row of rows) {
            if (row.group === 'Income') {
              totalRevenue = parseFloat(row.ColData?.[1]?.value || '0');
            } else if (row.group === 'COGS') {
              const cogs = parseFloat(row.ColData?.[1]?.value || '0');
              grossProfit = totalRevenue - cogs;
            } else if (row.group === 'Expenses') {
              totalExpenses = parseFloat(row.ColData?.[1]?.value || '0');
            }
          }

          const netIncome = totalRevenue - totalExpenses;
          const operatingIncome = grossProfit - totalExpenses;

          resolve({
            totalRevenue,
            totalExpenses,
            netIncome,
            grossProfit,
            operatingIncome,
            periodStart: start,
            periodEnd: end
          });
        });
      });
    } catch (error) {
      console.error('❌ Error in getProfitLoss:', error);
      throw error;
    }
  }

  async getCOGS(startDate?: string, endDate?: string): Promise<COGSData> {
    try {
      console.log('📦 Fetching COGS data from QuickBooks...');
      const qbo = await this.getQuickBooksClient();

      const start = startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
      const end = endDate || new Date().toISOString().split('T')[0];

      return new Promise((resolve, reject) => {
        qbo.findAccounts([
          { field: 'AccountType', value: 'Cost of Goods Sold', operator: '=' },
          { field: 'Active', value: true, operator: '=' }
        ], (err: any, accounts: any) => {
          if (err) {
            console.error('❌ Error fetching COGS accounts:', err);
            reject(err);
            return;
          }

          let totalCOGS = 0;
          const cogsAccounts = accounts.QueryResponse.Account?.map((account: any) => {
            const amount = parseFloat(account.CurrentBalance || '0');
            totalCOGS += amount;
            
            return {
              name: account.Name,
              amount: amount
            };
          }) || [];

          resolve({
            totalCOGS,
            cogsAccounts,
            periodStart: start,
            periodEnd: end
          });
        });
      });
    } catch (error) {
      console.error('❌ Error in getCOGS:', error);
      throw error;
    }
  }

  async getExpenses(startDate?: string, endDate?: string): Promise<ExpenseBreakdown> {
    try {
      console.log('💸 Fetching expense breakdown from QuickBooks...');
      const qbo = await this.getQuickBooksClient();

      const start = startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
      const end = endDate || new Date().toISOString().split('T')[0];

      return new Promise((resolve, reject) => {
        qbo.findAccounts([
          { field: 'AccountType', value: 'Expense', operator: '=' },
          { field: 'Active', value: true, operator: '=' }
        ], (err: any, accounts: any) => {
          if (err) {
            console.error('❌ Error fetching expense accounts:', err);
            reject(err);
            return;
          }

          let totalExpenses = 0;
          const expenseData = accounts.QueryResponse.Account?.map((account: any) => {
            const amount = parseFloat(account.CurrentBalance || '0');
            totalExpenses += amount;
            
            return {
              category: account.Name,
              amount: amount
            };
          }) || [];

          const expenseCategories = expenseData.map((expense: any) => ({
            ...expense,
            percentage: totalExpenses > 0 ? (expense.amount / totalExpenses) * 100 : 0
          }));

          resolve({
            totalExpenses,
            expenseCategories,
            periodStart: start,
            periodEnd: end
          });
        });
      });
    } catch (error) {
      console.error('❌ Error in getExpenses:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('🔗 Testing QuickBooks connection...');
      const qbo = await this.getQuickBooksClient();

      return new Promise((resolve) => {
        qbo.getCompanyInfo(this.companyId, (err: any, company: any) => {
          if (err) {
            console.error('❌ QuickBooks connection test failed:', err);
            resolve(false);
          } else {
            console.log('✅ QuickBooks connection successful:', company.QueryResponse.CompanyInfo[0].CompanyName);
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error('❌ QuickBooks connection error:', error);
      return false;
    }
  }
}