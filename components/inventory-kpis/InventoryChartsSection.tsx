'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartData {
  cashImpactTrend?: Array<{ date: string; score: number }>;
  clearanceProgress?: Array<{ date: string; revenue: number }>;
}

interface InventoryChartsSectionProps {
  charts: ChartData;
}

export default function InventoryChartsSection({ charts }: InventoryChartsSectionProps) {
  const defaultCharts = {
    cashImpactTrend: [
      { date: '8/5', score: 1850 },
      { date: '8/6', score: 2100 },
      { date: '8/7', score: 1950 },
      { date: '8/8', score: 2340 },
      { date: '8/9', score: 2200 },
      { date: '8/10', score: 2480 },
      { date: '8/11', score: 2340 }
    ],
    clearanceProgress: [
      { date: '8/5', revenue: 0 },
      { date: '8/6', revenue: 2800 },
      { date: '8/7', revenue: 5200 },
      { date: '8/8', revenue: 8400 },
      { date: '8/9', revenue: 12100 },
      { date: '8/10', revenue: 14800 },
      { date: '8/11', revenue: 15200 }
    ]
  };

  const data = {
    cashImpactTrend: charts.cashImpactTrend || defaultCharts.cashImpactTrend,
    clearanceProgress: charts.clearanceProgress || defaultCharts.clearanceProgress
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Cash Impact Trend */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cash Impact Trend (7 Days)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.cashImpactTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Clearance Revenue Progress */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Clearance Revenue Progress</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.clearanceProgress}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px'
                }}
                formatter={(value: any) => [`$${value}`, 'Revenue']}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}