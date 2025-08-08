'use client';

import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [status, setStatus] = useState<any>({});
  
  useEffect(() => {
    // Test API connection
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setStatus(data));
  }, []);
  
  return (
    <div className="px-4 py-6">
      <h2 className="text-2xl font-bold mb-6">System Status</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold text-gray-600 mb-2">Database</h3>
          <p className="text-2xl font-bold">
            {status.database ? '✅ Connected' : '❌ Disconnected'}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold text-gray-600 mb-2">Shopify</h3>
          <p className="text-2xl font-bold">
            {status.shopify ? '✅ Connected' : '❌ Disconnected'}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold text-gray-600 mb-2">AI Service</h3>
          <p className="text-2xl font-bold">
            {status.ai ? '✅ Ready' : '⚠️ Not Configured'}
          </p>
        </div>
      </div>

      {/* KPI Dashboard Setup */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4">🚀 KPI Dashboard Setup</h3>
        <p className="text-gray-600 mb-6">
          Connect additional services to unlock comprehensive business analytics and KPI tracking.
        </p>
        
        <div className="grid md:grid-cols-2 gap-4">
          <a
            href="/connect-quickbooks"
            className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h4 className="font-semibold text-gray-900">Connect QuickBooks</h4>
              <p className="text-sm text-gray-600">Sync financial data for comprehensive KPIs</p>
            </div>
            <div className="ml-auto">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </a>
          
          <div className="flex items-center p-4 border-2 border-gray-200 rounded-lg bg-gray-50">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h4 className="font-semibold text-gray-500">Slack Notifications</h4>
              <p className="text-sm text-gray-400">Coming soon - Automated KPI alerts</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}