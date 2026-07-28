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

// Trạng thái dự án -> nhãn tiếng Việt.
export const projectStatusLabel = (s) => ({
  Planning: 'Lên kế hoạch',
  InProgress: 'Đang thực hiện',
  Active: 'Đang thực hiện',
  OnHold: 'Tạm dừng',
  Completed: 'Hoàn thành',
  Archived: 'Đã lưu trữ',
}[s] || s || '—');
