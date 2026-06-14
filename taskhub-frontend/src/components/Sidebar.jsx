import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  KeyRound,
  Bell,
  Layers,
  Settings,
  Crown,
  ShieldCheck,
  LogOut,
  Moon,
  Sun
} from 'lucide-react';
import { authService, notificationService, invitationService } from '../services/api';
import { getStoredTheme, toggleTheme } from '../theme';

const POLL_INTERVAL_MS = 30000;

const Sidebar = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [theme, setThemeState] = useState(getStoredTheme());
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    authService.getCurrentUser()
      .then((res) => setIsAdmin((res.data?.role || '').toLowerCase() === 'admin'))
      .catch(() => {});
    const onThemeChange = (e) => setThemeState(e.detail);
    window.addEventListener('themechange', onThemeChange);
    return () => window.removeEventListener('themechange', onThemeChange);
  }, []);

  // Live-ish notification badge: poll unread notifications + pending invitations.
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

  const menu = [
    { title: 'Chính', items: [
      { name: 'Tổng quan', path: '/dashboard', icon: LayoutDashboard, matchPrefix: false },
      { name: 'Dự án', path: '/projects', icon: FolderKanban, matchPrefix: true },
    ]},
    { title: 'Làm việc', items: [
      { name: 'Kho mật khẩu', path: '/vault', icon: KeyRound, matchPrefix: false },
      { name: 'Thông báo', path: '/notifications', icon: Bell, matchPrefix: false, badge: unread },
      { name: 'Cài đặt', path: '/settings', icon: Settings, matchPrefix: false },
    ]},
    { title: 'Thanh toán', items: [
      { name: 'Nâng cấp', path: '/pricing', icon: Crown, matchPrefix: false },
    ]},
    ...(isAdmin ? [{ title: 'Quản trị', items: [
      { name: 'Bảng quản trị', path: '/admin', icon: ShieldCheck, matchPrefix: false },
    ]}] : []),
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen fixed left-0 top-0 flex flex-col border-r border-slate-800 z-50">
      <NavLink to="/dashboard" className="p-6 flex items-center gap-3 hover:opacity-90 transition-opacity">
        <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Layers size={22} />
        </div>
        <span className="text-xl font-bold tracking-tight">TaskHub</span>
      </NavLink>

      <nav className="flex-1 px-4 space-y-8 mt-4">
        {menu.map((section) => (
          <div key={section.title}>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em] mb-4 px-3">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={!item.matchPrefix}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-medium text-sm
                    ${isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}
                  `}
                >
                  <item.icon size={18} />
                  <span className="flex-1">{item.name}</span>
                  {item.badge > 0 && (
                    <span className="ml-auto bg-rose-500 text-white text-[10px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-slate-800 space-y-1">
        <button
          onClick={handleToggleTheme}
          className="flex items-center gap-3 px-3 py-2.5 w-full text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition-colors font-medium text-sm"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          <span>{theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full text-slate-400 hover:text-rose-400 hover:bg-rose-400/5 rounded-lg transition-colors font-medium text-sm"
        >
          <LogOut size={18} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
