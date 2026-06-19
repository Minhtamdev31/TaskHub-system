import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Crown, Check, Loader2 } from 'lucide-react';
import { subscriptionService, paymentService, authService } from '../services/api';
import { toast } from '../components/Toast';

const PREMIUM_PERKS = [
  'Password Vault bảo mật',
  'Nhắc deadline qua email & thông báo',
  'Báo cáo & phân tích dự án chi tiết',
  'Không giới hạn tính năng cộng tác',
];

const FREE_PERKS = [
  'Quản lý project & Kanban',
  'Giao việc, bình luận, mời thành viên',
  'Thông báo cơ bản trong ứng dụng',
];

const formatPrice = (price) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(price);

const PricingPage = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutId, setCheckoutId] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    Promise.all([
      subscriptionService.getPlans().catch(() => ({ data: [] })),
      authService.getCurrentUser().catch(() => ({ data: null })),
    ])
      .then(([planRes, userRes]) => {
        setPlans(planRes.data || []);
        setIsPremium(userRes.data?.subscription?.isPremium ?? false);
      })
      .finally(() => setLoading(false));
  }, []);

  // Xử lý kết quả redirect từ PayOS
  useEffect(() => {
    const status = searchParams.get('status');
    const orderCode = searchParams.get('orderCode');
    if (status === 'success') {
      if (orderCode) {
        // Xác nhận trực tiếp với backend (hỏi PayOS), không chờ webhook.
        paymentService.confirmPayOS(orderCode)
          .then((res) => {
            if (res.data?.completed) {
              toast.success('Thanh toán thành công! Premium đã được kích hoạt.');
            } else {
              toast.info('Đã ghi nhận thanh toán. Premium sẽ kích hoạt trong giây lát.');
            }
          })
          .catch(() => toast.info('Đã ghi nhận thanh toán. Premium sẽ kích hoạt trong giây lát.'));
      } else {
        toast.success('Thanh toán thành công! Premium sẽ được kích hoạt trong giây lát.');
      }
      searchParams.delete('status');
      searchParams.delete('orderCode');
      setSearchParams(searchParams, { replace: true });
    } else if (status === 'cancel') {
      toast.info('Bạn đã hủy thanh toán.');
      // Báo backend để đơn chuyển "Đã hủy" thay vì kẹt "Đang xử lý".
      if (orderCode) {
        paymentService.cancelPayOS(orderCode).catch(() => { /* không nghiêm trọng */ });
      }
      searchParams.delete('status');
      searchParams.delete('orderCode');
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheckout = async (plan) => {
    setCheckoutId(plan.id);
    try {
      const origin = window.location.origin;
      const res = await paymentService.checkoutPayOS({
        planId: plan.id,
        returnUrl: `${origin}/pricing?status=success`,
        cancelUrl: `${origin}/pricing?status=cancel`,
      });
      const url = res.data?.checkoutUrl;
      if (url) {
        window.location.href = url;
      } else {
        toast.error('Không tạo được liên kết thanh toán.');
        setCheckoutId(null);
      }
    } catch (err) {
      const msg = typeof err.response?.data === 'string'
        ? err.response.data
        : err.response?.data?.message || 'Không thể bắt đầu thanh toán.';
      toast.error(msg);
      setCheckoutId(null);
    }
  };

  if (loading) return <div className="p-8 text-slate-500">Đang tải bảng giá...</div>;

  return (
    <div className="space-y-10">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Chọn gói phù hợp</h2>
        <p className="text-slate-500 mt-2 text-lg">Nâng cấp Premium để mở khóa toàn bộ sức mạnh của TaskHub.</p>
        {isPremium && (
          <div className="inline-flex items-center gap-2 mt-4 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-bold border border-green-200">
            <Crown size={16} /> Bạn đang dùng Premium
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
        {/* Free plan */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          <h3 className="text-xl font-black text-slate-900">Free</h3>
          <p className="text-3xl font-black text-slate-900 mt-3">0₫<span className="text-sm font-medium text-slate-400"> /mãi mãi</span></p>
          <p className="text-sm text-slate-500 mt-1">Dành cho cá nhân bắt đầu.</p>
          <ul className="mt-6 space-y-3">
            {FREE_PERKS.map((p) => (
              <li key={p} className="flex items-start gap-2 text-sm text-slate-600">
                <Check size={18} className="text-slate-400 shrink-0 mt-0.5" /> {p}
              </li>
            ))}
          </ul>
          <button disabled className="w-full mt-8 py-3 rounded-2xl font-bold text-sm bg-slate-100 text-slate-400 cursor-default">
            Gói hiện tại
          </button>
        </div>

        {/* Paid plans */}
        {plans.length === 0 ? (
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-8 text-slate-400 flex items-center justify-center">
            Chưa có gói Premium nào khả dụng. Vui lòng quay lại sau.
          </div>
        ) : (
          plans.map((plan) => (
            <div key={plan.id} className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-3xl p-8 shadow-xl shadow-indigo-600/20 relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-white/20 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <Crown size={12} /> Premium
              </div>
              <h3 className="text-xl font-black">{plan.title || plan.name}</h3>
              <p className="text-3xl font-black mt-3">
                {formatPrice(plan.price)}
                <span className="text-sm font-medium text-indigo-200"> /{plan.durationDays} ngày</span>
              </p>
              {plan.description && <p className="text-sm text-indigo-100 mt-1">{plan.description}</p>}
              <ul className="mt-6 space-y-3">
                {PREMIUM_PERKS.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-indigo-50">
                    <Check size={18} className="text-white shrink-0 mt-0.5" /> {p}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleCheckout(plan)}
                disabled={checkoutId === plan.id}
                className="w-full mt-8 py-3 rounded-2xl font-bold text-sm bg-white text-indigo-700 hover:bg-indigo-50 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {checkoutId === plan.id ? (
                  <><Loader2 size={16} className="animate-spin" /> Đang chuyển tới thanh toán...</>
                ) : (
                  'Nâng cấp ngay'
                )}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PricingPage;
