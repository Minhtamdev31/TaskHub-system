import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

const MainLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Khóa cuộn nền khi drawer mở trên mobile → tránh cuộn giật phía sau.
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  return (
    <div className="app-bg min-h-[100dvh] font-sans tracking-tight text-slate-800 overflow-x-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Lớp phủ khi mở drawer trên mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Thanh trên cùng chỉ hiện trên mobile/tablet */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 h-14 px-4 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 active:scale-95 transition"
          aria-label="Mở menu"
        >
          <Menu size={22} />
        </button>
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src="/TaskHubLogo.png" alt="TaskHub" className="w-7 h-7 rounded-lg object-contain" />
          <span className="text-lg font-black text-blue-600">TaskHub</span>
        </Link>
      </header>

      <main className="lg:ml-64 min-h-[100dvh] overflow-y-auto p-4 sm:p-6 lg:p-12">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
