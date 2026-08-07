import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Users, ListChecks, AlertTriangle, TrendingUp, Trophy, Clock, UserPlus,
} from 'lucide-react';
import { projectService, taskService } from '../services/api';
import { PageSkeleton } from '../components/Skeleton';
import UpgradePanel from '../components/UpgradePanel';
import Avatar from '../components/Avatar';

// Cấu hình trạng thái (khớp bảng công việc).
const STATUS = [
  { key: 'todoCount', label: 'Cần làm', dot: 'bg-slate-400', ring: 'text-slate-500 bg-slate-50' },
  { key: 'inProgressCount', label: 'Đang làm', dot: 'bg-blue-500', ring: 'text-blue-600 bg-blue-50' },
  { key: 'reviewCount', label: 'Xem xét', dot: 'bg-amber-500', ring: 'text-amber-600 bg-amber-50' },
  { key: 'doneCount', label: 'Hoàn thành', dot: 'bg-emerald-500', ring: 'text-emerald-600 bg-emerald-50' },
];

const TASK_STATUS = {
  Todo: { label: 'Cần làm', badge: 'bg-slate-100 text-slate-600' },
  InProgress: { label: 'Đang làm', badge: 'bg-blue-100 text-blue-700' },
  Review: { label: 'Xem xét', badge: 'bg-amber-100 text-amber-700' },
  Done: { label: 'Hoàn thành', badge: 'bg-emerald-100 text-emerald-700' },
};

const round = (n) => Math.round(Number(n) || 0);
const initials = (name) => (name || '?').substring(0, 2).toUpperCase();
const fmtDate = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const ProjectDashboardPage = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [upgrade, setUpgrade] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dRes, mRes, tRes] = await Promise.all([
          projectService.getDashboard(id),
          projectService.memberContributions(id).catch(() => ({ data: [] })),
          taskService.getByProject(id).catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        setDash(dRes.data);
        setMembers((mRes.data || []).slice().sort((a, b) => (b.contributionPercentage || 0) - (a.contributionPercentage || 0)));
        setTasks(tRes.data || []);
      } catch (err) {
        if (cancelled) return;
        if (err.response?.data?.requiresUpgrade) setUpgrade(true);
        else setError(err.response?.data?.message || 'Không tải được tổng quan dự án.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <PageSkeleton />;

  const backLink = (
    <Link to={`/projects/${id}`} className="text-sm font-medium text-slate-400 hover:text-indigo-600 flex items-center gap-1 mb-2">
      <ArrowLeft size={14} /> Quay lại bảng công việc
    </Link>
  );

  if (upgrade) {
    return (
      <div className="space-y-5 max-w-3xl">
        {backLink}
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Tổng quan dự án</h1>
        <UpgradePanel
          title="Tổng quan dự án là tính năng Premium"
          message="Nâng cấp Premium để theo dõi tiến độ dự án và mức đóng góp của từng thành viên một cách trực quan."
          perks={['Tiến độ & phân bố trạng thái công việc', 'Đóng góp của từng thành viên', 'Tóm tắt & phân tích dự án bằng AI']}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-5">
        {backLink}
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-sm">{error}</div>
      </div>
    );
  }

  const d = dash || {};
  const pct = round(d.completionPercentage);
  const overdue = d.overdueTasksCount ?? 0;

  const nameMap = {};
  members.forEach((m) => { nameMap[m.userId] = m.username || m.email; });
  const nameOf = (uid) => (uid ? (nameMap[uid] || '—') : '—');
  const recentTasks = [...tasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        {backLink}
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight break-words">{d.projectName || 'Dự án'}</h1>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700">
            <TrendingUp size={13} /> Tổng quan
          </span>
        </div>
        <p className="text-sm text-slate-400 mt-1">Theo dõi tiến độ và đóng góp của cả đội</p>
      </div>

      {/* Hàng trên: donut tiến độ + 3 thẻ chỉ số */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Donut hoàn thành */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center gap-6">
          <div
            className="w-32 h-32 rounded-full shrink-0 grid place-items-center"
            style={{ background: `conic-gradient(#10b981 ${pct * 3.6}deg, #e2e8f0 0deg)` }}
          >
            <div className="w-24 h-24 rounded-full bg-white grid place-items-center">
              <span className="text-2xl font-black text-slate-900">{pct}%</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">Tiến độ hoàn thành</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{d.doneCount ?? 0}<span className="text-lg text-slate-400 font-bold">/{d.totalTasks ?? 0}</span></p>
            <p className="text-xs text-slate-400 mt-1">công việc đã xong</p>
          </div>
        </div>

        {/* Thẻ chỉ số */}
        <StatCard label="Tổng công việc" value={d.totalTasks ?? 0} icon={ListChecks} tint="bg-blue-50 text-blue-600" />
        <StatCard
          label="Quá hạn"
          value={overdue}
          icon={AlertTriangle}
          tint={overdue > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}
          note={overdue > 0 ? 'Cần xử lý gấp' : 'Không có việc trễ hạn'}
          noteColor={overdue > 0 ? 'text-rose-600' : 'text-emerald-600'}
        />
      </div>

      {/* Phân bố trạng thái */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <h3 className="font-extrabold text-slate-900 mb-5">Phân bố theo trạng thái</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATUS.map((s) => (
            <div key={s.key} className="border border-slate-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                <span className="text-sm font-semibold text-slate-600">{s.label}</span>
              </div>
              <p className="text-3xl font-black text-slate-900">{d[s.key] ?? 0}</p>
            </div>
          ))}
        </div>
        {/* Thanh tỉ lệ */}
        <div className="mt-5 flex h-3 rounded-full overflow-hidden bg-slate-100">
          {STATUS.map((s) => {
            const total = d.totalTasks || 0;
            const w = total ? ((d[s.key] ?? 0) / total) * 100 : 0;
            return <div key={s.key} className={s.dot} style={{ width: `${w}%` }} title={`${s.label}: ${d[s.key] ?? 0}`} />;
          })}
        </div>
      </div>

      {/* Đóng góp thành viên */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <h3 className="font-extrabold text-slate-900 flex items-center gap-2 mb-5">
          <Users size={18} className="text-indigo-600" /> Đóng góp của thành viên
        </h3>
        {members.length === 0 ? (
          <p className="text-sm text-slate-400">Chưa có dữ liệu đóng góp.</p>
        ) : (
          <div className="space-y-4">
            {members.map((m, i) => {
              const cpct = round(m.contributionPercentage);
              return (
                <div key={m.userId} className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar src={m.avatarUrl} name={m.username || m.email} className="w-11 h-11 rounded-full text-sm font-black text-indigo-600 bg-indigo-50" />
                    {i === 0 && cpct > 0 && (
                      <span className="absolute -top-1 -right-1 bg-amber-400 text-white rounded-full p-0.5" title="Đóng góp nhiều nhất">
                        <Trophy size={12} />
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-slate-900 truncate">{m.username || m.email}</p>
                      <span className="text-sm font-black text-indigo-600 shrink-0">{cpct}%</span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${Math.min(100, cpct)}%` }} />
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <span className="text-slate-500">Được giao <b className="text-slate-700">{m.totalAssignedTasks ?? 0}</b></span>
                      <span className="text-emerald-600">Xong <b>{m.completedTasks ?? 0}</b></span>
                      <span className="text-blue-600">Đang làm <b>{m.inProgressTasks ?? 0}</b></span>
                      <span className={overdue ? 'text-rose-600' : 'text-slate-400'}>Quá hạn <b>{m.overdueTasks ?? 0}</b></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Công việc mới tạo */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <h3 className="font-extrabold text-slate-900 flex items-center gap-2 mb-5">
          <Clock size={18} className="text-indigo-600" /> Công việc mới tạo
        </h3>
        {recentTasks.length === 0 ? (
          <p className="text-sm text-slate-400">Chưa có công việc.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentTasks.map((t) => {
              const st = TASK_STATUS[t.status] || TASK_STATUS.Todo;
              return (
                <div key={t.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{t.title}</p>
                    <div className="flex items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <UserPlus size={12} className="text-slate-400" /> Tạo bởi <b className="text-slate-700">{nameOf(t.createdById)}</b>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users size={12} className="text-slate-400" /> Giao cho <b className="text-slate-700">{nameOf(t.userId)}</b>
                      </span>
                      <span className="text-slate-400">{fmtDate(t.createdAt)}</span>
                    </div>
                  </div>
                  <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${st.badge}`}>{st.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, tint, note, noteColor }) => (
  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-center">
    <div className="flex items-center justify-between">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tint}`}><Icon size={18} /></div>
    </div>
    <p className="text-4xl font-black text-slate-900 mt-2 tracking-tight">{value}</p>
    {note && <p className={`text-xs font-medium mt-1 ${noteColor}`}>{note}</p>}
  </div>
);

export default ProjectDashboardPage;
