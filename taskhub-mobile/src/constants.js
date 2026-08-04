import { colors } from './theme';

// Trạng thái task — khớp key backend (Todo/InProgress/Review/Done).
export const TASK_STATUSES = ['Todo', 'InProgress', 'Review', 'Done'];

export const statusMeta = {
  Todo: { label: 'Cần làm', color: colors.slate400, bg: colors.slate100, text: colors.slate600 },
  InProgress: { label: 'Đang làm', color: colors.brandBlue, bg: '#dbeafe', text: '#1d4ed8' },
  Review: { label: 'Xem xét', color: '#f59e0b', bg: '#fef3c7', text: '#b45309' },
  Done: { label: 'Hoàn thành', color: colors.emerald, bg: '#d1fae5', text: '#047857' },
};

export const priorityMeta = {
  Low: { label: 'Thấp', bg: colors.slate100, text: colors.slate600 },
  Medium: { label: 'Trung bình', bg: '#e0f2fe', text: '#0369a1' },
  High: { label: 'Cao', bg: '#fef3c7', text: '#b45309' },
  Critical: { label: 'Khẩn cấp', bg: '#ffe4e6', text: '#be123c' },
};

// Định dạng tiền VND thủ công (Hermes có thể thiếu Intl currency): "50.000 ₫".
export const formatVnd = (n) => `${(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} ₫`;

// Mức độ quan trọng của yêu cầu chi tiền.
export const importanceMeta = (v) => ({
  Low: { label: 'Thấp', bg: colors.slate100, text: colors.slate600 },
  Medium: { label: 'Trung bình', bg: '#e0f2fe', text: '#0369a1' },
  High: { label: 'Cao', bg: '#fef3c7', text: '#b45309' },
  Critical: { label: 'Rất cao', bg: '#ffe4e6', text: '#be123c' },
}[v] || { label: 'Trung bình', bg: '#e0f2fe', text: '#0369a1' });

// Trạng thái yêu cầu chi tiền.
export const reqStatusMeta = (s) => ({
  Pending: { label: 'Chờ duyệt', bg: '#fef3c7', text: '#b45309' },
  Approved: { label: 'Đã duyệt', bg: '#d1fae5', text: '#047857' },
  Rejected: { label: 'Không duyệt', bg: colors.slate100, text: colors.slate500 },
}[s] || { label: s, bg: colors.slate100, text: colors.slate500 });

// Trạng thái dự án -> nhãn tiếng Việt.
export const projectStatusLabel = (s) => ({
  Planning: 'Lên kế hoạch',
  InProgress: 'Đang thực hiện',
  Active: 'Đang thực hiện',
  OnHold: 'Tạm dừng',
  Completed: 'Hoàn thành',
  Archived: 'Đã lưu trữ',
}[s] || s || '—');
