import { AlertTriangle, TrendingUp, DollarSign, Package } from 'lucide-react';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'positive';
  priority: number;
  message: string;
  value?: string;
  action?: string;
}

interface InventoryAlertsSectionProps {
  alerts: Alert[];
}

export default function InventoryAlertsSection({ alerts }: InventoryAlertsSectionProps) {
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      case 'positive': return '🎉';
      default: return '📊';
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical': return 'border-l-red-500 bg-red-50';
      case 'warning': return 'border-l-yellow-500 bg-yellow-50';
      case 'positive': return 'border-l-green-500 bg-green-50';
      default: return 'border-l-blue-500 bg-blue-50';
    }
  };

  const getPriorityColor = (type: string) => {
    switch (type) {
      case 'critical': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'positive': return 'text-green-600';
      default: return 'text-blue-600';
    }
  };

  // Default alerts for initial display
  const displayAlerts = alerts.length > 0 ? alerts : [
    {
      id: '1',
      type: 'critical' as const,
      priority: 1,
      message: 'Low stock alert: Garden Sprinkles (3 units remaining)',
      value: '$1,250',
      action: 'Reorder immediately to maintain sales velocity'
    },
    {
      id: '2',
      type: 'warning' as const,
      priority: 2,
      message: 'Seasonal clearance opportunity: Halloween items',
      value: '$8,500',
      action: 'Apply 35% clearance pricing to move inventory'
    },
    {
      id: '3',
      type: 'positive' as const,
      priority: 3,
      message: 'High margin performer: Christmas Ornaments',
      value: '68% margin',
      action: 'Maintain current pricing strategy'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Business Alerts ({displayAlerts.length})
          </h2>
        </div>
      </div>

      <div className="space-y-3">
        {displayAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`border-l-4 p-4 rounded-r-md ${getAlertColor(alert.type)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <span className="text-lg">{getAlertIcon(alert.type)}</span>
                <div>
                  <p className={`font-medium text-sm ${getPriorityColor(alert.type)}`}>
                    {alert.type.toUpperCase()}{alert.value && `: ${alert.value}`}
                  </p>
                  <p className="text-gray-700 text-sm mt-1">{alert.message}</p>
                  {alert.action && (
                    <p className="text-gray-600 text-xs mt-2">{alert.action}</p>
                  )}
                </div>
              </div>
              <span className={`text-xs font-medium ${getPriorityColor(alert.type)}`}>
                Priority {alert.priority}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}