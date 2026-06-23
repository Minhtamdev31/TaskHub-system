import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Check, X, Users, Calendar, ShieldCheck, KeyRound, ListTodo } from 'lucide-react';
import { notificationService } from '../services/api';

// Icon + màu nền theo loại thông báo (mô phỏng thiết kế Figma).
const TYPE_STYLE = {
  Project: { icon: Users, tint: 'bg-blue-50 text-blue-600' },
  Deadline: { icon: Calendar, tint: 'bg-amber-50 text-amber-600' },
  Security: { icon: ShieldCheck, tint: 'bg-rose-50 text-rose-600' },
  Password: { icon: KeyRound, tint: 'bg-emerald-50 text-emerald-600' },
  Task: { icon: ListTodo, tint: 'bg-violet-50 text-violet-600' },
};
const fallbackStyle = { icon: Bell, tint: 'bg-slate-100 text-slate-500' };

const timeAgo = (date, now) => {
  const diff = now - new Date(date).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.round(hours / 24)} ngày trước`;
};

// URL điều hướng khi bấm thông báo: ưu tiên link lưu sẵn, fallback theo loại.
const notiTarget = (n) => n.link || (n.type === 'Project' && n.referenceId ? `/projects/${n.referenceId}` : null);

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [now, setNow] = useState(() => Date.now());
  const ref = useRef(null);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const res = await notificationService.getAll();
      setItems(res.data || []);
      setNow(Date.now());
    } catch { /* ignore */ }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await notificationService.getAll();
        if (cancelled) return;
        setItems(res.data || []);
        setNow(Date.now());
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Đóng khi bấm ra ngoài hoặc nhấn Esc.
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const unread = items.filter((n) => !n.isRead).length;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) load();
  };

  const markAllRead = async () => {
    const targets = items.filter((n) => !n.isRead);
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await Promise.all(targets.map((n) => notificationService.markAsRead(n.id).catch(() => {})));
    window.dispatchEvent(new Event('notifications-updated'));
  };

  const markRead = async (id) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    await notificationService.markAsRead(id).catch(() => {});
    window.dispatchEvent(new Event('notifications-updated'));
  };

  // Bấm thông báo → đánh dấu đã đọc + chuyển tới đối tượng liên quan (task/dự án).
  const handleClick = (n) => {
    markRead(n.id);
    setOpen(false);
    const to = notiTarget(n);
    if (to) navigate(to);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative w-11 h-11 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
        aria-label="Thông báo"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 bg-rose-500 text-white text-[10px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-3xl border border-slate-200 shadow-2xl shadow-slate-900/10 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-extrabold text-slate-900">Thông báo</h3>
              {unread > 0 && (
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{unread} mới</span>
              )}
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              {unread > 0 && (
                <button onClick={markAllRead} title="Đánh dấu đã đọc tất cả" className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-colors">
                  <Check size={18} />
                </button>
              )}
              <button onClick={() => setOpen(false)} title="Đóng" className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
            {items.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Bell size={36} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">Chưa có thông báo</p>
              </div>
            ) : (
              items.slice(0, 10).map((n) => {
                const { icon: Icon, tint } = TYPE_STYLE[n.type] || fallbackStyle;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left flex gap-3 px-5 py-4 transition-colors hover:bg-slate-50 ${n.isRead ? '' : 'bg-blue-50/40'} ${notiTarget(n) ? 'cursor-pointer' : ''}`}
                  >
                    {!n.isRead && <span className="mt-2 w-2 h-2 rounded-full bg-blue-600 shrink-0" />}
                    {n.isRead && <span className="mt-2 w-2 h-2 shrink-0" />}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tint}`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm leading-snug ${n.isRead ? 'text-slate-600' : 'text-slate-900 font-semibold'}`}>
                        {n.message}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">{timeAgo(n.createdAt, now)}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block text-center py-3.5 text-sm font-bold text-blue-600 hover:bg-slate-50 border-t border-slate-100 transition-colors"
          >
            Xem tất cả hoạt động
          </Link>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
