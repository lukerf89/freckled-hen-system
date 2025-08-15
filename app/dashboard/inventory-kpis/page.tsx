'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import InventoryAlertsSection from '@/components/inventory-kpis/InventoryAlertsSection';
import InventoryMetricsGrid from '@/components/inventory-kpis/InventoryMetricsGrid';
import InventoryProgressSection from '@/components/inventory-kpis/InventoryProgressSection';
import InventoryChartsSection from '@/components/inventory-kpis/InventoryChartsSection';

export default function InventoryKPIPage() {
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { data: kpiData, isLoading, refetch } = useQuery({
    queryKey: ['inventory-kpis'],
    queryFn: fetchInventoryKPIs,
    refetchInterval: 5 * 60 * 1000, // 5-minute refresh
    refetchOnWindowFocus: true,
  });

  const handleRefresh = async () => {
    await refetch();
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

async function fetchInventoryKPIs() {
  const response = await fetch('/api/inventory-kpis/dashboard');
  if (!response.ok) {
    throw new Error('Failed to fetch inventory KPIs');
  }
  return response.json();
}