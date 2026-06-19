import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Crown,
  Plus,
  ListChecks,
  CheckCircle2,
  Clock,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { authService, projectService, taskService } from '../services/api';
import NotificationBell from '../components/NotificationBell';

// --- Helpers ---------------------------------------------------------------

const PRIORITY_BADGE = {
  Critical: 'bg-rose-100 text-rose-700',
  High: 'bg-rose-100 text-rose-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-emerald-100 text-emerald-700',
};
const PRIORITY_LABEL = { Critical: 'Khẩn cấp', High: 'Cao', Medium: 'Trung bình', Low: 'Thấp' };

const STATUS_BADGE = {
  Todo: 'bg-slate-100 text-slate-600',
  InProgress: 'bg-blue-100 text-blue-700',
  Review: 'bg-amber-100 text-amber-700',
  Done: 'bg-emerald-100 text-emerald-700',
};
const STATUS_LABEL = { Todo: 'Cần làm', InProgress: 'Đang làm', Review: 'Xem xét', Done: 'Hoàn thành' };

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

// Định dạng % thay đổi (do backend tính sẵn) thành text + chiều tăng/giảm.
const fmtPct = (pct) => {
  if (!pct) return { text: 'Không đổi so với tuần trước', up: true };
  const up = pct >= 0;
  return { text: `${up ? '+' : '−'}${Math.abs(pct)}% so với tuần trước`, up };
};

// Định dạng chênh lệch điểm phần trăm (cho năng suất).
const fmtPoints = (diff) => {
  if (!diff) return { text: 'Không đổi so với tuần trước', up: true };
  const up = diff >= 0;
  return { text: `${up ? '+' : '−'}${Math.abs(diff)}đ so với tuần trước`, up };
};

const formatDue = (date) => {
  const d = new Date(date);
  const day = `${d.getDate()} thg ${d.getMonth() + 1}`;
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return { day, time };
};

const timeAgo = (date, now) => {
  const diff = now - new Date(date).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.round(hours / 24)} ngày trước`;
};

// --- Small presentational pieces ------------------------------------------

const StatCard = ({ label, value, trend, icon: Icon, tint }) => (
  <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm transition-all hover:shadow-md">
    <div className="flex items-start justify-between">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${tint}`}>
        <Icon size={18} />
      </div>
    </div>
    <p className="text-4xl font-black text-slate-900 mt-3 tracking-tight">{value}</p>
    {trend && (
      <p className={`text-sm font-medium mt-2 ${trend.up ? 'text-emerald-600' : 'text-rose-600'}`}>
        {trend.text}
      </p>
    )}
  </div>
);

// --- Page ------------------------------------------------------------------

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('bạn');
  const [tasks, setTasks] = useState([]);
  const [projectName, setProjectName] = useState({}); // taskId -> project name
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [serverStats, setServerStats] = useState(null); // số liệu thống kê từ backend
  const searchRef = useRef(null);
  // Mốc thời gian chụp một lần khi mount — giữ render thuần (pure).
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [meRes, projectsRes, statsRes] = await Promise.all([
          authService.getCurrentUser().catch(() => ({ data: null })),
          projectService.getAll().catch(() => ({ data: [] })),
          taskService.getDashboardStats().catch(() => ({ data: null })),
        ]);
        const projectList = projectsRes.data || [];

        const taskResults = await Promise.all(
          projectList.map((p) =>
            taskService
              .getByProject(p.id)
              .then((r) => ({ project: p, tasks: r.data || [] }))
              .catch(() => ({ project: p, tasks: [] }))
          )
        );
        if (cancelled) return;

        const allTasks = [];
        const nameMap = {};
        taskResults.forEach(({ project, tasks: ts }) => {
          ts.forEach((t) => {
            allTasks.push(t);
            nameMap[t.id] = project.name;
          });
        });

        setUserName((meRes.data?.profile?.fullName || meRes.data?.username || meRes.data?.email || 'bạn').split('@')[0]);
        setIsPremium(!!meRes.data?.subscription?.isPremium);
        setTasks(allTasks);
        setProjectName(nameMap);
        setServerStats(statsRes.data);
      } catch (err) {
        console.error('Failed to load dashboard', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 4 thẻ chỉ số + xu hướng tuần — lấy từ backend (đã tái dựng từ lịch sử trạng thái).
  const stats = useMemo(() => {
    const s = serverStats || {};
    return {
      total: s.totalTasks ?? 0,
      done: s.completedTasks ?? 0,
      inProgress: s.inProgressTasks ?? 0,
      productivity: s.productivity ?? 0,
      trends: {
        total: fmtPct(s.totalChangePct ?? 0),
        done: fmtPct(s.completedChangePct ?? 0),
        inProgress: fmtPct(s.inProgressChangePct ?? 0),
        productivity: fmtPoints(s.productivityChangePoints ?? 0),
      },
    };
  }, [serverStats]);

  const weekly = useMemo(() => serverStats?.weeklyCompleted ?? new Array(7).fill(0), [serverStats]);
  const weeklyMax = Math.max(1, ...weekly);
  const weeklyEmpty = useMemo(() => weekly.every((c) => !c), [weekly]);

  // Đóng dropdown kết quả tìm kiếm khi bấm ra ngoài.
  useEffect(() => {
    if (!searchOpen) return undefined;
    const onClick = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [searchOpen]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return tasks
      .filter((t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [tasks, search]);

  const upcoming = useMemo(() => {
    return tasks
      .filter((t) => t.status !== 'Done' && t.dueDate && new Date(t.dueDate).getTime() >= now)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 4);
  }, [tasks, now]);

  const recent = useMemo(() => {
    return [...tasks]
      .filter((t) => t.updatedAt || t.createdAt)
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
      .slice(0, 4)
      .map((t) => ({
        id: t.id,
        text: t.status === 'Done' ? `Hoàn thành: ${t.title}` : `Cập nhật: ${t.title}`,
        when: t.updatedAt || t.createdAt,
      }));
  }, [tasks]);

  if (loading) {
    return <div className="p-8 text-slate-500">Đang tải tổng quan...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
            Chào mừng trở lại, {userName}! <span className="inline-block">👋</span>
          </h1>
          <p className="text-slate-500 mt-1">Đây là tổng quan công việc của bạn hôm nay</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative" ref={searchRef}>
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Tìm công việc..."
              className="w-56 md:w-64 pl-10 pr-4 py-2.5 rounded-full bg-slate-100 border border-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-300 transition-colors"
            />

            {searchOpen && search.trim() && (
              <div className="absolute left-0 right-0 mt-2 w-full min-w-[280px] bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-900/10 z-50 overflow-hidden">
                {searchResults.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-slate-400 text-center">
                    Không tìm thấy công việc nào khớp “{search.trim()}”.
                  </p>
                ) : (
                  <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
                    {searchResults.map((t) => (
                      <Link
                        key={t.id}
                        to={`/projects/${t.projectId}`}
                        onClick={() => setSearchOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800 truncate">{t.title}</p>
                          <p className="text-xs text-slate-400 truncate">{projectName[t.id] || 'Dự án'}</p>
                        </div>
                        <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS_BADGE[t.status] || STATUS_BADGE.Todo}`}>
                          {STATUS_LABEL[t.status] || t.status}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <NotificationBell />

          {isPremium ? (
            <Link
              to="/settings"
              className="bg-amber-50 text-amber-700 border border-amber-200 font-bold text-sm px-5 py-2.5 rounded-full flex items-center gap-2 hover:bg-amber-100 transition-colors"
              title="Bạn đang dùng gói Premium"
            >
              <Crown size={16} className="fill-amber-400 text-amber-500" /> Premium
            </Link>
          ) : (
            <Link to="/pricing" className="bg-brand-gradient text-white font-bold text-sm px-5 py-2.5 rounded-full flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity">
              <Sparkles size={16} /> Nâng cấp
            </Link>
          )}
          <Link to="/projects" className="bg-blue-600 text-white font-bold text-sm px-5 py-2.5 rounded-full flex items-center gap-2 shadow-sm shadow-blue-600/20 hover:bg-blue-700 transition-colors">
            <Plus size={16} /> Thêm việc
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard label="Tổng công việc" value={stats.total} trend={stats.trends.total} icon={ListChecks} tint="bg-blue-50 text-blue-600" />
        <StatCard label="Hoàn thành" value={stats.done} trend={stats.trends.done} icon={CheckCircle2} tint="bg-emerald-50 text-emerald-600" />
        <StatCard label="Đang làm" value={stats.inProgress} trend={stats.trends.inProgress} icon={Clock} tint="bg-amber-50 text-amber-600" />
        <StatCard label="Năng suất" value={`${stats.productivity}%`} trend={stats.trends.productivity} icon={TrendingUp} tint="bg-violet-50 text-violet-600" />
      </div>

      {/* Main grid: weekly chart + side column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly progress */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-xl font-extrabold text-slate-900">Tiến độ tuần này</h3>
          <p className="text-slate-500 text-sm mt-0.5">Công việc hoàn thành trong tuần</p>

          <div className="relative flex items-end justify-between gap-3 h-64 mt-8">
            {weeklyEmpty && (
              <div className="absolute inset-x-0 top-0 bottom-8 flex items-center justify-center pointer-events-none">
                <p className="text-slate-400 text-sm">Chưa có công việc hoàn thành trong tuần này.</p>
              </div>
            )}
            {weekly.map((count, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-3">
                <div className="w-full flex items-end justify-center h-full">
                  <div
                    className="w-full max-w-[52px] bg-blue-600 rounded-t-xl transition-all hover:bg-blue-700"
                    style={{ height: `${(count / weeklyMax) * 100}%`, minHeight: count > 0 ? 8 : 2 }}
                    title={`${count} công việc`}
                  />
                </div>
                <span className="text-sm font-medium text-slate-500">{WEEKDAYS[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Side column */}
        <div className="space-y-6">
          {/* Upcoming deadlines */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-extrabold text-slate-900">Sắp đến hạn</h3>
              <Link to="/projects" className="text-sm font-semibold text-blue-600 hover:underline">Xem tất cả</Link>
            </div>
            <p className="text-slate-400 text-xs mb-4">7 ngày tới</p>

            {upcoming.length === 0 ? (
              <p className="text-slate-400 text-sm py-4">Không có công việc nào sắp đến hạn.</p>
            ) : (
              <div className="space-y-3">
                {upcoming.map((t) => {
                  const { day, time } = formatDue(t.dueDate);
                  return (
                    <div key={t.id} className="border border-slate-200 rounded-2xl p-4 hover:border-slate-300 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-slate-900 text-sm leading-snug">{t.title}</p>
                        <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${PRIORITY_BADGE[t.priority] || PRIORITY_BADGE.Medium}`}>
                          {PRIORITY_LABEL[t.priority] || 'Trung bình'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{projectName[t.id] || 'Dự án'}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 font-medium">
                        <span>{day}</span>
                        <span className="flex items-center gap-1"><Clock size={13} /> {time}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Secure vault */}
          <Link to="/vault" className="flex items-center justify-between bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:border-slate-300 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Kho mật khẩu</p>
                <p className="text-xs text-slate-400">Lưu trữ &amp; mở khoá mật khẩu an toàn</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
          </Link>
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="text-xl font-extrabold text-slate-900 mb-6">Hoạt động gần đây</h3>
        {recent.length === 0 ? (
          <p className="text-slate-400 text-sm">Chưa có hoạt động nào.</p>
        ) : (
          <div className="space-y-5">
            {recent.map((r) => (
              <div key={r.id} className="flex items-center gap-4">
                <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                <p className="text-sm text-slate-700 flex-1">{r.text}</p>
                <span className="text-xs text-slate-400 font-medium shrink-0">{timeAgo(r.when, now)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
