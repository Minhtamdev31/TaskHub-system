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
  LogOut
} from 'lucide-react';
import { authService } from '../services/api';

const Sidebar = () => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    authService.getCurrentUser()
      .then((res) => setIsAdmin((res.data?.role || '').toLowerCase() === 'admin'))
      .catch(() => {});
  }, []);

  const menu = [
    { title: 'Main', items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, matchPrefix: false },
      { name: 'Projects', path: '/projects', icon: FolderKanban, matchPrefix: true },
    ]},
    { title: 'Workspace', items: [
      { name: 'Vault', path: '/vault', icon: KeyRound, matchPrefix: false },
      { name: 'Notifications', path: '/notifications', icon: Bell, matchPrefix: false },
      { name: 'Settings', path: '/settings', icon: Settings, matchPrefix: false },
    ]},
    { title: 'Billing', items: [
      { name: 'Upgrade', path: '/pricing', icon: Crown, matchPrefix: false },
    ]},
    ...(isAdmin ? [{ title: 'Admin', items: [
      { name: 'Admin Dashboard', path: '/admin', icon: ShieldCheck, matchPrefix: false },
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
                  {item.name}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full text-slate-400 hover:text-rose-400 hover:bg-rose-400/5 rounded-lg transition-colors font-medium text-sm"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
