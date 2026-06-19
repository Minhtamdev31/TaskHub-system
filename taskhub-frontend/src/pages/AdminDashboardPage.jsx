import { useEffect, useState, useCallback } from 'react';
import {
  LayoutDashboard, Users, CreditCard, Package,
  TrendingUp, ShoppingCart, Crown, Trash2, Plus, X, ShieldCheck, Shield, Server, Zap,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { adminService } from '../services/api';
import { toast } from '../components/Toast';
import { confirm } from '../components/ConfirmDialog';

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
  Failed: 'bg-rose-100 text-rose-700',
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
            <p className="text-sm text-slate-500 mt-1">
              Khi bật, server sẽ tự ping <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">/api/health</code> mỗi 10 phút
              để Render không đưa dịch vụ vào trạng thái ngủ sau ~15 phút không hoạt động. Giúp lần truy cập đầu không bị chờ khởi động lại.
            </p>
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
          <div className={`mt-5 flex items-center gap-2 text-sm font-semibold ${enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
            <span className={`w-2 h-2 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            {enabled ? 'Đang bật — dịch vụ được giữ thức.' : 'Đang tắt — dịch vụ có thể ngủ đông.'}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        Lưu ý: self-ping chỉ giữ thức khi dịch vụ đang chạy. Nếu dịch vụ đã ngủ (vd sau khi deploy), nó không tự thức được.
        Để chắc chắn hơn, nên kết hợp một dịch vụ giám sát bên ngoài (UptimeRobot, cron-job.org) ping cùng endpoint.
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

  if (loading) return <div className="text-slate-500">Đang tải...</div>;
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
const UsersTab = () => {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    adminService.getUsers(page)
      .then((res) => {
        setUsers(res.data.items || []);
        setMeta({ total: res.data.total || 0, totalPages: res.data.totalPages || 1 });
      })
      .catch(() => toast.error('Không tải được danh sách người dùng.'))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleGrant = async (u) => {
    try { await adminService.grantPremium(u.id, 30); toast.success(`Đã cấp Premium cho ${u.username}.`); load(); }
    catch { toast.error('Cấp Premium thất bại.'); }
  };
  const handleRevoke = async (u) => {
    try { await adminService.revokePremium(u.id); toast.success(`Đã thu hồi Premium của ${u.username}.`); load(); }
    catch { toast.error('Thu hồi thất bại.'); }
  };
  const handleToggleRole = async (u) => {
    const newRole = (u.role || '').toLowerCase() === 'admin' ? 'Member' : 'Admin';
    try { await adminService.updateUser(u.id, { role: newRole }); toast.success(`Đã đổi vai trò ${u.username} → ${newRole}.`); load(); }
    catch { toast.error('Đổi vai trò thất bại.'); }
  };
  const handleDelete = async (u) => {
    if (!(await confirm({ title: 'Xóa người dùng?', message: `Người dùng "${u.username}" sẽ bị xóa.`, confirmText: 'Xóa', danger: true }))) return;
    try { await adminService.deleteUser(u.id); toast.success('Đã xóa người dùng.'); load(); }
    catch { toast.error('Xóa thất bại.'); }
  };

  if (loading) return <div className="text-slate-500">Đang tải...</div>;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100">
        <thead className="bg-slate-50/70">
          <tr>
            {['Người dùng', 'Vai trò', 'Gói', 'Hành động'].map((h) => (
              <th key={h} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((u) => {
            const isAdmin = (u.role || '').toLowerCase() === 'admin';
            const isPremium = u.subscription?.isPremium;
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
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isPremium ? (
                      <button onClick={() => handleRevoke(u)} className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100">Thu hồi Premium</button>
                    ) : (
                      <button onClick={() => handleGrant(u)} className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center gap-1"><Crown size={12} /> Cấp Premium</button>
                    )}
                    <button onClick={() => handleToggleRole(u)} className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center gap-1">
                      <Shield size={12} /> {isAdmin ? 'Bỏ admin' : 'Cấp admin'}
                    </button>
                    <button onClick={() => handleDelete(u)} className="text-slate-300 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Pager page={page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} />
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

  if (loading) return <div className="text-slate-500">Đang tải...</div>;

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
const OrdersTab = () => {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="text-slate-500">Đang tải...</div>;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-x-auto">
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
            <tr key={o.id} className="hover:bg-slate-50/50 text-sm">
              <td className="px-6 py-4 font-semibold text-slate-800">{o.planTitle}</td>
              <td className="px-6 py-4 font-bold text-slate-900">{formatPrice(o.amount)}</td>
              <td className="px-6 py-4 text-slate-500">{o.paymentGateway}</td>
              <td className="px-6 py-4 text-slate-400 font-mono text-xs">{o.paymentCode}</td>
              <td className="px-6 py-4">
                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${STATUS_STYLE[o.status] || 'bg-slate-100 text-slate-500'}`}>{o.status}</span>
              </td>
              <td className="px-6 py-4 text-slate-400 text-xs">{new Date(o.createdAt).toLocaleString('vi-VN')}</td>
            </tr>
          ))}
          {orders.length === 0 && (
            <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">Chưa có đơn hàng nào.</td></tr>
          )}
        </tbody>
      </table>
      <Pager page={page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} />
    </div>
  );
};

export default AdminDashboardPage;
