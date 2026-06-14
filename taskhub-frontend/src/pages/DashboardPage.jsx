import { useEffect, useState } from 'react';
import { BarChart3, CheckCircle2, Activity, FolderKanban, AlertTriangle } from 'lucide-react';
import { projectService, taskService } from '../services/api';
import { Link } from 'react-router-dom';

const STATUS_META = [
  { key: 'Todo', label: 'Todo', color: '#94a3b8' },
  { key: 'InProgress', label: 'In Progress', color: '#6366f1' },
  { key: 'Review', label: 'Review', color: '#f59e0b' },
  { key: 'Done', label: 'Done', color: '#22c55e' },
];

const PRIORITY_META = [
  { key: 'Critical', label: 'Critical', color: '#f43f5e' },
  { key: 'High', label: 'High', color: '#f59e0b' },
  { key: 'Medium', label: 'Medium', color: '#0ea5e9' },
  { key: 'Low', label: 'Low', color: '#94a3b8' },
];

// Lightweight SVG donut chart — no external chart library.
const DonutChart = ({ segments, total, size = 180, stroke = 22 }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--donut-track, #e2e8f0)" strokeWidth={stroke} />
        {total > 0 && segments.map((s) => {
          if (s.value === 0) return null;
          const len = (s.value / total) * circumference;
          const seg = (
            <circle
              key={s.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${len} ${circumference - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return seg;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-slate-900">{total}</span>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tasks</span>
      </div>
    </div>
  );
};

const BarRow = ({ label, value, total, color }) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between items-center text-sm mb-1">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="font-bold text-slate-900">{value} <span className="text-slate-400 font-medium">({pct}%)</span></span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5">
        <div className="h-2.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectStats, setProjectStats] = useState([]); // { id, name, total, done, pct }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const projectsRes = await projectService.getAll();
        const projectList = projectsRes.data || [];

        // Lấy task của từng dự án (toàn bộ thành viên), gộp lại để có bức tranh đầy đủ.
        const taskResults = await Promise.all(
          projectList.map((p) =>
            taskService.getByProject(p.id).then((r) => ({ project: p, tasks: r.data || [] })).catch(() => ({ project: p, tasks: [] }))
          )
        );

        if (cancelled) return;

        const allTasks = taskResults.flatMap((r) => r.tasks);
        const pStats = taskResults.map(({ project, tasks: ts }) => {
          const done = ts.filter((t) => t.status === 'Done').length;
          return { id: project.id, name: project.name, total: ts.length, done, pct: ts.length ? Math.round((done / ts.length) * 100) : 0 };
        });

        setProjects(projectList);
        setTasks(allTasks);
        setProjectStats(pStats);
      } catch (err) {
        console.error('Failed to load dashboard', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <div className="p-8 text-slate-500">Loading dashboard...</div>;
  }

  const total = tasks.length;
  const statusCounts = STATUS_META.map((s) => ({ ...s, value: tasks.filter((t) => t.status === s.key).length }));
  const priorityCounts = PRIORITY_META.map((p) => ({ ...p, value: tasks.filter((t) => (t.priority || 'Medium') === p.key).length }));
  const doneCount = tasks.filter((t) => t.status === 'Done').length;
  const inProgressCount = tasks.filter((t) => t.status === 'InProgress' || t.status === 'Review').length;
  const overdueCount = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Done').length;
  const completionRate = total ? Math.round((doneCount / total) * 100) : 0;

  const cards = [
    { label: 'Total Projects', value: projects.length, icon: FolderKanban, color: 'text-blue-600' },
    { label: 'In Progress', value: inProgressCount, icon: Activity, color: 'text-indigo-600' },
    { label: 'Completion Rate', value: `${completionRate}%`, icon: CheckCircle2, color: 'text-green-600' },
    { label: 'Overdue', value: overdueCount, icon: AlertTriangle, color: 'text-rose-600' },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Dashboard</h2>
        <p className="text-slate-500 mt-1">Real-time overview of your performance and team contributions.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((stat) => (
          <div key={stat.label} className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm transition-all hover:shadow-md group">
            <div className={`w-11 h-11 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{stat.label}</p>
            <p className="text-3xl font-black text-slate-900 mt-1 tracking-tighter">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tasks by status — donut */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-xl font-extrabold text-slate-900 mb-6 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><BarChart3 size={20} /></div>
            Tasks by Status
          </h3>
          {total === 0 ? (
            <p className="text-slate-400 text-sm">No tasks yet.</p>
          ) : (
            <div className="flex items-center gap-8">
              <DonutChart segments={statusCounts} total={total} />
              <div className="flex-1 space-y-3">
                {statusCounts.map((s) => (
                  <div key={s.key} className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-sm text-slate-600 flex-1">{s.label}</span>
                    <span className="text-sm font-bold text-slate-900">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tasks by priority — bars */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-xl font-extrabold text-slate-900 mb-6 flex items-center gap-3">
            <div className="p-2 bg-rose-50 rounded-lg text-rose-600"><Activity size={20} /></div>
            Tasks by Priority
          </h3>
          {total === 0 ? (
            <p className="text-slate-400 text-sm">No tasks yet.</p>
          ) : (
            <div className="space-y-4">
              {priorityCounts.map((p) => (
                <BarRow key={p.key} label={p.label} value={p.value} total={total} color={p.color} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Project progress */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="text-xl font-extrabold text-slate-900 mb-6 flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><FolderKanban size={20} /></div>
          Project Progress
        </h3>
        {projectStats.length === 0 ? (
          <p className="text-slate-400 text-sm">No projects yet. Create one from the Projects page.</p>
        ) : (
          <div className="space-y-5">
            {projectStats.map((p) => (
              <Link key={p.id} to={`/projects/${p.id}`} className="block group">
                <div className="flex justify-between items-center text-sm mb-1.5">
                  <span className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{p.name}</span>
                  <span className="text-slate-400 font-medium">{p.done}/{p.total} done · <span className="font-bold text-slate-700">{p.pct}%</span></span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3">
                  <div className="bg-indigo-600 h-3 rounded-full transition-all" style={{ width: `${p.pct}%` }} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
