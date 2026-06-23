import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, Briefcase, Crown, Pencil, FolderKanban, CheckSquare, CalendarDays } from 'lucide-react';
import { authService, projectService, taskService } from '../services/api';
import { PageSkeleton } from '../components/Skeleton';

const initials = (name) =>
  (name || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

const isValidImageSrc = (s) =>
  typeof s === 'string' && /^(data:image\/|https?:\/\/|\/)/i.test(s.trim());

const StatCard = ({ icon: Icon, label, value, tint }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${tint}`}><Icon size={20} /></div>
    <div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 font-semibold">{label}</p>
    </div>
  </div>
);

const ProfilePage = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ projects: 0, tasks: 0, done: 0 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [meRes, projectsRes, tasksRes] = await Promise.all([
          authService.getCurrentUser().catch(() => ({ data: null })),
          projectService.getAll().catch(() => ({ data: [] })),
          taskService.getAll().catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        const myTasks = tasksRes.data || [];
        setUser(meRes.data);
        setStats({
          projects: (projectsRes.data || []).length,
          tasks: myTasks.length,
          done: myTasks.filter((t) => t.status === 'Done').length,
        });
      } catch (err) {
        console.error('Failed to load profile', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <PageSkeleton />;
  if (!user) return <div className="p-8 text-slate-500">Không tải được hồ sơ.</div>;

  const name = user.profile?.fullName || user.username || 'Người dùng';
  const avatar = user.profile?.avatarUrl;
  const isPremium = user.subscription?.isPremium;
  const joined = user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Hồ sơ</h1>
          <p className="text-slate-500 mt-1">Thông tin cá nhân của bạn</p>
        </div>
        <Link to="/settings" className="flex items-center gap-2 bg-blue-600 text-white font-bold text-sm px-5 py-2.5 rounded-full hover:bg-blue-700 transition-colors">
          <Pencil size={16} /> Chỉnh sửa
        </Link>
      </div>

      {/* Header card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
        <div className="flex items-center gap-6">
          {isValidImageSrc(avatar) ? (
            <img src={avatar} alt={name} className="w-24 h-24 rounded-3xl object-cover border border-slate-200" />
          ) : (
            <div className="w-24 h-24 rounded-3xl bg-blue-600 text-white flex items-center justify-center text-3xl font-black">
              {initials(name)}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-slate-900 truncate">{name}</h2>
              {isPremium && (
                <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                  <Crown size={14} className="fill-amber-400 text-amber-500" /> Premium
                </span>
              )}
            </div>
            {user.profile?.jobTitle && <p className="text-slate-500 mt-1">{user.profile.jobTitle}</p>}
            {user.profile?.bio && <p className="text-slate-600 mt-3 max-w-xl">{user.profile.bio}</p>}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={FolderKanban} label="Dự án" value={stats.projects} tint="bg-blue-50 text-blue-600" />
        <StatCard icon={CheckSquare} label="Công việc được giao" value={stats.tasks} tint="bg-violet-50 text-violet-600" />
        <StatCard icon={CheckSquare} label="Đã hoàn thành" value={stats.done} tint="bg-emerald-50 text-emerald-600" />
      </div>

      {/* Contact details */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-5">
        <h3 className="text-lg font-extrabold text-slate-900">Thông tin liên hệ</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Detail icon={Mail} label="Email" value={user.email} />
          <Detail icon={Phone} label="Số điện thoại" value={user.profile?.phoneNumber || '—'} />
          <Detail icon={Briefcase} label="Chức danh" value={user.profile?.jobTitle || '—'} />
          <Detail icon={CalendarDays} label="Tham gia từ" value={joined || '—'} />
        </div>
      </div>
    </div>
  );
};

const Detail = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><Icon size={18} /></div>
    <div className="min-w-0">
      <p className="text-xs text-slate-400 font-semibold">{label}</p>
      <p className="text-sm font-semibold text-slate-800 truncate">{value}</p>
    </div>
  </div>
);

export default ProfilePage;
