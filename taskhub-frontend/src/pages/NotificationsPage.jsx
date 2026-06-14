import { useEffect, useState } from 'react';
import { notificationService, invitationService } from '../services/api';
import { toast } from '../components/Toast';
import { Bell, CheckCheck, FolderKanban, ListTodo, Clock, Mail, Check, X } from 'lucide-react';

const typeIcons = {
  Project: FolderKanban,
  Task: ListTodo,
  Deadline: Clock,
};

const typeLabels = {
  Project: 'Dự án',
  Task: 'Công việc',
  Deadline: 'Hạn chót',
  Mention: 'Nhắc đến',
};

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [nRes, iRes] = await Promise.all([
          notificationService.getAll(),
          invitationService.getMyInvitations().catch(() => ({ data: [] })),
        ]);
        if (!cancelled) {
          setNotifications(nRes.data);
          setInvitations(iRes.data);
        }
      } catch (err) {
        console.error('Failed to fetch notifications', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleRespondInvitation = async (invitationId, accept) => {
    try {
      await invitationService.respond(invitationId, accept);
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
      window.dispatchEvent(new Event('notifications-updated'));
      toast.success(accept ? 'Đã chấp nhận lời mời. Bạn đã tham gia dự án.' : 'Đã từ chối lời mời.');
    } catch {
      toast.error('Phản hồi lời mời thất bại.');
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    await Promise.all(unread.map((n) => notificationService.markAsRead(n.id)));
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    window.dispatchEvent(new Event('notifications-updated'));
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading) {
    return <div className="p-8 text-slate-500">Đang tải thông báo...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Bell className="text-indigo-600" size={36} />
            Thông báo
          </h2>
          <p className="text-slate-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Đã xem hết!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 px-4 py-2 rounded-xl hover:bg-indigo-50 transition-colors"
          >
            <CheckCheck size={18} />
            Đánh dấu đã đọc tất cả
          </button>
        )}
      </div>

      {invitations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Mail size={16} /> Lời mời dự án
          </h3>
          <div className="bg-white border border-indigo-200 rounded-3xl shadow-sm overflow-hidden divide-y divide-slate-100">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center gap-4 px-6 py-5">
                <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600">
                  <FolderKanban size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 font-semibold">
                    {inv.inviterName || 'Ai đó'} đã mời bạn vào <span className="text-indigo-600">{inv.projectName || 'một dự án'}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{new Date(inv.createdAt).toLocaleString('vi-VN')}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleRespondInvitation(inv.id, true)} className="flex items-center gap-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-lg transition-colors">
                    <Check size={14} /> Chấp nhận
                  </button>
                  <button onClick={() => handleRespondInvitation(inv.id, false)} className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:bg-slate-100 px-3 py-2 rounded-lg transition-colors">
                    <X size={14} /> Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Bell size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">Chưa có thông báo</p>
            <p className="text-sm">Cập nhật về dự án và công việc của bạn sẽ hiện ở đây.</p>
          </div>
        ) : (
          notifications.map((notification) => {
            const Icon = typeIcons[notification.type] || Bell;
            return (
              <div
                key={notification.id}
                className={`flex items-start gap-4 px-6 py-5 transition-colors ${
                  notification.isRead ? 'bg-white' : 'bg-indigo-50/40'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${notification.isRead ? 'bg-slate-100 text-slate-400' : 'bg-indigo-100 text-indigo-600'}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${notification.isRead ? 'text-slate-600' : 'text-slate-900 font-semibold'}`}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(notification.createdAt).toLocaleString('vi-VN')}
                    {notification.type && (
                      <span className="ml-2 uppercase tracking-wider font-bold">{typeLabels[notification.type] || notification.type}</span>
                    )}
                  </p>
                </div>
                {!notification.isRead && (
                  <button
                    onClick={() => handleMarkRead(notification.id)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors shrink-0"
                  >
                    Đánh dấu đã đọc
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
