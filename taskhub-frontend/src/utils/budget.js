// Hằng số & helper cho quản lý chi tiêu dự án. Tách khỏi file component để
// react-refresh hoạt động (file component chỉ được export component).

export const formatVnd = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
    .format(Number(n) || 0);

// Mức độ quan trọng của khoản chi — giúp người duyệt cân nhắc có nên nâng ngân sách.
export const IMPORTANCE = [
  { value: 'Low', label: 'Thấp', bar: 'bg-slate-400', pill: 'bg-slate-100 text-slate-600' },
  { value: 'Medium', label: 'Trung bình', bar: 'bg-blue-500', pill: 'bg-blue-50 text-blue-700' },
  { value: 'High', label: 'Cao', bar: 'bg-amber-500', pill: 'bg-amber-50 text-amber-700' },
  { value: 'Critical', label: 'Rất cao', bar: 'bg-rose-500', pill: 'bg-rose-50 text-rose-700' },
];

export const importanceMeta = (v) => IMPORTANCE.find((i) => i.value === v) || IMPORTANCE[1];

export const STATUS_META = {
  Pending: { label: 'Chờ duyệt', pill: 'bg-amber-50 text-amber-700 border-amber-200' },
  Approved: { label: 'Đã duyệt', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Rejected: { label: 'Không duyệt', pill: 'bg-slate-100 text-slate-500 border-slate-200' },
};
