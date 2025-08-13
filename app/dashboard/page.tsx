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
          <h3 className="font-semibold text-gray-800 mb-2">Database</h3>
          <p className="text-2xl font-bold">
            {status.database ? '✅ Connected' : '❌ Disconnected'}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold text-gray-800 mb-2">Shopify</h3>
          <p className="text-2xl font-bold">
            {status.shopify ? '✅ Connected' : '❌ Disconnected'}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold text-gray-800 mb-2">AI Service</h3>
          <p className="text-2xl font-bold">
            {status.ai ? '✅ Ready' : '⚠️ Not Configured'}
          </p>
        </div>
      </div>

      {/* Dashboard Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* KPI Dashboard */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">📊 KPI Dashboard</h3>
            <a
              href="/dashboard/kpi"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              View KPIs
            </a>
          </div>
          <p className="text-gray-700 mb-6">
            Monitor key performance indicators including cash position, revenue trends, and business alerts.
          </p>
          
          <div className="grid md:grid-cols-1 gap-4">
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
                <p className="text-sm text-gray-700">Sync financial data for comprehensive KPIs</p>
              </div>
              <div className="ml-auto">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </a>
          </div>
        </div>

        {/* Inventory Management */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">📦 Inventory Management</h3>
            <a
              href="/dashboard/inventory"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              View Inventory
            </a>
          </div>
          <p className="text-gray-700 mb-6">
            Monitor and sync your Shopify inventory with AI automation capabilities.
          </p>
          
          <div className="grid md:grid-cols-1 gap-4">
            <a
              href="/dashboard/inventory"
              className="flex items-center p-4 border-2 border-green-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors bg-green-25"
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h4 className="font-semibold text-gray-900">Shopify Sync</h4>
                <p className="text-sm text-gray-700">Full inventory sync and monitoring</p>
              </div>
              <div className="ml-auto">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4">🚀 Quick Actions</h3>
        <p className="text-gray-700 mb-6">
          Common operations and integrations for your business management system.
        </p>
        
        <div className="grid md:grid-cols-3 gap-4">
          <a
            href="/dashboard/kpi"
            className="flex items-center p-4 border-2 border-blue-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors bg-blue-25"
          >
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h4 className="font-semibold text-gray-900">KPI Dashboard</h4>
              <p className="text-sm text-gray-700">Business metrics and alerts</p>
            </div>
            <div className="ml-auto">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </a>
          
          <a
            href="/dashboard/inventory"
            className="flex items-center p-4 border-2 border-green-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors bg-green-25"
          >
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h4 className="font-semibold text-gray-900">Inventory Dashboard</h4>
              <p className="text-sm text-gray-700">Shopify sync and management</p>
            </div>
            <div className="ml-auto">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </a>
          
          <div className="flex items-center p-4 border-2 border-gray-200 rounded-lg bg-gray-50">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h4 className="font-semibold text-gray-700">AI Automation</h4>
              <p className="text-sm text-gray-600">Coming soon - Product optimization</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}