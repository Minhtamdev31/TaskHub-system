import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, Clock, FolderKanban } from 'lucide-react';
import { projectService, taskService } from '../services/api';

const STATUS_TABS = [
  { key: 'All', label: 'Tất cả' },
  { key: 'Todo', label: 'Cần làm' },
  { key: 'InProgress', label: 'Đang làm' },
  { key: 'Review', label: 'Xem xét' },
  { key: 'Done', label: 'Hoàn thành' },
];

const STATUS_BADGE = {
  Todo: 'bg-slate-100 text-slate-600',
  InProgress: 'bg-blue-100 text-blue-700',
  Review: 'bg-amber-100 text-amber-700',
  Done: 'bg-emerald-100 text-emerald-700',
};
const STATUS_LABEL = { Todo: 'Cần làm', InProgress: 'Đang làm', Review: 'Xem xét', Done: 'Hoàn thành' };

const PRIORITY_BADGE = {
  Critical: 'bg-rose-100 text-rose-700',
  High: 'bg-rose-100 text-rose-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-emerald-100 text-emerald-700',
};
const PRIORITY_LABEL = { Critical: 'Khẩn cấp', High: 'Cao', Medium: 'Trung bình', Low: 'Thấp' };

const fmtDue = (iso) =>
  new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const MyTasksPage = () => {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [projectName, setProjectName] = useState({});
  const [tab, setTab] = useState('All');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tasksRes, projectsRes] = await Promise.all([
          taskService.getAll().catch(() => ({ data: [] })),
          projectService.getAll().catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        const nameMap = {};
        (projectsRes.data || []).forEach((p) => { nameMap[p.id] = p.name; });
        // Bỏ qua task "mồ côi" — projectId trỏ tới dự án đã xóa / không truy cập được,
        // tránh hiện task hỏng và link dẫn tới bảng lỗi.
        const visible = (tasksRes.data || []).filter((t) => nameMap[t.projectId]);
        setTasks(visible);
        setProjectName(nameMap);
      } catch (err) {
        console.error('Failed to load my tasks', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const counts = useMemo(() => {
    const c = { All: tasks.length, Todo: 0, InProgress: 0, Review: 0, Done: 0 };
    tasks.forEach((t) => { if (c[t.status] !== undefined) c[t.status] += 1; });
    return c;
  }, [tasks]);

  const filtered = useMemo(() => {
    const list = tab === 'All' ? tasks : tasks.filter((t) => t.status === tab);
    return [...list].sort((a, b) => {
      const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return da - db;
    });
  }, [tasks, tab]);

  if (loading) return <div className="p-8 text-slate-500">Đang tải công việc...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <CheckSquare className="text-blue-600" size={32} /> Công việc của tôi
        </h1>
        <p className="text-slate-500 mt-1">Tất cả công việc được giao cho bạn qua các dự án</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((s) => (
          <button
            key={s.key}
            onClick={() => setTab(s.key)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
              tab === s.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s.label} <span className={tab === s.key ? 'text-blue-200' : 'text-slate-400'}>{counts[s.key] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center text-slate-400">
          <CheckSquare size={40} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">Không có công việc nào.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <Link
              key={t.id}
              to={`/projects/${t.projectId}`}
              className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900 truncate">{t.title}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><FolderKanban size={13} /> {projectName[t.projectId] || 'Dự án'}</span>
                  {t.dueDate && <span className="flex items-center gap-1"><Clock size={13} /> {fmtDue(t.dueDate)}</span>}
                </div>
              </div>
              <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${PRIORITY_BADGE[t.priority] || PRIORITY_BADGE.Medium}`}>
                {PRIORITY_LABEL[t.priority] || 'Trung bình'}
              </span>
              <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS_BADGE[t.status] || STATUS_BADGE.Todo}`}>
                {STATUS_LABEL[t.status] || t.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyTasksPage;
