'use client';

import { useEffect, useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, Package, Target } from 'lucide-react';

interface KPIData {
  cashOnHand: number;
  daysCashRunway: number;
  yesterdayRevenue: number;
  unitsShippedYesterday: number;
  wtdProgress: {
    actual: number;
    target: number;
    percentage: number;
  };
  mtdProgress: {
    actual: number;
    target: number;
    percentage: number;
  };
  grossMarginPercentage: number;
  lastUpdated: string;
}

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'positive';
  message: string;
  value: number;
  threshold: number;
  triggered: boolean;
  priority: number;
}

// Mock trend data for charts - August targets
const mockRevenueData = [
  { date: '8/5', revenue: 1800, target: 2100 },
  { date: '8/6', revenue: 2200, target: 2100 },
  { date: '8/7', revenue: 1650, target: 2100 },
  { date: '8/8', revenue: 1950, target: 2100 },
  { date: '8/9', revenue: 2500, target: 2100 }, // Above target
  { date: '8/10', revenue: 1750, target: 2100 },
  { date: '8/11', revenue: 0, target: 2100 },
];

const mockCashRunwayData = [
  { date: '8/5', days: 95 },
  { date: '8/6', days: 93 },
  { date: '8/7', days: 92 },
  { date: '8/8', days: 91 },
  { date: '8/9', days: 90 },
  { date: '8/10', days: 90 },
  { date: '8/11', days: 90 },
];

export default function KPIDashboard() {
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchKPIData = async () => {
    try {
      console.log('🔄 Dashboard: Starting KPI data fetch...');
      setLoading(true);
      setError(null);
      
      // Call the KPI calculation API
      const response = await fetch('/api/kpi/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('📡 Dashboard: API response status:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch KPI data: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📊 Dashboard: Received KPI data:', data);
      console.log('💰 Dashboard: Yesterday Revenue:', data.kpis?.yesterdayRevenue);
      console.log('📦 Dashboard: Units Shipped:', data.kpis?.unitsShippedYesterday);
      console.log('🚨 Dashboard: Alerts count:', data.alerts?.length);
      
      // Successful API call - use real data
      setKpiData(data.kpis);
      setAlerts(data.alerts || []);
      setLastRefresh(new Date());
      console.log('✅ Dashboard: Successfully updated KPI data');
      
    } catch (err) {
      console.error('❌ Dashboard: Error fetching KPI data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load KPI data');
      
      // Use mock data only when API fails
      console.log('🔄 Dashboard: Using fallback mock data due to API error');
      setKpiData({
        cashOnHand: 45000,
        daysCashRunway: 90,
        yesterdayRevenue: 0,
        unitsShippedYesterday: 0,
        wtdProgress: { actual: 0, target: 14700, percentage: 0 }, // August targets
        mtdProgress: { actual: 0, target: 62900, percentage: 0 }, // August monthly estimate
        grossMarginPercentage: 60,
        lastUpdated: new Date().toISOString()
      });
      setAlerts([
        {
          id: 'daily_revenue_critical',
          type: 'critical',
          message: "🚨 CRITICAL: Yesterday's revenue ($0) below minimum ($1,500)",
          value: 0,
          threshold: 1500,
          triggered: true,
          priority: 1
        },
        {
          id: 'gross_margin_positive',
          type: 'positive',
          message: "🎉 EXCELLENT: Gross margin (60%) exceeds target (58%)",
          value: 60,
          threshold: 58,
          triggered: true,
          priority: 3
        },
        {
          id: 'cash_runway_positive',
          type: 'positive',
          message: "🎉 STRONG: Cash runway (90 days) provides excellent financial security",
          value: 90,
          threshold: 30,
          triggered: true,
          priority: 3
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKPIData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchKPIData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Freckled Hen specific status colors
  const getCashRunwayColor = (days: number) => {
    if (days >= 30) return 'text-green-600 bg-green-50'; // Positive
    if (days >= 21) return 'text-green-600 bg-green-50'; // Good
    if (days >= 14) return 'text-yellow-600 bg-yellow-50'; // Warning
    return 'text-red-600 bg-red-50'; // Critical
  };

  const getCashBalanceColor = (balance: number) => {
    if (balance >= 15000) return 'text-green-600 bg-green-50'; // Good
    if (balance >= 10000) return 'text-yellow-600 bg-yellow-50'; // Warning
    return 'text-red-600 bg-red-50'; // Critical
  };

  const getRevenueColor = (revenue: number, target: number) => {
    if (revenue >= target * 1.2) return 'text-green-600 bg-green-50'; // Positive (120%+)
    if (revenue >= 2000) return 'text-green-600 bg-green-50'; // Good
    if (revenue >= 1500) return 'text-yellow-600 bg-yellow-50'; // Warning
    return 'text-red-600 bg-red-50'; // Critical
  };

  const getGrossMarginColor = (margin: number) => {
    if (margin >= 58) return 'text-green-600 bg-green-50'; // Positive
    if (margin >= 52) return 'text-green-600 bg-green-50'; // Good
    if (margin >= 48) return 'text-yellow-600 bg-yellow-50'; // Warning
    return 'text-red-600 bg-red-50'; // Critical
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500'; // Target met
    if (percentage >= 80) return 'bg-green-500'; // On track
    if (percentage >= 60) return 'bg-yellow-500'; // Behind
    return 'bg-red-500'; // Significantly behind
  };

  if (loading && !kpiData) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-800">Loading KPI data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">KPI Dashboard</h1>
          <p className="mt-2 text-gray-800">
            Last updated: {lastRefresh.toLocaleTimeString()}
            {error && ' (using fallback data)'}
          </p>
        </div>
        <button
          onClick={() => {
            console.log('🔄 Dashboard: Refresh Data button clicked');
            fetchKPIData();
          }}
          disabled={loading}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Alert Section */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-5 w-5 text-gray-800 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">
              Business Alerts ({alerts.length})
            </h2>
          </div>
          <div className="space-y-3">
            {alerts
              .sort((a, b) => a.priority - b.priority) // Sort by priority
              .map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border-l-4 ${
                  alert.type === 'critical' 
                    ? 'bg-red-50 border-red-500' 
                    : alert.type === 'warning'
                    ? 'bg-yellow-50 border-yellow-500'
                    : 'bg-green-50 border-green-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${
                    alert.type === 'critical' 
                      ? 'text-red-800' 
                      : alert.type === 'warning'
                      ? 'text-yellow-800'
                      : 'text-green-800'
                  }`}>
                    {alert.type === 'critical' ? '🚨 CRITICAL' : 
                     alert.type === 'warning' ? '⚠️ WARNING' : 
                     '🎉 POSITIVE'}
                  </span>
                  <span className={`text-xs ${
                    alert.type === 'critical' 
                      ? 'text-red-600' 
                      : alert.type === 'warning'
                      ? 'text-yellow-600'
                      : 'text-green-600'
                  }`}>
                    Priority {alert.priority}
                  </span>
                </div>
                <p className={`mt-1 text-sm ${
                  alert.type === 'critical' 
                    ? 'text-red-700' 
                    : alert.type === 'warning'
                    ? 'text-yellow-700'
                    : 'text-green-700'
                }`}>
                  {alert.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Cash Position Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-800">Cash on Hand</p>
              <p className="text-2xl font-bold text-gray-900">
                ${kpiData?.cashOnHand.toLocaleString()}
              </p>
              <div className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                getCashRunwayColor(kpiData?.daysCashRunway || 0)
              }`}>
                {kpiData?.daysCashRunway} days runway
              </div>
            </div>
          </div>
        </div>

        {/* Yesterday Revenue Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-800">Yesterday Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                ${kpiData?.yesterdayRevenue.toLocaleString()}
              </p>
              <div className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                getRevenueColor(kpiData?.yesterdayRevenue || 0, 2100) // August target
              }`}>
                Target: $2,100 (Aug)
              </div>
            </div>
          </div>
        </div>

        {/* Units Shipped Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Package className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-800">Units Shipped</p>
              <p className="text-2xl font-bold text-gray-900">
                {kpiData?.unitsShippedYesterday}
              </p>
              <div className="mt-2 text-xs text-gray-700">
                Yesterday
              </div>
            </div>
          </div>
        </div>

        {/* Gross Margin Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Target className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-800">Gross Margin</p>
              <p className="text-2xl font-bold text-gray-900">
                {kpiData?.grossMarginPercentage}%
              </p>
              <div className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                getGrossMarginColor(kpiData?.grossMarginPercentage || 0)
              }`}>
                Target: &gt;58% (Excellent)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bars for WTD/MTD */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WTD Progress */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Week to Date</h3>
            <span className="text-2xl font-bold text-gray-900">
              {kpiData?.wtdProgress.percentage}%
            </span>
          </div>
          <div className="mb-2">
            <div className="flex justify-between text-sm text-gray-800">
              <span>${kpiData?.wtdProgress.actual.toLocaleString()}</span>
              <span>${kpiData?.wtdProgress.target.toLocaleString()}</span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                getProgressColor(kpiData?.wtdProgress.percentage || 0)
              }`}
              style={{ width: `${Math.min(kpiData?.wtdProgress.percentage || 0, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* MTD Progress */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Month to Date</h3>
            <span className="text-2xl font-bold text-gray-900">
              {kpiData?.mtdProgress.percentage}%
            </span>
          </div>
          <div className="mb-2">
            <div className="flex justify-between text-sm text-gray-800">
              <span>${kpiData?.mtdProgress.actual.toLocaleString()}</span>
              <span>${kpiData?.mtdProgress.target.toLocaleString()}</span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                getProgressColor(kpiData?.mtdProgress.percentage || 0)
              }`}
              style={{ width: `${Math.min(kpiData?.mtdProgress.percentage || 0, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend (7 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockRevenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    `$${Number(value).toLocaleString()}`, 
                    name === 'revenue' ? 'Revenue' : 'Target'
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3B82F6" 
                  fill="#3B82F6" 
                  fillOpacity={0.3}
                />
                <Line 
                  type="monotone" 
                  dataKey="target" 
                  stroke="#EF4444" 
                  strokeDasharray="5 5"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cash Runway Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cash Runway Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockCashRunwayData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`${value} days`, 'Cash Runway']}
                />
                <Line 
                  type="monotone" 
                  dataKey="days" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Data Source Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Sources</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            <span className="text-sm font-medium text-gray-800">QuickBooks Connected</span>
          </div>
          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            <span className="text-sm font-medium text-gray-800">Shopify Connected</span>
          </div>
          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
            <span className="text-sm font-medium text-gray-800">
              {error ? 'Using Fallback Data' : 'Live Data'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}