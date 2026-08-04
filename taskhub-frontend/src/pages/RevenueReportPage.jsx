import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { adminService } from '../services/api';
import { PageSkeleton } from '../components/Skeleton';

const formatPrice = (p) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(p || 0);

const fmtDateTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('vi-VN');
};

// Lấy TẤT CẢ đơn hàng qua nhiều trang rồi lọc "Completed" (đơn đã thanh toán thật sự).
const fetchAllCompletedOrders = async () => {
  const pageSize = 100;
  let page = 1;
  let totalPages = 1;
  const all = [];
  do {
    const res = await adminService.getAllOrders(page, pageSize);
    const data = res.data || {};
    (data.items || []).forEach((o) => all.push(o));
    totalPages = data.totalPages || 1;
    page += 1;
  } while (page <= totalPages);
  return all.filter((o) => o.status === 'Completed');
};

// Escape một ô CSV.
const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const RevenueReportPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generatedAt] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const completed = await fetchAllCompletedOrders();
        if (!cancelled) {
          // Mới nhất trước.
          completed.sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));
          setOrders(completed);
        }
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || e.message || 'Không tải được dữ liệu đơn hàng.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const totalRevenue = useMemo(() => orders.reduce((s, o) => s + (Number(o.amount) || 0), 0), [orders]);

  // Doanh thu theo gói.
  const byPlan = useMemo(() => {
    const map = new Map();
    orders.forEach((o) => {
      const key = o.planTitle || 'Khác';
      const cur = map.get(key) || { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += Number(o.amount) || 0;
      map.set(key, cur);
    });
    return [...map.entries()].map(([plan, v]) => ({ plan, ...v })).sort((a, b) => b.revenue - a.revenue);
  }, [orders]);

  const exportCsv = () => {
    const headers = ['STT', 'Gói', 'Số tiền (VND)', 'Mã giao dịch', 'Cổng', 'Trạng thái', 'Ngày tạo', 'Ngày hoàn tất'];
    const rows = orders.map((o, i) => [
      i + 1, o.planTitle, Number(o.amount) || 0, o.paymentCode, o.paymentGateway, 'Completed',
      fmtDateTime(o.createdAt), fmtDateTime(o.completedAt),
    ]);
    const csv = [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
    // ﻿ (BOM) để Excel đọc đúng tiếng Việt.
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = generatedAt.toISOString().slice(0, 10).replace(/-/g, '');
    a.href = url;
    a.download = `bao-cao-don-hang-completed-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .report-sheet { box-shadow: none !important; border: none !important; margin: 0 !important; }
          @page { margin: 14mm; }
        }
      `}</style>

      {/* Thanh công cụ (không in ra) */}
      <div className="no-print max-w-4xl mx-auto mb-5 flex items-center justify-between gap-3 flex-wrap">
        <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-blue-600">
          <ArrowLeft size={16} /> Về trang quản trị
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-slate-50"
          >
            <Download size={16} /> Xuất CSV
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold text-sm px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Printer size={16} /> In / Lưu PDF
          </button>
        </div>
      </div>

      {error ? (
        <div className="no-print max-w-4xl mx-auto bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">{error}</div>
      ) : null}

      {/* Tờ báo cáo */}
      <div className="report-sheet max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm p-8 sm:p-10">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <img src="/TaskHubLogo.png" alt="TaskHub" className="h-11 w-auto" />
            <div>
              <div className="text-lg font-black text-slate-900">TaskHub</div>
              <div className="text-xs text-slate-500">taskhub-system.onrender.com</div>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-xl font-black text-slate-900">Báo cáo doanh thu</h1>
            <div className="text-xs text-slate-500 mt-1">Lập lúc {generatedAt.toLocaleString('vi-VN')}</div>
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-4">
          Báo cáo chỉ tính các đơn có trạng thái <b>Hoàn tất (Completed)</b> — tức đã thanh toán thành công qua cổng PayOS.
        </p>

        {/* Tóm tắt */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="border border-slate-200 rounded-xl p-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Tổng doanh thu</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{formatPrice(totalRevenue)}</div>
          </div>
          <div className="border border-slate-200 rounded-xl p-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Số đơn đã bán</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{orders.length}</div>
          </div>
          <div className="border border-slate-200 rounded-xl p-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Số gói khác nhau</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{byPlan.length}</div>
          </div>
        </div>

        {/* Doanh thu theo gói */}
        {byPlan.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-black text-slate-700 mb-3">Doanh thu theo gói</h2>
            <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left font-bold px-4 py-2">Gói</th>
                  <th className="text-right font-bold px-4 py-2">Số đơn</th>
                  <th className="text-right font-bold px-4 py-2">Doanh thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byPlan.map((p) => (
                  <tr key={p.plan}>
                    <td className="px-4 py-2 font-semibold text-slate-800">{p.plan}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{p.count}</td>
                    <td className="px-4 py-2 text-right font-bold text-slate-900">{formatPrice(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Chi tiết đơn */}
        <div className="mt-8">
          <h2 className="text-sm font-black text-slate-700 mb-3">Chi tiết đơn đã hoàn tất ({orders.length})</h2>
          {orders.length === 0 ? (
            <p className="text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg p-6 text-center">
              Chưa có đơn nào ở trạng thái Hoàn tất. Khi có giao dịch thành công đầu tiên, nó sẽ xuất hiện ở đây.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="text-left font-bold px-3 py-2">#</th>
                    <th className="text-left font-bold px-3 py-2">Gói</th>
                    <th className="text-right font-bold px-3 py-2">Số tiền</th>
                    <th className="text-left font-bold px-3 py-2">Mã GD</th>
                    <th className="text-left font-bold px-3 py-2">Cổng</th>
                    <th className="text-left font-bold px-3 py-2">Ngày hoàn tất</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o, i) => (
                    <tr key={o.id}>
                      <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{o.planTitle}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-900">{formatPrice(o.amount)}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-500">{o.paymentCode}</td>
                      <td className="px-3 py-2 text-slate-600">{o.paymentGateway}</td>
                      <td className="px-3 py-2 text-slate-500 text-xs">{fmtDateTime(o.completedAt || o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-10 pt-5 border-t border-slate-200 text-xs text-slate-400">
          Nguồn dữ liệu: hệ thống TaskHub (collection Orders, trạng thái Completed). Đối chiếu giao dịch thực tế trên dashboard PayOS.
        </div>
      </div>
    </div>
  );
};

export default RevenueReportPage;
