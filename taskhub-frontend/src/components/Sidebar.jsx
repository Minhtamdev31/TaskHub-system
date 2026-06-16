import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  CalendarDays,
  FolderKanban,
  UserCircle,
  ShieldCheck,
  Bell,
  Settings,
  ShieldAlert,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';
import { authService, notificationService, invitationService } from '../services/api';
import { getStoredTheme, toggleTheme } from '../theme';

const POLL_INTERVAL_MS = 30000;

const initials = (name) =>
  (name || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

const isValidImageSrc = (s) =>
  typeof s === 'string' && /^(data:image\/|https?:\/\/|\/)/i.test(s.trim());

const Sidebar = () => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [theme, setThemeState] = useState(getStoredTheme());
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    authService.getCurrentUser()
      .then((res) => {
        setUser(res.data);
        setIsAdmin((res.data?.role || '').toLowerCase() === 'admin');
      })
      .catch(() => {});
    const onThemeChange = (e) => setThemeState(e.detail);
    window.addEventListener('themechange', onThemeChange);
    return () => window.removeEventListener('themechange', onThemeChange);
  }, []);

  // Badge thông báo: gộp thông báo chưa đọc + lời mời dự án đang chờ.
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const [nRes, iRes] = await Promise.all([
          notificationService.getAll().catch(() => ({ data: [] })),
          invitationService.getMyInvitations().catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        const unreadNotifs = (nRes.data || []).filter((n) => !n.isRead).length;
        const pendingInvites = (iRes.data || []).length;
        setUnread(unreadNotifs + pendingInvites);
      } catch { /* ignore */ }
    };
    refresh();
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    const onFocus = () => refresh();
    const onUpdated = () => refresh();
    window.addEventListener('focus', onFocus);
    window.addEventListener('notifications-updated', onUpdated);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('notifications-updated', onUpdated);
    };
  }, []);

  const handleToggleTheme = () => setThemeState(toggleTheme());

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const menu = [
    { name: 'Tổng quan', path: '/dashboard', icon: LayoutDashboard, matchPrefix: false },
    { name: 'Công việc của tôi', path: '/my-tasks', icon: CheckSquare, matchPrefix: false },
    { name: 'Lịch', path: '/calendar', icon: CalendarDays, matchPrefix: false },
    { name: 'Dự án', path: '/projects', icon: FolderKanban, matchPrefix: true },
    { name: 'Hồ sơ', path: '/profile', icon: UserCircle, matchPrefix: false },
    { name: 'Kho mật khẩu', path: '/vault', icon: ShieldCheck, matchPrefix: false },
    { name: 'Thông báo', path: '/notifications', icon: Bell, matchPrefix: false, badge: unread },
    { name: 'Cài đặt', path: '/settings', icon: Settings, matchPrefix: false },
    ...(isAdmin ? [{ name: 'Bảng quản trị', path: '/admin', icon: ShieldAlert, matchPrefix: false }] : []),
  ];

  const name = user?.profile?.fullName || user?.username || 'Người dùng';
  const email = user?.email || '';
  const avatar = user?.profile?.avatarUrl;

  return (
    <aside className="w-64 bg-white text-slate-800 h-screen fixed left-0 top-0 flex flex-col border-r border-slate-200 z-50">
      {/* Brand */}
      <NavLink to="/dashboard" className="px-6 pt-6 pb-5 block hover:opacity-90 transition-opacity">
        <h1 className="text-2xl font-black text-blue-600 tracking-tight">TaskHub</h1>
        <p className="text-xs text-slate-400 font-medium mt-0.5">Bảng điều khiển</p>
      </NavLink>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-1">
        {menu.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={!item.matchPrefix}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-full transition-all font-semibold text-sm
              ${isActive
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : 'text-slate-600 hover:bg-slate-100'}
            `}
          >
            <item.icon size={19} />
            <span className="flex-1">{item.name}</span>
            {item.badge > 0 && (
              <span className="ml-auto bg-rose-500 text-white text-[10px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer: theme toggle + user + logout */}
      <div className="border-t border-slate-200 p-4 space-y-3">
        <button
          onClick={handleToggleTheme}
          className="flex items-center gap-3 px-3 py-2 w-full text-slate-500 hover:bg-slate-100 rounded-xl transition-colors font-medium text-sm"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          <span>{theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}</span>
        </button>

        <NavLink to="/profile" className="flex items-center gap-3 px-2 py-1 rounded-xl hover:bg-slate-100 transition-colors">
          {isValidImageSrc(avatar) ? (
            <img src={avatar} alt={name} className="w-10 h-10 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-black shrink-0">
              {initials(name)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{name}</p>
            <p className="text-xs text-slate-400 truncate">{email}</p>
          </div>
        </NavLink>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full text-rose-500 hover:bg-rose-50 rounded-xl transition-colors font-semibold text-sm"
        >
          <LogOut size={18} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
