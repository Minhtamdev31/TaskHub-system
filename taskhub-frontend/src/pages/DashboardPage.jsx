import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Crown,
  Plus,
  ListChecks,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Sparkles,
  X,
} from 'lucide-react';
import { authService, taskService } from '../services/api';
import NotificationBell from '../components/NotificationBell';
import UpgradePanel from '../components/UpgradePanel';
import { MarkdownLite } from '../utils/markdownLite';
import { PageSkeleton } from '../components/Skeleton';

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
  <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm transition-all hover:shadow-md">
    <div className="flex items-center justify-between">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tint}`}>
        <Icon size={16} />
      </div>
    </div>
    <p className="text-3xl font-black text-slate-900 mt-1.5 tracking-tight">{value}</p>
    {trend && (
      <p className={`text-xs font-medium mt-1 ${trend.up ? 'text-emerald-600' : 'text-rose-600'}`}>
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
  const [statsOpen, setStatsOpen] = useState(false); // cụm thẻ chỉ số: mặc định thu gọn
  const [deadlinesOpen, setDeadlinesOpen] = useState(false); // "Sắp đến hạn": bấm mới hiện
  const [isPremium, setIsPremium] = useState(false);
  const [serverStats, setServerStats] = useState(null); // số liệu thống kê từ backend
  const searchRef = useRef(null);
  // Mốc thời gian chụp một lần khi mount — giữ render thuần (pure).
  const [now] = useState(() => Date.now());

  // Tóm tắt công việc bằng AI (Premium, có cache phía server)
  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiUpgrade, setAiUpgrade] = useState(false);

  // Mở popup AI; lần đầu (chưa có nội dung) thì gọi tạo tóm tắt luôn.
  const openAi = () => {
    setAiOpen(true);
    if (!aiText && !aiLoading) handleAiSummary();
  };

  const handleAiSummary = async () => {
    setAiLoading(true);
    setAiError('');
    setAiUpgrade(false);
    try {
      const res = await taskService.aiMyWork();
      setAiText(res.data?.summary || '');
    } catch (err) {
      if (err.response?.data?.requiresUpgrade) setAiUpgrade(true);
      else setAiError(err.response?.data?.message || 'Không tạo được tóm tắt. Thử lại sau.');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 1 request gộp (/tasks/workspace) thay cho 1 + N getByProject — tránh N+1.
        const [meRes, statsRes, wsRes] = await Promise.all([
          authService.getCurrentUser().catch(() => ({ data: null })),
          taskService.getDashboardStats().catch(() => ({ data: null })),
          taskService.getWorkspace().catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;

        const allTasks = wsRes.data || [];
        const nameMap = {};
        allTasks.forEach((t) => { nameMap[t.id] = t.projectName; });

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
      overdue: s.overdueTasks ?? 0,
      trends: {
        total: fmtPct(s.totalChangePct ?? 0),
        done: fmtPct(s.completedChangePct ?? 0),
        inProgress: fmtPct(s.inProgressChangePct ?? 0),
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
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Chào mừng trở lại, {userName}! <span className="inline-block">👋</span>
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Đây là tổng quan công việc của bạn hôm nay</p>
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
          <button
            onClick={openAi}
            className="bg-brand-gradient text-white font-bold text-sm px-5 py-2.5 rounded-full flex items-center gap-2 shadow-md shadow-indigo-500/25 hover:opacity-90 active:scale-95 transition-all"
          >
            <Sparkles size={16} /> Tóm tắt AI
          </button>
        </div>
      </div>

      {/* Onboarding — tài khoản chưa có công việc nào */}
      {tasks.length === 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-violet-50 border border-blue-100 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-white text-blue-600 flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="font-extrabold text-slate-900">Bắt đầu nào!</p>
              <p className="text-sm text-slate-500 mt-0.5">Tạo dự án đầu tiên và thêm công việc — số liệu tổng quan sẽ tự xuất hiện ở đây.</p>
            </div>
          </div>
          <Link to="/projects" className="shrink-0 bg-blue-600 text-white font-bold text-sm px-5 py-2.5 rounded-full flex items-center gap-2 hover:bg-blue-700 transition-colors">
            <Plus size={16} /> Tạo dự án đầu tiên
          </Link>
        </div>
      )}

      {/* Stat cards (thu gọn / mở ra) */}
      <div>
        <button
          onClick={() => setStatsOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm hover:border-slate-300 transition-colors"
        >
          <span className="flex items-center gap-2 font-bold text-slate-800">
            <ListChecks size={18} className="text-blue-600" /> Chỉ số tổng quan
          </span>
          <span className="flex items-center gap-3">
            {!statsOpen && (
              <span className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-400">
                <span>Tổng {stats.total}</span>·<span>Xong {stats.done}</span>·
                <span className={stats.overdue > 0 ? 'text-rose-500' : ''}>Quá hạn {stats.overdue}</span>
              </span>
            )}
            <ChevronDown size={18} className={`text-slate-400 transition-transform ${statsOpen ? 'rotate-180' : ''}`} />
          </span>
        </button>

        {statsOpen && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 animate-pop">
            <StatCard label="Tổng công việc" value={stats.total} trend={tasks.length ? stats.trends.total : null} icon={ListChecks} tint="bg-blue-50 text-blue-600" />
            <StatCard label="Hoàn thành" value={stats.done} trend={tasks.length ? stats.trends.done : null} icon={CheckCircle2} tint="bg-emerald-50 text-emerald-600" />
            <StatCard label="Đang làm" value={stats.inProgress} trend={tasks.length ? stats.trends.inProgress : null} icon={Clock} tint="bg-amber-50 text-amber-600" />
            <StatCard
              label="Quá hạn"
              value={stats.overdue}
              trend={tasks.length ? (stats.overdue > 0 ? { text: 'Cần xử lý gấp', up: false } : { text: 'Không có việc trễ hạn', up: true }) : null}
              icon={AlertTriangle}
              tint={stats.overdue > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}
            />
          </div>
        )}
      </div>

      {/* Main grid: weekly chart + side column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left column: biểu đồ (chiều cao CỐ ĐỊNH) */}
        <div className="lg:col-span-2">
        {/* Weekly progress */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-xl font-extrabold text-slate-900">Tiến độ tuần này</h3>
          <p className="text-slate-500 text-sm mt-0.5">Công việc hoàn thành trong tuần</p>

          <div className="relative flex items-end justify-between gap-3 h-[400px] mt-6">
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
        </div>

        {/* Side column */}
        <div className="space-y-6">
          {/* Kho mật khẩu — đưa lên đầu, card gradient nổi bật */}
          <Link to="/vault" className="flex items-center justify-between bg-gradient-to-br from-indigo-600 to-violet-600 p-5 rounded-3xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/20 text-white flex items-center justify-center">
                <ShieldCheck size={22} />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Kho mật khẩu</p>
                <p className="text-xs text-indigo-100">Lưu trữ &amp; mở khoá an toàn</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-white/70 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* Sắp đến hạn — thu gọn, bấm để hiện */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setDeadlinesOpen((o) => !o)}
              className="w-full flex items-center justify-between gap-3 px-6 py-4 hover:bg-slate-50 transition-colors"
            >
              <span className="flex items-center gap-2.5 font-extrabold text-slate-900">
                <span className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center"><Clock size={18} /></span>
                Sắp đến hạn
                {upcoming.length > 0 && (
                  <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">{upcoming.length}</span>
                )}
              </span>
              <ChevronDown size={18} className={`text-slate-400 transition-transform ${deadlinesOpen ? 'rotate-180' : ''}`} />
            </button>
            {deadlinesOpen && (
              <div className="px-6 pb-5 animate-pop">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-slate-400 text-xs">7 ngày tới</p>
                  <Link to="/projects" className="text-xs font-semibold text-blue-600 hover:underline">Xem tất cả</Link>
                </div>
                {upcoming.length === 0 ? (
                  <p className="text-slate-400 text-sm py-2">Không có công việc nào sắp đến hạn.</p>
                ) : (
                  <div className="space-y-3">
                    {upcoming.map((t) => {
                      const { day, time } = formatDue(t.dueDate);
                      return (
                        <Link
                          key={t.id}
                          to={`/projects/${t.projectId}?task=${t.id}`}
                          className="block border border-slate-200 rounded-2xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold text-slate-900 text-sm leading-snug group-hover:text-indigo-600 transition-colors">{t.title}</p>
                            <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${PRIORITY_BADGE[t.priority] || PRIORITY_BADGE.Medium}`}>
                              {PRIORITY_LABEL[t.priority] || 'Trung bình'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{projectName[t.id] || 'Dự án'}</p>
                          <div className="flex items-center justify-between mt-3 text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-4">
                              <span>{day}</span>
                              <span className="flex items-center gap-1"><Clock size={13} /> {time}</span>
                            </span>
                            <span className="text-indigo-500 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Mở →</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Hoạt động gần đây — luôn hiện, tối đa 4 mục */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h3 className="flex items-center gap-2.5 font-extrabold text-slate-900 mb-4">
              <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Clock size={18} /></span>
              Hoạt động gần đây
            </h3>
            {recent.length === 0 ? (
              <p className="text-slate-400 text-sm py-2">Chưa có hoạt động nào.</p>
            ) : (
              <div className="space-y-4">
                {recent.map((r) => (
                  <div key={r.id} className="flex items-start gap-3">
                    <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-700 leading-snug">{r.text}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{timeAgo(r.when, now)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Popup Tóm tắt AI */}
      {aiOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setAiOpen(false)}>
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative max-h-[85vh] flex flex-col animate-pop" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center text-white"><Sparkles size={16} /></span>
                Tóm tắt công việc bằng AI
              </h3>
              <div className="flex items-center gap-1">
                {(aiText || aiError) && !aiLoading && !aiUpgrade && (
                  <button onClick={handleAiSummary} className="text-xs font-bold text-slate-500 hover:text-indigo-600 px-2 py-1 rounded-lg hover:bg-slate-100">Làm mới</button>
                )}
                <button onClick={() => setAiOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
              </div>
            </div>

            <div className="px-6 py-5 overflow-y-auto">
              {aiLoading && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <span className="w-8 h-8 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
                  <p className="text-slate-500 text-sm">AI đang đọc công việc của bạn…</p>
                </div>
              )}
              {!aiLoading && aiUpgrade && (
                <UpgradePanel
                  title="Tóm tắt AI là tính năng Premium"
                  message="Nâng cấp Premium để AI tóm tắt công việc và gợi ý ưu tiên mỗi ngày."
                  perks={['Tóm tắt công việc bằng AI', 'Phân tích từng task bằng AI', 'Password Vault bảo mật']}
                />
              )}
              {!aiLoading && !aiUpgrade && aiError && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-sm">{aiError}</div>
              )}
              {!aiLoading && !aiUpgrade && !aiError && aiText && (
                <MarkdownLite text={aiText} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
