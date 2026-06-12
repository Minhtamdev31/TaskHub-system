import React from 'react';
import { BarChart3, PieChart, Activity, CheckCircle2 } from 'lucide-react';

const DashboardPage = () => {
  const stats = [
    { label: 'Total Projects', value: '12', icon: Activity, color: 'text-blue-600' },
    { label: 'Tasks Completed', value: '84%', icon: CheckCircle2, color: 'text-green-600' },
    { label: 'Active Collaborators', value: '24', icon: BarChart3, color: 'text-indigo-600' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Dashboard</h2>
        <p className="text-slate-500">Overview of your project performance and contributions.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className={`p-3 rounded-lg bg-slate-50 ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart Placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <PieChart size={20} className="text-blue-500" /> Task Completion Rate
          </h3>
          <div className="flex-1 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 italic">
            [ Chart Component Placeholder ]
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Activity size={20} className="text-indigo-500" /> Member Contributions
          </h3>
          <div className="flex-1 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 italic">
            [ Contribution Heatmap Placeholder ]
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;