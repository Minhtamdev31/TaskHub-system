import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, CalendarDays } from 'lucide-react';
import { taskService } from '../services/api';
import { PageSkeleton } from '../components/Skeleton';

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

const PRIORITY = {
  Critical: { label: 'Khẩn cấp', badge: 'bg-rose-100 text-rose-700', border: 'border-l-rose-500' },
  High: { label: 'Cao', badge: 'bg-rose-100 text-rose-700', border: 'border-l-rose-500' },
  Medium: { label: 'Trung bình', badge: 'bg-amber-100 text-amber-700', border: 'border-l-amber-500' },
  Low: { label: 'Thấp', badge: 'bg-emerald-100 text-emerald-700', border: 'border-l-blue-500' },
};
const prio = (p) => PRIORITY[p] || PRIORITY.Medium;

const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const sameDay = (a, b) => dateKey(a) === dateKey(b);
const fmtTime = (iso) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

const CalendarPage = () => {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [projectName, setProjectName] = useState({});
  const [today] = useState(() => new Date());
  const [cursor, setCursor] = useState(() => new Date()); // tháng đang xem
  const [selected, setSelected] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 1 request gộp (/tasks/workspace) thay cho 1 + N getByProject — tránh N+1.
        const wsRes = await taskService.getWorkspace().catch(() => ({ data: [] }));
        if (cancelled) return;
        const all = wsRes.data || [];
        const names = {};
        all.forEach((t) => { names[t.id] = t.projectName; });
        setTasks(all.filter((t) => t.dueDate));
        setProjectName(names);
      } catch (err) {
        console.error('Failed to load calendar', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Gom task theo ngày (key YYYY-MM-DD theo giờ địa phương).
  const byDay = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      const k = dateKey(new Date(t.dueDate));
      (map[k] ||= []).push(t);
    });
    return map;
  }, [tasks]);

  // Lưới ngày của tháng đang xem (bắt đầu từ Chủ nhật).
  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr = [];
    for (let i = 0; i < firstWeekday; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(year, month, d));
    return arr;
  }, [cursor]);

  const selectedTasks = useMemo(() => {
    const list = byDay[dateKey(selected)] || [];
    return [...list].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }, [byDay, selected]);

  const upcoming = useMemo(() => {
    const start = new Date(today); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 7);
    return tasks
      .filter((t) => { const d = new Date(t.dueDate); return d >= start && d < end; })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 4);
  }, [tasks, today]);

  const moveMonth = (delta) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  const goToday = () => { setCursor(new Date()); setSelected(new Date()); };

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Lịch</h1>
          <p className="text-slate-500 mt-1">Xem lịch trình và các hạn chót sắp tới</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 font-semibold text-sm px-4 py-2 rounded-full">
          <Clock size={16} /> {today.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Month calendar */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-extrabold text-slate-900">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => moveMonth(-1)} className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"><ChevronLeft size={18} /></button>
              <button onClick={goToday} className="px-4 py-1.5 rounded-full bg-blue-600 text-white text-sm font-bold hover:bg-blue-700">Hôm nay</button>
              <button onClick={() => moveMonth(1)} className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"><ChevronRight size={18} /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((w) => <div key={w} className="text-center text-xs font-bold text-slate-400 py-1">{w}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <div key={`b${i}`} />;
              const dayTasks = byDay[dateKey(d)] || [];
              const isSelected = sameDay(d, selected);
              const isToday = sameDay(d, today);
              const hasHigh = dayTasks.some((t) => t.priority === 'High' || t.priority === 'Critical');
              return (
                <button
                  key={dateKey(d)}
                  onClick={() => setSelected(d)}
                  className={`h-14 rounded-xl flex flex-col items-center justify-center gap-1 text-sm transition-colors ${
                    isSelected ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/30'
                      : isToday ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {d.getDate()}
                  {dayTasks.length > 0 && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : hasHigh ? 'bg-rose-500' : 'bg-blue-500'}`} />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-5 mt-4 pt-4 border-t border-slate-100 text-sm text-slate-500">
            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Có việc đến hạn</span>
            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Ưu tiên cao</span>
          </div>
        </div>

        {/* Daily schedule */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <h3 className="text-lg font-extrabold text-slate-900">Lịch trong ngày</h3>
          <p className="text-sm text-slate-400 mb-5">{selected.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

          {selectedTasks.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <CalendarDays size={36} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Không có việc nào đến hạn.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedTasks.map((t) => (
                <Link key={t.id} to={`/projects/${t.projectId}`} className="block border border-slate-200 rounded-2xl p-4 hover:border-slate-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm text-slate-500 font-medium"><Clock size={14} /> {fmtTime(t.dueDate)}</span>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${prio(t.priority).badge}`}>{prio(t.priority).label}</span>
                  </div>
                  <p className="font-bold text-slate-900 mt-2">{t.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{projectName[t.id] || 'Dự án'}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming this week */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
        <h3 className="text-xl font-extrabold text-slate-900 mb-5">Sắp tới trong tuần</h3>
        {upcoming.length === 0 ? (
          <p className="text-slate-400 text-sm">Không có việc nào trong 7 ngày tới.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {upcoming.map((t) => (
              <Link
                key={t.id}
                to={`/projects/${t.projectId}`}
                className="group block bg-white border border-slate-200 rounded-2xl p-4 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <CalendarDays size={13} /> {new Date(t.dueDate).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${prio(t.priority).badge}`}>
                    {prio(t.priority).label}
                  </span>
                </div>
                <p className="font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{t.title}</p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{projectName[t.id] || 'Dự án'}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarPage;
