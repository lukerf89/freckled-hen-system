'use client';

import { useState, useEffect } from 'react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import InventoryAlertsSection from '@/components/inventory-kpis/InventoryAlertsSection';
import InventoryMetricsGrid from '@/components/inventory-kpis/InventoryMetricsGrid';
import InventoryProgressSection from '@/components/inventory-kpis/InventoryProgressSection';
import InventoryChartsSection from '@/components/inventory-kpis/InventoryChartsSection';

export default function InventoryKPIPage() {
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [kpiData, setKpiData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/inventory-kpis/dashboard');
      if (response.ok) {
        const data = await response.json();
        setKpiData(data);
      }
    } catch (error) {
      console.error('Failed to fetch inventory KPIs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    await fetchData();
    setLastRefresh(new Date());
  };

  if (isLoading) {
    return (
      <div className="px-4 py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading inventory KPIs...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <DashboardHeader 
        title="Inventory KPI Dashboard"
        lastUpdated={lastRefresh}
        onRefresh={handleRefresh}
      />
      
      <InventoryAlertsSection alerts={kpiData?.alerts || []} />
      
      <InventoryMetricsGrid metrics={kpiData?.metrics || {}} />
      
      <InventoryProgressSection progress={kpiData?.progress || {}} />
      
      <InventoryChartsSection charts={kpiData?.charts || {}} />
    </div>
  );
}
