interface ProgressData {
  clearanceWeek?: { current: number; target: number; percentage: number };
  marginMonth?: { current: number; target: number; percentage: number };
}

interface InventoryProgressSectionProps {
  progress: ProgressData;
}

export default function InventoryProgressSection({ progress }: InventoryProgressSectionProps) {
  const defaultProgress = {
    clearanceWeek: { current: 15200, target: 25000, percentage: 61 },
    marginMonth: { current: 18500, target: 35000, percentage: 53 }
  };

  const data = {
    clearanceWeek: progress.clearanceWeek || defaultProgress.clearanceWeek,
    marginMonth: progress.marginMonth || defaultProgress.marginMonth
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Clearance Progress */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Clearance to Date</h3>
          <span className="text-2xl font-bold text-gray-900">{data.clearanceWeek.percentage}%</span>
        </div>
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>${data.clearanceWeek.current.toLocaleString()}</span>
            <span>${data.clearanceWeek.target.toLocaleString()}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full ${getProgressColor(data.clearanceWeek.percentage)}`}
              style={{ width: `${data.clearanceWeek.percentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Margin Protection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Margin Protection</h3>
          <span className="text-2xl font-bold text-gray-900">{data.marginMonth.percentage}%</span>
        </div>
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>${data.marginMonth.current.toLocaleString()}</span>
            <span>${data.marginMonth.target.toLocaleString()}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full ${getProgressColor(data.marginMonth.percentage)}`}
              style={{ width: `${data.marginMonth.percentage}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}