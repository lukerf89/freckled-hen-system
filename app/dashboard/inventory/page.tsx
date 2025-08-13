'use client';

import { useEffect, useState } from 'react';
import { 
  Package, AlertTriangle, TrendingDown, Clock, 
  RefreshCw, Database, CheckCircle, XCircle, 
  BarChart3, ShoppingCart, DollarSign, AlertCircle
} from 'lucide-react';

interface InventoryStats {
  totalProducts: string;
  totalVariants: string;
  inStockVariants: string;
  outOfStockVariants: string;
  lowStockVariants: string;
  totalUnits: string;
  totalInventoryValue: string;
  lastSync: string;
}

interface SyncHistory {
  id: number;
  sync_type: string;
  status: string;
  products_synced: number;
  variants_synced: number;
  inventory_levels_synced: number;
  errors_count: number;
  started_at: string;
  completed_at: string;
  duration_seconds: number;
}

interface LowStockItem {
  product_title: string;
  sku: string;
  variant_title: string;
  inventory_quantity: number;
}

export default function InventoryDashboard() {
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/inventory/sync');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch inventory data: ${response.status}`);
      }
      
      const data = await response.json();
      
      setStats(data.stats);
      setSyncHistory(data.syncHistory || []);
      setLowStockItems(data.lowStockItems || []);
      
    } catch (err) {
      console.error('Error fetching inventory data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const startSync = async () => {
    try {
      setSyncing(true);
      setError(null);
      
      const response = await fetch('/api/inventory/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(`Sync already in progress (running for ${data.minutesRunning} minutes)`);
        }
        throw new Error(data.error || 'Sync failed');
      }
      
      // Refresh data after successful sync
      await fetchInventoryData();
      
    } catch (err) {
      console.error('Error starting sync:', err);
      setError(err instanceof Error ? err.message : 'Failed to start sync');
    } finally {
      setSyncing(false);
    }
  };

  const resetSync = async () => {
    try {
      setResetting(true);
      setError(null);
      
      const response = await fetch('/api/inventory/sync/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Reset failed');
      }
      
      // Refresh data after reset
      await fetchInventoryData();
      
    } catch (err) {
      console.error('Error resetting sync:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset sync');
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchInventoryData, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'started':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStockStatusColor = (quantity: number) => {
    if (quantity === 0) return 'text-red-600 bg-red-50';
    if (quantity <= 5) return 'text-orange-600 bg-orange-50';
    if (quantity <= 10) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-800">Loading inventory data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="mt-2 text-gray-800">
            Monitor and sync your Shopify inventory
            {stats?.lastSync && ` • Last sync: ${formatDate(stats.lastSync)}`}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-2">
          <button
            onClick={startSync}
            disabled={syncing || resetting}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {syncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Start Full Sync
              </>
            )}
          </button>
          <button
            onClick={resetSync}
            disabled={syncing || resetting}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            {resetting ? (
              <>
                <XCircle className="h-4 w-4 mr-2 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Reset Stuck Sync
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Products */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Package className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-800">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.totalProducts || '0'}
              </p>
              <p className="text-xs text-gray-700 mt-1">
                {stats?.totalVariants || '0'} variants
              </p>
            </div>
          </div>
        </div>

        {/* Stock Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BarChart3 className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-800">Stock Status</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.inStockVariants || '0'}
              </p>
              <div className="flex items-center mt-1 text-xs">
                <span className="text-green-600">{stats?.inStockVariants || '0'} in stock</span>
                <span className="text-gray-500 mx-1">•</span>
                <span className="text-red-600">{stats?.outOfStockVariants || '0'} out</span>
              </div>
            </div>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-800">Low Stock</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.lowStockVariants || '0'}
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Items ≤ 10 units
              </p>
            </div>
          </div>
        </div>

        {/* Inventory Value */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-800">Inventory Value</p>
              <p className="text-2xl font-bold text-gray-900">
                ${parseFloat(stats?.totalInventoryValue || '0').toLocaleString()}
              </p>
              <p className="text-xs text-gray-700 mt-1">
                {stats?.totalUnits || '0'} total units
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Items */}
      {lowStockItems.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">
                Low Stock Items ({lowStockItems.length})
              </h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Variant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Stock
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lowStockItems.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.product_title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {item.sku || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {item.variant_title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        getStockStatusColor(item.inventory_quantity)
                      }`}>
                        {item.inventory_quantity} units
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sync History */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <Database className="h-5 w-5 text-gray-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">
              Sync History
            </h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Products
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Variants
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Started
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {syncHistory.map((sync) => (
                <tr key={sync.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(sync.status)}
                      <span className="ml-2 text-sm text-gray-900">
                        {sync.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {sync.sync_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {sync.products_synced}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {sync.variants_synced}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {sync.duration_seconds ? formatDuration(sync.duration_seconds) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {formatDate(sync.started_at)}
                  </td>
                </tr>
              ))}
              {syncHistory.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                    No sync history available. Click "Start Full Sync" to begin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}