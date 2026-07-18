import { useState } from 'react';
import { Wallet, Crown, Check, X, AlertTriangle, Send, Pencil, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from './Toast';
import { formatVnd, IMPORTANCE, importanceMeta, STATUS_META } from '../utils/budget';

/** Thanh chọn mức độ quan trọng (4 mức). */
const ImportanceBar = ({ value, onChange }) => {
  const idx = IMPORTANCE.findIndex((i) => i.value === value);
  return (
    <div>
      <div className="flex gap-1.5">
        {IMPORTANCE.map((lv, i) => (
          <button
            key={lv.value}
            type="button"
            onClick={() => onChange(lv.value)}
            aria-label={`Mức độ ${lv.label}`}
            aria-pressed={value === lv.value}
            className="flex-1 group"
          >
            <span
              className={`block h-2 rounded-full transition-colors ${
                i <= idx ? importanceMeta(value).bar : 'bg-slate-200'
              }`}
            />
            <span
              className={`block mt-1.5 text-[11px] font-semibold transition-colors ${
                value === lv.value ? 'text-slate-700' : 'text-slate-400 group-hover:text-slate-500'
              }`}
            >
              {lv.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

/** Gợi ý nâng cấp khi chủ dự án chưa có Premium. */
export const BudgetUpgradeNotice = () => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start gap-4">
    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
      <Crown size={20} />
    </div>
    <div className="min-w-0">
      <h4 className="font-bold text-slate-800">Quản lý chi tiêu là tính năng Premium</h4>
      <p className="text-sm text-slate-500 mt-1">
        Đặt ngân sách cho dự án, để thành viên gửi yêu cầu chi tiền và duyệt trực tiếp trên từng công việc.
      </p>
      <Link
        to="/pricing"
        className="inline-flex items-center gap-2 mt-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors"
      >
        <Crown size={15} /> Nâng cấp Premium
      </Link>
    </div>
  </div>
);

/**
 * Bảng ngân sách của dự án: tổng / đã chi / còn lại, và danh sách yêu cầu.
 * Owner/Leader duyệt hoặc từ chối ngay tại đây.
 */
export const BudgetPanel = ({
  data,
  taskTitle,
  displayName,
  onSetBudget,
  onAddBudget,
  onApprove,
  onReject,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState('');
  const [addingSaving, setAddingSaving] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState(null);

  const {
    budget = 0, planned = 0, added = 0, spent = 0, remaining = 0,
    canManage = false, requests = [],
  } = data || {};
  const pending = requests.filter((r) => r.status === 'Pending');
  const decided = requests.filter((r) => r.status !== 'Pending');
  const usedPct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

  const startEdit = () => { setDraft(String(budget || '')); setEditing(true); };

  const saveBudget = async () => {
    const value = Number(draft);
    if (!Number.isFinite(value) || value < 0) { toast.error('Ngân sách không hợp lệ.'); return; }
    setSaving(true);
    try {
      await onSetBudget(value);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const saveAdd = async () => {
    const value = Number(addDraft);
    if (!Number.isFinite(value) || value <= 0) { toast.error('Số tiền thêm phải lớn hơn 0.'); return; }
    setAddingSaving(true);
    try {
      await onAddBudget(value);
      setAdding(false);
      setAddDraft('');
    } finally {
      setAddingSaving(false);
    }
  };

  const doApprove = async (r) => {
    setBusyId(r.id);
    try { await onApprove(r); } finally { setBusyId(null); }
  };

  const submitReject = async (r) => {
    if (!rejectReason.trim()) { toast.error('Vui lòng nhập lý do không duyệt.'); return; }
    setBusyId(r.id);
    try {
      await onReject(r, rejectReason.trim());
      setRejectingId(null);
      setRejectReason('');
    } finally {
      setBusyId(null);
    }
  };

  const RequestRow = ({ r }) => {
    const over = r.status === 'Pending' && r.amount > remaining;
    const im = importanceMeta(r.importance);
    const st = STATUS_META[r.status] || STATUS_META.Pending;

    return (
      <div
        className={`rounded-2xl border p-4 ${
          over ? 'border-red-700 bg-red-50' : 'border-slate-200 bg-white'
        }`}
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-lg font-black ${over ? 'text-red-800' : 'text-slate-900'}`}>
                {formatVnd(r.amount)}
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${im.pill}`}>{im.label}</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${st.pill}`}>{st.label}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {displayName(r.requesterId)} · {taskTitle(r.taskId)}
            </p>
          </div>
        </div>

        {over && (
          <p className="flex items-center gap-1.5 text-xs font-bold text-red-800 mt-2">
            <AlertTriangle size={14} />
            Vượt ngân sách còn lại {formatVnd(r.amount - remaining)}. Cân nhắc mức độ quan trọng hoặc nâng ngân sách.
          </p>
        )}

        <div className="mt-3 space-y-1 text-sm">
          <p className="text-slate-600"><span className="font-semibold text-slate-500">Lý do:</span> {r.reason}</p>
          <p className="text-slate-600"><span className="font-semibold text-slate-500">Mục đích:</span> {r.purpose}</p>
          {r.status === 'Rejected' && r.rejectionReason && (
            <p className="text-rose-600"><span className="font-semibold">Lý do không duyệt:</span> {r.rejectionReason}</p>
          )}
        </div>

        {canManage && r.status === 'Pending' && (
          <div className="mt-3">
            {rejectingId === r.id ? (
              <div className="space-y-2">
                <textarea
                  autoFocus
                  rows={2}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Lý do không duyệt..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => submitReject(r)}
                    disabled={busyId === r.id}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-60"
                  >
                    Xác nhận không duyệt
                  </button>
                  <button
                    onClick={() => { setRejectingId(null); setRejectReason(''); }}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-2"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => doApprove(r)}
                  disabled={busyId === r.id}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-60"
                >
                  <Check size={14} /> Duyệt
                </button>
                <button
                  onClick={() => { setRejectingId(r.id); setRejectReason(''); }}
                  disabled={busyId === r.id}
                  className="inline-flex items-center gap-1.5 border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-60"
                >
                  <X size={14} /> Không duyệt
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-black text-slate-900 flex items-center gap-2">
          <Wallet size={18} className="text-indigo-600" /> Ngân sách dự án
        </h3>
        {canManage && !editing && !adding && (
          <div className="flex items-center gap-3">
            <button
              onClick={startEdit}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
            >
              <Pencil size={13} /> {planned > 0 ? 'Sửa dự kiến' : 'Đặt ngân sách'}
            </button>
            {planned > 0 && (
              <button
                onClick={() => { setAddDraft(''); setAdding(true); }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700"
              >
                <Plus size={13} /> Thêm tiền
              </button>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <input
            autoFocus
            type="number"
            min="0"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ngân sách dự kiến (VND)"
            className="flex-1 min-w-[180px] px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={saveBudget}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-xl disabled:opacity-60"
          >
            Lưu
          </button>
          <button onClick={() => setEditing(false)} className="text-sm font-bold text-slate-500 px-3 py-2">
            Hủy
          </button>
        </div>
      ) : adding ? (
        <div className="mt-4">
          <div className="flex items-center gap-2 flex-wrap">
            <input
              autoFocus
              type="number"
              min="0"
              value={addDraft}
              onChange={(e) => setAddDraft(e.target.value)}
              placeholder="Số tiền cần thêm (VND)"
              className="flex-1 min-w-[180px] px-3 py-2 border border-emerald-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={saveAdd}
              disabled={addingSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2 rounded-xl disabled:opacity-60"
            >
              Thêm
            </button>
            <button onClick={() => setAdding(false)} className="text-sm font-bold text-slate-500 px-3 py-2">
              Hủy
            </button>
          </div>
          {Number(addDraft) > 0 && (
            <p className="text-xs text-slate-500 mt-2">
              Sau khi thêm, tổng ngân sách sẽ là {formatVnd(budget + Number(addDraft))}
              {' '}(vượt mốc dự kiến {formatVnd(added + Number(addDraft))}).
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng ngân sách</p>
              <p className="text-lg font-black text-slate-900 mt-0.5 break-words">{formatVnd(budget)}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Đã chi</p>
              <p className="text-lg font-black text-slate-700 mt-0.5 break-words">{formatVnd(spent)}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Còn lại</p>
              <p className={`text-lg font-black mt-0.5 break-words ${remaining < 0 ? 'text-red-700' : 'text-emerald-600'}`}>
                {formatVnd(remaining)}
              </p>
            </div>
          </div>

          {/* Chi tiết: dự kiến vs đã thêm ngoài mốc */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs">
            <span className="text-slate-500">
              Dự kiến: <span className="font-bold text-slate-700">{formatVnd(planned)}</span>
            </span>
            {added > 0 && (
              <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                <Plus size={11} /> Đã thêm ngoài dự kiến: {formatVnd(added)}
              </span>
            )}
          </div>

          <div className="mt-3 h-2 rounded-full bg-slate-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${remaining < 0 ? 'bg-red-700' : 'bg-brand-gradient'}`}
              style={{ width: `${remaining < 0 ? 100 : usedPct}%` }}
            />
          </div>
          {!canManage && (
            <p className="text-xs text-slate-400 mt-2">
              Bạn có thể xem ngân sách và gửi yêu cầu chi tiền từ công việc được giao.
            </p>
          )}
        </>
      )}

      {pending.length > 0 && (
        <div className="mt-6">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Chờ duyệt ({pending.length})
          </h4>
          <div className="space-y-3">
            {pending.map((r) => <RequestRow key={r.id} r={r} />)}
          </div>
        </div>
      )}

      {decided.length > 0 && (
        <div className="mt-6">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Đã xử lý</h4>
          <div className="space-y-3">
            {decided.map((r) => <RequestRow key={r.id} r={r} />)}
          </div>
        </div>
      )}

      {requests.length === 0 && (
        <p className="text-sm text-slate-400 mt-6">Chưa có yêu cầu chi tiền nào.</p>
      )}
    </div>
  );
};

/**
 * Ô "Yêu cầu chi tiền" trong modal chi tiết công việc.
 * Chỉ người được giao task mới gửi được yêu cầu.
 */
export const TaskBudgetSection = ({ task, currentUserId, data, onCreateRequest }) => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [purpose, setPurpose] = useState('');
  const [importance, setImportance] = useState('Medium');
  const [submitting, setSubmitting] = useState(false);

  if (!data) return null;

  const { remaining = 0, requests = [] } = data;
  const mine = task.userId && String(task.userId) === String(currentUserId);
  const taskRequests = requests.filter((r) => String(r.taskId) === String(task.id));

  const amountNum = Number(amount) || 0;
  const over = amountNum > 0 && amountNum > remaining;

  const reset = () => {
    setAmount(''); setReason(''); setPurpose(''); setImportance('Medium'); setOpen(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (amountNum <= 0) { toast.error('Số tiền phải lớn hơn 0.'); return; }
    if (!reason.trim()) { toast.error('Vui lòng nhập lý do.'); return; }
    if (!purpose.trim()) { toast.error('Vui lòng nhập mục đích sử dụng.'); return; }
    setSubmitting(true);
    try {
      await onCreateRequest({
        taskId: task.id,
        amount: amountNum,
        reason: reason.trim(),
        purpose: purpose.trim(),
        importance,
      });
      reset();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mb-6 border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h4 className="font-bold text-slate-700 flex items-center gap-2">
          <Wallet size={16} className="text-indigo-600" /> Yêu cầu chi tiền
        </h4>
        <span className="text-xs text-slate-400">Ngân sách còn lại: {formatVnd(remaining)}</span>
      </div>

      {taskRequests.length > 0 && (
        <div className="mt-4 space-y-2">
          {taskRequests.map((r) => {
            const st = STATUS_META[r.status] || STATUS_META.Pending;
            const im = importanceMeta(r.importance);
            return (
              <div key={r.id} className="flex items-start justify-between gap-3 bg-slate-50 rounded-xl px-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-800">{formatVnd(r.amount)}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${im.pill}`}>{im.label}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${st.pill}`}>{st.label}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 break-words">{r.reason}</p>
                  {r.status === 'Rejected' && r.rejectionReason && (
                    <p className="text-xs text-rose-600 mt-0.5 break-words">
                      Lý do không duyệt: {r.rejectionReason}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!mine ? (
        <p className="text-xs text-slate-400 mt-3">
          Chỉ người được giao công việc này mới gửi được yêu cầu chi tiền.
        </p>
      ) : !open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-4 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
        >
          <Send size={15} /> Gửi yêu cầu chi tiền
        </button>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3 animate-pop">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Số tiền (VND)</label>
            <input
              autoFocus
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 ${
                over ? 'border-red-700 focus:ring-red-600' : 'border-slate-300 focus:ring-indigo-500'
              }`}
            />
            {over && (
              <p className="flex items-center gap-1.5 text-xs font-bold text-red-800 mt-1.5">
                <AlertTriangle size={13} /> Vượt ngân sách còn lại. Yêu cầu vẫn gửi được, nhưng sẽ hiện cảnh báo đỏ cho người duyệt.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Lý do</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Vì sao cần khoản này?"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Mục đích sử dụng</label>
            <textarea
              rows={2}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Tiền sẽ dùng vào việc gì?"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Mức độ quan trọng
            </label>
            <ImportanceBar value={importance} onChange={setImportance} />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-xl disabled:opacity-60"
            >
              <Send size={15} /> {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
            <button type="button" onClick={reset} className="text-sm font-bold text-slate-500 px-3 py-2">
              Hủy
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
