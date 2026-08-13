import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Users, CreditCard, Package,
  TrendingUp, ShoppingCart, Crown, Trash2, Plus, X, ShieldCheck, Shield, Server, Zap,
  ChevronLeft, ChevronRight, FileText, User, Hash, Clock, Search,
} from 'lucide-react';
import { HubConnectionBuilder } from '@microsoft/signalr';
import { adminService } from '../services/api';

// Hub SignalR (đơn hàng real-time) — cùng hub với dự án, chạy trên Render.
const ORDERS_HUB_URL = 'https://taskhub-system.onrender.com/hubs/project';
import { toast } from '../components/Toast';
import { confirm } from '../components/ConfirmDialog';
import { Skeleton } from '../components/Skeleton';
import Select from '../components/Select';

// Thanh phân trang dùng chung — hiện tổng số + nút trước/sau. Ẩn nếu chỉ có 1 trang.
const Pager = ({ page, totalPages, total, onChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 text-sm">
      <span className="text-slate-500">Tổng <b className="text-slate-700">{total}</b> · trang {page}/{totalPages}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(page - 1)} disabled={page <= 1}
          className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Trang trước"
        ><ChevronLeft size={18} /></button>
        <button
          onClick={() => onChange(page + 1)} disabled={page >= totalPages}
          className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Trang sau"
        ><ChevronRight size={18} /></button>
      </div>
    </div>
  );
};

const TABS = [
  { id: 'overview', name: 'Tổng quan', icon: LayoutDashboard },
  { id: 'users', name: 'Người dùng', icon: Users },
  { id: 'plans', name: 'Gói dịch vụ', icon: Package },
  { id: 'orders', name: 'Đơn hàng', icon: CreditCard },
  { id: 'system', name: 'Hệ thống', icon: Server },
];

const formatPrice = (p) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(p || 0);

const STATUS_STYLE = {
  Completed: 'bg-green-100 text-green-700',
  Pending: 'bg-amber-100 text-amber-700',
  Cancelled: 'bg-slate-100 text-slate-500',
  Failed: 'bg-rose-100 text-rose-700',
};

const STATUS_LABEL = {
  Completed: 'Hoàn tất',
  Pending: 'Đang xử lý',
  Cancelled: 'Đã hủy',
  Failed: 'Thất bại',
};

const AdminDashboardPage = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <ShieldCheck className="text-indigo-600" size={36} /> Admin Dashboard
        </h2>
        <p className="text-slate-500 mt-1">Quản lý người dùng, gói dịch vụ, doanh thu và đơn hàng.</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 -mb-px transition-colors ${
              activeTab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon size={16} /> {t.name}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'plans' && <PlansTab />}
      {activeTab === 'orders' && <OrdersTab />}
      {activeTab === 'system' && <SystemTab />}
    </div>
  );
};

/* ---------------- System (chống ngủ đông) ---------------- */
const SystemTab = () => {
  const [enabled, setEnabled] = useState(null); // null = đang tải
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminService.getKeepAlive()
      .then((res) => setEnabled(!!res.data?.enabled))
      .catch(() => toast.error('Không tải được trạng thái keep-alive.'));
  }, []);

  const toggle = async () => {
    const next = !enabled;
    setSaving(true);
    try {
      const res = await adminService.setKeepAlive(next);
      setEnabled(!!res.data?.enabled);
      toast.success(next ? 'Đã bật chống ngủ đông.' : 'Đã tắt chống ngủ đông.');
    } catch {
      toast.error('Cập nhật thất bại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Zap size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-extrabold text-slate-900">Chống ngủ đông (Keep-alive)</h3>
          </div>
          {enabled === null ? (
            <span className="text-sm text-slate-400 shrink-0">Đang tải...</span>
          ) : (
            <button
              onClick={toggle}
              disabled={saving}
              className={`shrink-0 w-14 h-8 rounded-full relative transition-colors disabled:opacity-50 ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
              title={enabled ? 'Đang bật' : 'Đang tắt'}
            >
              <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${enabled ? 'left-7' : 'left-1'}`} />
            </button>
          )}
        </div>

        {enabled !== null && (
          <div className="mt-5">
            <span
              title={enabled ? 'Đang bật — dịch vụ được giữ thức.' : 'Đang tắt — dịch vụ có thể ngủ đông.'}
              className={`inline-block w-2.5 h-2.5 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
            />
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        Lưu ý: cách này chỉ giữ máy chủ thức khi nó đang chạy. Nếu máy chủ đã “ngủ” (ví dụ vừa cập nhật hệ thống),
        nó không tự thức dậy được — cần có người mở web lần đầu để đánh thức. Muốn chắc chắn hơn, có thể dùng thêm
        một công cụ tự động ghé thăm web giúp (ví dụ UptimeRobot) để giữ máy chủ luôn thức.
      </p>
    </div>
  );
};

/* ---------------- Overview ---------------- */
const OverviewTab = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getDashboard()
      .then((res) => setData(res.data))
      .catch(() => toast.error('Không tải được thống kê.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>;
  if (!data) return null;

  const cards = [
    { label: 'Tổng doanh thu', value: formatPrice(data.totalRevenue), icon: TrendingUp, color: 'text-green-600 bg-green-50' },
    { label: 'Giao dịch thành công', value: data.totalSuccessTransactions, icon: ShoppingCart, color: 'text-indigo-600 bg-indigo-50' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${c.color}`}>
              <c.icon size={24} />
            </div>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">{c.label}</p>
            <p className="text-4xl font-black text-slate-900 mt-2 tracking-tighter">{c.value}</p>
          </div>
        ))}
      </div>

      <Link
        to="/admin/revenue"
        className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl px-6 py-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all group"
      >
        <span className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText size={20} />
          </span>
          <span>
            <span className="block font-bold text-slate-900">Báo cáo doanh thu</span>
            <span className="block text-xs text-slate-500">Xem tổng hợp đơn đã bán · xuất CSV · in/lưu PDF</span>
          </span>
        </span>
        <ChevronRight size={18} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <h3 className="font-extrabold text-slate-900 mb-4">Phân bổ theo gói</h3>
          {Object.keys(data.planBreakdown || {}).length === 0 ? (
            <p className="text-sm text-slate-400">Chưa có dữ liệu.</p>
          ) : (
            <ul className="space-y-3">
              {Object.entries(data.planBreakdown).map(([plan, count]) => (
                <li key={plan} className="flex justify-between items-center text-sm">
                  <span className="font-medium text-slate-700">{plan}</span>
                  <span className="font-bold text-indigo-600">{count} đơn</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <h3 className="font-extrabold text-slate-900 mb-4">Đơn gần đây</h3>
          {(data.recentOrders || []).length === 0 ? (
            <p className="text-sm text-slate-400">Chưa có đơn nào.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentOrders.map((o) => (
                <li key={o.id} className="flex justify-between items-center py-2.5 text-sm">
                  <span className="font-medium text-slate-700">{o.planTitle}</span>
                  <span className="font-bold text-slate-900">{formatPrice(o.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------------- Users ---------------- */
const USERS_PAGE_SIZE = 10;
// Tài khoản quản trị gốc — khoá cứng, không cho bỏ quyền admin hay xoá.
const PROTECTED_ADMIN_EMAIL = 'admin@taskhub.com';

const UsersTab = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');   // all | admin | member
  const [planFilter, setPlanFilter] = useState('all');   // all | premium | free
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    // Tải tối đa 100 user để tìm kiếm/lọc trên toàn bộ, không chỉ trang hiện tại.
    adminService.getUsers(1, 100)
      .then((res) => setAllUsers(res.data.items || []))
      .catch(() => toast.error('Không tải được danh sách người dùng.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  // Đổi bộ lọc → về trang 1.
  useEffect(() => { setPage(1); }, [search, roleFilter, planFilter]);

  const adminCount = allUsers.filter((u) => (u.role || '').toLowerCase() === 'admin').length;

  const handleGrant = async (u) => {
    try { await adminService.grantPremium(u.id, 30); toast.success(`Đã cấp Premium cho ${u.username}.`); load(); }
    catch { toast.error('Cấp Premium thất bại.'); }
  };
  const handleRevoke = async (u) => {
    try { await adminService.revokePremium(u.id); toast.success(`Đã thu hồi Premium của ${u.username}.`); load(); }
    catch { toast.error('Thu hồi thất bại.'); }
  };
  const handleToggleRole = async (u) => {
    const isAdmin = (u.role || '').toLowerCase() === 'admin';
    const newRole = isAdmin ? 'Member' : 'Admin';

    if (isAdmin) {
      // Cảnh báo rõ ràng để tránh bấm nhầm bỏ quyền admin.
      const lastAdmin = adminCount <= 1;
      const ok = await confirm({
        title: 'Bỏ quyền admin?',
        message: lastAdmin
          ? `"${u.username}" là ADMIN DUY NHẤT. Bỏ quyền sẽ khiến hệ thống không còn ai quản trị (không vào được trang admin, báo cáo doanh thu). Bạn chắc chắn?`
          : `"${u.username}" sẽ mất toàn bộ quyền quản trị: không vào được trang admin, quản lý người dùng, báo cáo doanh thu. Bạn chắc chắn?`,
        confirmText: 'Bỏ quyền admin',
        danger: true,
      });
      if (!ok) return;
    } else {
      const ok = await confirm({
        title: 'Cấp quyền admin?',
        message: `"${u.username}" sẽ có TOÀN QUYỀN quản trị hệ thống.`,
        confirmText: 'Cấp admin',
      });
      if (!ok) return;
    }

    try { await adminService.updateUser(u.id, { role: newRole }); toast.success(`Đã đổi vai trò ${u.username} → ${newRole}.`); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Đổi vai trò thất bại.'); }
  };
  const handleDelete = async (u) => {
    if (!(await confirm({ title: 'Xóa người dùng?', message: `Người dùng "${u.username}" sẽ bị xóa.`, confirmText: 'Xóa', danger: true }))) return;
    try { await adminService.deleteUser(u.id); toast.success('Đã xóa người dùng.'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Xóa thất bại.'); }
  };

  // Tìm kiếm (tên/email) + lọc theo vai trò & gói — tất cả client-side.
  const q = search.trim().toLowerCase();
  const filtered = allUsers.filter((u) => {
    const matchSearch = !q
      || (u.username || '').toLowerCase().includes(q)
      || (u.email || '').toLowerCase().includes(q);
    const isAdmin = (u.role || '').toLowerCase() === 'admin';
    const matchRole = roleFilter === 'all' || (roleFilter === 'admin' ? isAdmin : !isAdmin);
    const isPremium = !!u.subscription?.isPremium;
    const matchPlan = planFilter === 'all' || (planFilter === 'premium' ? isPremium : !isPremium);
    return matchSearch && matchRole && matchPlan;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / USERS_PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageClamped - 1) * USERS_PAGE_SIZE, pageClamped * USERS_PAGE_SIZE);

  if (loading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
      {/* Thanh tìm kiếm + lọc */}
      <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-slate-100">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc email…"
            className="w-full text-sm border border-slate-200 rounded-xl pl-9 pr-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <Select
          value={roleFilter}
          onChange={setRoleFilter}
          className="w-40"
          options={[
            { value: 'all', label: 'Mọi vai trò' },
            { value: 'admin', label: 'Admin', dot: 'bg-purple-500' },
            { value: 'member', label: 'Member', dot: 'bg-slate-400' },
          ]}
        />
        <Select
          value={planFilter}
          onChange={setPlanFilter}
          className="w-36"
          options={[
            { value: 'all', label: 'Mọi gói' },
            { value: 'premium', label: 'Premium', dot: 'bg-indigo-500' },
            { value: 'free', label: 'Free', dot: 'bg-slate-400' },
          ]}
        />
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} người dùng</span>
      </div>

      <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100">
        <thead className="bg-slate-50/70">
          <tr>
            {['Người dùng', 'Vai trò', 'Gói', 'Hành động'].map((h) => (
              <th key={h} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {pageItems.map((u) => {
            const isAdmin = (u.role || '').toLowerCase() === 'admin';
            const isPremium = u.subscription?.isPremium;
            const isProtectedAdmin = (u.email || '').toLowerCase() === PROTECTED_ADMIN_EMAIL; // admin gốc → khoá cứng
            return (
              <tr key={u.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900">{u.username}</div>
                  <div className="text-xs text-slate-400">{u.email}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                    {u.role || 'Member'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${isPremium ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                    {isPremium ? 'Premium' : 'Free'}
                  </span>
                  {isPremium && (() => {
                    const until = u.subscription?.premiumUntil;
                    if (!until) return <div className="text-[11px] mt-1 text-slate-400">Không thời hạn</div>;
                    const expired = new Date(until) < new Date();
                    return (
                      <div className={`text-[11px] mt-1 ${expired ? 'text-rose-500 font-semibold' : 'text-slate-400'}`}>
                        {expired ? 'Đã hết hạn ' : 'Hết hạn '}{new Date(until).toLocaleDateString('vi-VN')}
                      </div>
                    );
                  })()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isPremium ? (
                      <button onClick={() => handleRevoke(u)} className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100">Thu hồi Premium</button>
                    ) : (
                      <button onClick={() => handleGrant(u)} className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center gap-1"><Crown size={12} /> Cấp Premium</button>
                    )}
                    {isProtectedAdmin ? (
                      <span
                        title="Tài khoản quản trị gốc — không thể bỏ quyền admin hoặc xoá."
                        className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-slate-50 text-slate-400 flex items-center gap-1 cursor-default"
                      >
                        <ShieldCheck size={12} /> Được bảo vệ
                      </span>
                    ) : (
                      <>
                        <button onClick={() => handleToggleRole(u)} className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center gap-1">
                          <Shield size={12} /> {isAdmin ? 'Bỏ admin' : 'Cấp admin'}
                        </button>
                        <button onClick={() => handleDelete(u)} className="text-slate-300 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg"><Trash2 size={16} /></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {filtered.length === 0 && (
            <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">Không tìm thấy người dùng phù hợp.</td></tr>
          )}
        </tbody>
      </table>
      </div>
      <Pager page={pageClamped} totalPages={totalPages} total={filtered.length} onChange={setPage} />
    </div>
  );
};

/* ---------------- Plans ---------------- */
const emptyPlan = { name: '', title: '', price: 0, durationDays: 30, description: '' };

const PlansTab = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // plan id or null (create)
  const [form, setForm] = useState(emptyPlan);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminService.getAllPlans()
      .then((res) => setPlans(res.data))
      .catch(() => toast.error('Không tải được danh sách gói.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(emptyPlan); setModalOpen(true); };
  const openEdit = (p) => {
    setEditing(p.id);
    setForm({ name: p.name, title: p.title, price: p.price, durationDays: p.durationDays, description: p.description || '' });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, price: Number(form.price), durationDays: Number(form.durationDays) };
    try {
      if (editing) { await adminService.updatePlan(editing, payload); toast.success('Đã cập nhật gói.'); }
      else { await adminService.createPlan(payload); toast.success('Đã tạo gói.'); }
      setModalOpen(false);
      load();
    } catch { toast.error('Lưu gói thất bại.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (p) => {
    if (!(await confirm({ title: 'Xóa gói?', message: `Gói "${p.title}" sẽ bị xóa.`, confirmText: 'Xóa', danger: true }))) return;
    try { await adminService.deletePlan(p.id); toast.success('Đã xóa gói.'); load(); }
    catch { toast.error('Xóa thất bại.'); }
  };

  if (loading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openCreate} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 flex items-center gap-2">
          <Plus size={16} /> Tạo gói mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((p) => (
          <div key={p.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-black text-slate-900">{p.title}</h3>
                <p className="text-xs text-slate-400">{p.name}</p>
              </div>
              <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {p.isActive ? 'Active' : 'Ẩn'}
              </span>
            </div>
            <p className="text-2xl font-black text-indigo-600 mt-3">{formatPrice(p.price)}</p>
            <p className="text-xs text-slate-500">{p.durationDays} ngày</p>
            {p.description && <p className="text-sm text-slate-500 mt-2 line-clamp-2">{p.description}</p>}
            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-50">
              <button onClick={() => openEdit(p)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100">Sửa</button>
              <button onClick={() => handleDelete(p)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100">Xóa</button>
            </div>
          </div>
        ))}
        {plans.length === 0 && <p className="text-sm text-slate-400">Chưa có gói nào.</p>}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl relative">
            <button type="button" onClick={() => setModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
            <h3 className="text-2xl font-bold mb-6">{editing ? 'Sửa gói' : 'Tạo gói mới'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mã gói (name)</label>
                <input required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Premium1Thang" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên hiển thị (title)</label>
                <input required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Premium 1 Tháng" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Giá (VND)</label>
                  <input type="number" required min="0" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Số ngày</label>
                  <input type="number" required min="1" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả</label>
                <textarea rows={2} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-500 font-medium px-4">Hủy</button>
              <button type="submit" disabled={saving} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

/* ---------------- Orders ---------------- */

// Modal chi tiết 1 đơn hàng (bấm vào 1 dòng để mở).
const DetailRow = ({ icon: Icon, label, children }) => (
  <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
    <Icon size={16} className="text-slate-400 mt-0.5 shrink-0" />
    <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="text-sm text-slate-800 break-words">{children}</div>
    </div>
  </div>
);

const OrderDetailModal = ({ order, onClose }) => {
  if (!order) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-black text-slate-900">Chi tiết đơn hàng</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>
        <div className="px-5 pb-4">
          <div className="flex items-center justify-between py-4">
            <span className="text-2xl font-black text-slate-900">{formatPrice(order.amount)}</span>
            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${STATUS_STYLE[order.status] || 'bg-slate-100 text-slate-500'}`}>{STATUS_LABEL[order.status] || order.status}</span>
          </div>
          <DetailRow icon={User} label="Người mua">
            <p className="font-semibold">{order.userName || '—'}</p>
            <p className="text-slate-500 text-xs">{order.userEmail || '—'}</p>
          </DetailRow>
          <DetailRow icon={Package} label="Gói">{order.planTitle}</DetailRow>
          <DetailRow icon={Hash} label="Mã giao dịch"><span className="font-mono">{order.paymentCode}</span></DetailRow>
          <DetailRow icon={CreditCard} label="Cổng thanh toán">{order.paymentGateway}</DetailRow>
          <DetailRow icon={Clock} label="Ngày tạo">{new Date(order.createdAt).toLocaleString('vi-VN')}</DetailRow>
          {order.completedAt && (
            <DetailRow icon={Clock} label="Ngày hoàn tất">{new Date(order.completedAt).toLocaleString('vi-VN')}</DetailRow>
          )}
          <DetailRow icon={FileText} label="Mã đơn (ID)"><span className="font-mono text-xs text-slate-500">{order.id}</span></DetailRow>
        </div>
      </div>
    </div>
  );
};

const OrdersTab = () => {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // đơn đang mở chi tiết
  const [flash, setFlash] = useState(() => new Set()); // id đơn vừa đổi → highlight
  const [live, setLive] = useState(false); // đã kết nối real-time chưa
  const pageRef = useRef(page);
  pageRef.current = page;

  useEffect(() => {
    setLoading(true);
    adminService.getAllOrders(page)
      .then((res) => {
        setOrders(res.data.items || []);
        setMeta({ total: res.data.total || 0, totalPages: res.data.totalPages || 1 });
      })
      .catch(() => toast.error('Không tải được đơn hàng.'))
      .finally(() => setLoading(false));
  }, [page]);

  // Đánh dấu 1 đơn "vừa thay đổi" để highlight ~2.5 giây.
  const markFlash = useCallback((id) => {
    setFlash((prev) => new Set(prev).add(id));
    setTimeout(() => setFlash((prev) => {
      const n = new Set(prev); n.delete(id); return n;
    }), 2500);
  }, []);

  // Kết nối SignalR 1 lần, nghe 'orderChanged' để cập nhật bảng tức thì.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    const connection = new HubConnectionBuilder()
      .withUrl(ORDERS_HUB_URL, { accessTokenFactory: () => localStorage.getItem('token') })
      .withAutomaticReconnect()
      .build();

    connection.on('orderChanged', ({ action, order }) => {
      if (!order) return;
      if (action === 'created') setMeta((m) => ({ ...m, total: m.total + 1 }));
      setOrders((prev) => {
        const exists = prev.some((o) => o.id === order.id);
        if (exists) return prev.map((o) => (o.id === order.id ? order : o));
        // Đơn mới: chỉ chèn khi đang xem trang 1 (mới nhất trước), giữ tối đa 20 dòng.
        if (action !== 'created' || pageRef.current !== 1) return prev;
        return [order, ...prev].slice(0, 20);
      });
      markFlash(order.id);
    });

    connection.start()
      .then(() => connection.invoke('JoinAdmin'))
      .then(() => setLive(true))
      .catch(() => setLive(false));

    connection.onreconnected(() => { connection.invoke('JoinAdmin').catch(() => {}); });
    connection.onclose(() => setLive(false));

    return () => { connection.stop(); };
  }, [markFlash]);

  if (loading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>;

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-100">
          <span
            title={live ? 'Real-time đang bật' : 'Đang kết nối…'}
            className={`w-2.5 h-2.5 rounded-full ${live ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}
          />
          <span className="text-xs text-slate-400 ml-auto">Bấm vào một đơn để xem chi tiết</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/70">
              <tr>
                {['Gói', 'Số tiền', 'Cổng', 'Mã GD', 'Trạng thái', 'Ngày tạo'].map((h) => (
                  <th key={h} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => setSelected(o)}
                  className={`text-sm cursor-pointer transition-colors ${flash.has(o.id) ? 'bg-teal-50' : 'hover:bg-slate-50/50'}`}
                >
                  <td className="px-6 py-4 font-semibold text-slate-800">{o.planTitle}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{formatPrice(o.amount)}</td>
                  <td className="px-6 py-4 text-slate-500">{o.paymentGateway}</td>
                  <td className="px-6 py-4 text-slate-400 font-mono text-xs">{o.paymentCode}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${STATUS_STYLE[o.status] || 'bg-slate-100 text-slate-500'}`}>{STATUS_LABEL[o.status] || o.status}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs">{new Date(o.createdAt).toLocaleString('vi-VN')}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">Chưa có đơn hàng nào.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pager page={page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} />
      </div>

      <OrderDetailModal order={selected} onClose={() => setSelected(null)} />
    </>
  );
};

export default AdminDashboardPage;
