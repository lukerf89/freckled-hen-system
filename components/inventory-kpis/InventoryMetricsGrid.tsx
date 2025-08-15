import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Metric {
  title: string;
  value: string;
  subtitle: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: string;
    label: string;
  };
  color: 'blue' | 'green' | 'red' | 'purple';
  icon: string;
}

interface InventoryMetricsGridProps {
  metrics: {
    cashImpact?: Metric;
    clearancePotential?: Metric;
    marginProtection?: Metric;
    q4Readiness?: Metric;
  };
}

export default function InventoryMetricsGrid({ metrics }: InventoryMetricsGridProps) {
  const defaultMetrics: Metric[] = [
    {
      title: "Top Cash Impact",
      value: "Garden Sprinkles",
      subtitle: "Score: 2,340",
      trend: { direction: 'up', value: '15%', label: 'vs last week' },
      color: 'blue',
      icon: '⚡'
    },
    {
      title: "Clearance Potential",
      value: "$52,800",
      subtitle: "35 items ready",
      trend: { direction: 'up', value: '12%', label: 'opportunity' },
      color: 'green',
      icon: '💰'
    },
    {
      title: "Margin Protection",
      value: "$2,100",
      subtitle: "Violations prevented",
      trend: { direction: 'neutral', value: '0', label: 'this week' },
      color: 'purple',
      icon: '🛡️'
    },
    {
      title: "Q4 Readiness",
      value: "85%",
      subtitle: "Holiday items ready",
      trend: { direction: 'up', value: '5%', label: 'improvement' },
      color: 'red',
      icon: '🎄'
    }
  ];

  const allMetrics = [
    metrics.cashImpact || defaultMetrics[0],
    metrics.clearancePotential || defaultMetrics[1],
    metrics.marginProtection || defaultMetrics[2],
    metrics.q4Readiness || defaultMetrics[3]
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      red: 'text-red-600',
      purple: 'text-purple-600'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {allMetrics.map((metric, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl">{metric.icon}</span>
            <div className={`text-right ${getColorClasses(metric.color)}`}>
              {metric.trend && getTrendIcon(metric.trend.direction)}
            </div>
          </div>
          
          <h3 className="text-sm font-medium text-gray-600 mb-2">{metric.title}</h3>
          <p className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</p>
          <p className="text-sm text-gray-500 mb-2">{metric.subtitle}</p>
          
          {metric.trend && (
            <div className="flex items-center text-xs text-gray-500">
              <span className={metric.trend.direction === 'up' ? 'text-green-600' : 
                             metric.trend.direction === 'down' ? 'text-red-600' : 'text-gray-600'}>
                {metric.trend.value} {metric.trend.label}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}