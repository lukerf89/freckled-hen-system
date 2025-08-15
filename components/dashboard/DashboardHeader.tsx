import { RefreshCw } from 'lucide-react';

interface DashboardHeaderProps {
  title: string;
  lastUpdated: Date;
  onRefresh: () => void;
}

export default function DashboardHeader({ title, lastUpdated, onRefresh }: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <nav className="text-sm text-gray-500 mb-2">
          <span>Dashboard</span> <span className="mx-2">/</span> <span>{title}</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      </div>
      <button
        onClick={onRefresh}
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Refresh Data
      </button>
    </div>
  );
}