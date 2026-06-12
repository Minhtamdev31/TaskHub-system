import { useEffect, useState } from 'react';
import { BarChart3, CheckCircle2, Activity, FolderKanban } from 'lucide-react';
import { projectService, taskService } from '../services/api';
import { Link } from 'react-router-dom';

const DashboardPage = () => {
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    completionRate: 0,
  });
  const [recentProjects, setRecentProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [projectsRes, tasksRes] = await Promise.all([
          projectService.getAll(),
          taskService.getAll(),
        ]);
        const projects = projectsRes.data;
        const tasks = tasksRes.data;
        const doneCount = tasks.filter((t) => t.status === 'Done').length;
        const inProgressCount = tasks.filter(
          (t) => t.status === 'InProgress' || t.status === 'Review'
        ).length;

        setStats({
          totalProjects: projects.length,
          totalTasks: tasks.length,
          completedTasks: doneCount,
          inProgressTasks: inProgressCount,
          completionRate: tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0,
        });
        setRecentProjects(projects.slice(0, 5));
      } catch (err) {
        console.error('Failed to load dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const cards = [
    { label: 'Total Projects', value: stats.totalProjects, icon: FolderKanban, color: 'text-blue-600' },
    { label: 'Tasks In Progress', value: stats.inProgressTasks, icon: Activity, color: 'text-indigo-600' },
    { label: 'Completion Rate', value: `${stats.completionRate}%`, icon: CheckCircle2, color: 'text-green-600' },
  ];

  if (loading) {
    return <div className="p-8 text-slate-500">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Dashboard</h2>
        <p className="text-slate-500 mt-1">Real-time overview of your performance and team contributions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {cards.map((stat) => (
          <div key={stat.label} className="bg-white border border-slate-200/80 p-8 rounded-3xl shadow-sm transition-all hover:shadow-md group">
            <div className={`w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 transition-colors group-hover:bg-white ${stat.color} border border-transparent group-hover:border-slate-100`}>
              <stat.icon size={26} />
            </div>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">{stat.label}</p>
            <p className="text-4xl font-black text-slate-900 mt-2 tracking-tighter">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-xl font-extrabold text-slate-900 mb-6 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><BarChart3 size={20} /></div>
            Task Summary
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Total tasks</span>
              <span className="font-bold text-slate-900">{stats.totalTasks}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Completed</span>
              <span className="font-bold text-green-600">{stats.completedTasks}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 mt-2">
              <div
                className="bg-indigo-600 h-3 rounded-full transition-all"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-xl font-extrabold text-slate-900 mb-6 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><FolderKanban size={20} /></div>
            Recent Projects
          </h3>
          {recentProjects.length === 0 ? (
            <p className="text-slate-400 text-sm">No projects yet. Create one from the Projects page.</p>
          ) : (
            <ul className="space-y-3">
              {recentProjects.map((project) => (
                <li key={project.id}>
                  <Link
                    to={`/projects/${project.id}`}
                    className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <span className="font-semibold text-slate-800 group-hover:text-indigo-600">{project.name}</span>
                    <span className="text-xs font-bold text-slate-400 uppercase">{project.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
