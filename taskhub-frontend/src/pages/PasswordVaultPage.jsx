import { useCallback, useEffect, useState } from 'react';
import { passwordVaultService } from '../services/api';
import { Eye, EyeOff, Plus, Trash2, ShieldCheck, KeyRound, Lock } from 'lucide-react';
import { toast } from '../components/Toast';
import { confirm } from '../components/ConfirmDialog';
import UpgradePanel from '../components/UpgradePanel';
import { Skeleton } from '../components/Skeleton';

// --- Quản lý token mở khóa vault (lớp xác thực 2) trong sessionStorage ---
const VAULT_TOKEN_KEY = 'vaultToken';
const VAULT_TOKEN_EXP_KEY = 'vaultTokenExp';

const storeVaultToken = (token, expiresInMinutes) => {
  sessionStorage.setItem(VAULT_TOKEN_KEY, token);
  sessionStorage.setItem(VAULT_TOKEN_EXP_KEY, String(Date.now() + (expiresInMinutes || 15) * 60_000));
};
const clearVaultToken = () => {
  sessionStorage.removeItem(VAULT_TOKEN_KEY);
  sessionStorage.removeItem(VAULT_TOKEN_EXP_KEY);
};
const hasLiveVaultToken = () =>
  !!sessionStorage.getItem(VAULT_TOKEN_KEY) && Date.now() < Number(sessionStorage.getItem(VAULT_TOKEN_EXP_KEY) || 0);

// Màn thiết lập / mở khóa bằng PIN.
const VaultGate = ({ mode, onUnlocked }) => {
  const isSetup = mode === 'setup';
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\d{4,12}$/.test(pin)) { toast.error('PIN cần 4–12 chữ số.'); return; }
    if (isSetup && pin !== confirmPin) { toast.error('PIN nhập lại không khớp.'); return; }
    setSubmitting(true);
    try {
      const res = isSetup
        ? await passwordVaultService.setupPin(pin)
        : await passwordVaultService.unlock(pin);
      if (isSetup) toast.success('Đã thiết lập mã PIN cho kho mật khẩu.');
      onUnlocked(res.data?.vaultToken, res.data?.expiresInMinutes);
    } catch (err) {
      toast.error(err.response?.data?.message || (isSetup ? 'Thiết lập PIN thất bại.' : 'Mã PIN không đúng.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-10 max-w-md mx-auto text-center shadow-sm">
      <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
        <Lock size={30} />
      </div>
      <h3 className="text-2xl font-black text-slate-900">
        {isSetup ? 'Thiết lập mã PIN' : 'Mở khóa kho mật khẩu'}
      </h3>
      <p className="text-slate-500 mt-2 mb-6 text-sm">
        {isSetup
          ? 'Đặt một mã PIN (4–12 chữ số) làm lớp bảo vệ thứ 2 cho kho mật khẩu của bạn.'
          : 'Nhập mã PIN để mở khóa. Phiên mở khóa kéo dài 15 phút.'}
      </p>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="password" inputMode="numeric" autoFocus maxLength={12}
          placeholder="Mã PIN"
          className="w-full px-4 py-3 border border-slate-300 rounded-xl text-center tracking-[0.3em] font-mono text-lg outline-none focus:ring-2 focus:ring-indigo-500"
          value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
        />
        {isSetup && (
          <input
            type="password" inputMode="numeric" maxLength={12}
            placeholder="Nhập lại PIN"
            className="w-full px-4 py-3 border border-slate-300 rounded-xl text-center tracking-[0.3em] font-mono text-lg outline-none focus:ring-2 focus:ring-indigo-500"
            value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
          />
        )}
        <button
          type="submit" disabled={submitting}
          className="w-full py-3 rounded-2xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Đang xử lý...' : isSetup ? 'Tạo PIN & mở khóa' : 'Mở khóa'}
        </button>
      </form>
    </div>
  );
};

// Đánh giá độ mạnh mật khẩu theo độ dài và sự đa dạng ký tự. Trả về score 0–4.
const evaluatePasswordStrength = (pw) => {
  if (!pw) return { score: 0, label: '', color: '#e2e8f0' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  // Mật khẩu quá ngắn luôn bị coi là yếu.
  if (pw.length < 6) score = 1;
  score = Math.min(score, 4);

  const levels = [
    { label: '', color: '#e2e8f0' },
    { label: 'Yếu', color: '#f43f5e' },
    { label: 'Trung bình', color: '#f59e0b' },
    { label: 'Khá', color: '#0ea5e9' },
    { label: 'Mạnh', color: '#22c55e' },
  ];
  return { score, ...levels[score] };
};

const PasswordStrengthMeter = ({ password }) => {
  const { score, label, color } = evaluatePasswordStrength(password);
  if (!password) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-colors"
            style={{ backgroundColor: i <= score ? color : '#e2e8f0' }}
          />
        ))}
      </div>
      <p className="text-xs font-medium mt-1" style={{ color }}>
        Độ mạnh: {label}
      </p>
    </div>
  );
};

const PasswordVaultPage = () => {
  const [credentials, setCredentials] = useState([]);
  const [visibleIds, setVisibleIds] = useState(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCred, setNewCred] = useState({ title: '', username: '', password: '', url: '' });
  // loading | upgrade (chưa Premium) | setup (chưa có PIN) | locked (cần nhập PIN) | unlocked
  const [status, setStatus] = useState('loading');

  const fetchVault = useCallback(() => {
    passwordVaultService.getAll()
      .then((res) => { setCredentials(res.data); setStatus('unlocked'); })
      .catch((err) => {
        if (err.response?.status === 403) setStatus('upgrade');
        else if (err.response?.status === 423) { clearVaultToken(); setStatus('locked'); }
        else toast.error('Không tải được kho mật khẩu.');
      });
  }, []);

  // Khởi tạo: nếu còn token mở khóa thì vào thẳng; nếu không thì xác định setup/locked/upgrade.
  useEffect(() => {
    if (hasLiveVaultToken()) { fetchVault(); return; }
    passwordVaultService.pinStatus()
      .then((res) => setStatus(res.data?.hasPin ? 'locked' : 'setup'))
      .catch((err) => {
        if (err.response?.status === 403) setStatus('upgrade');
        else toast.error('Không kiểm tra được trạng thái kho mật khẩu.');
      });
  }, [fetchVault]);

  const handleUnlocked = (token, expiresInMinutes) => {
    storeVaultToken(token, expiresInMinutes);
    fetchVault();
  };

  const handleAddCredential = async (e) => {
    e.preventDefault();
    try {
      await passwordVaultService.create(newCred);
      setIsModalOpen(false);
      setNewCred({ title: '', username: '', password: '', url: '' });
      fetchVault();
      toast.success('Đã lưu thông tin.');
    } catch (err) {
      if (err.response?.status === 403) {
        setIsModalOpen(false);
        setStatus('upgrade');
        toast.error(err.response?.data?.message || 'Kho mật khẩu là tính năng Premium.');
      } else if (err.response?.status === 423) {
        setIsModalOpen(false);
        clearVaultToken();
        setStatus('locked');
        toast.error('Phiên mở khóa đã hết hạn. Vui lòng nhập lại PIN.');
      } else {
        toast.error('Lưu thông tin thất bại.');
      }
    }
  };

  const handleDelete = async (id) => {
    if (!(await confirm({ title: 'Xóa thông tin?', message: 'Mục mật khẩu này sẽ bị xóa vĩnh viễn.', confirmText: 'Xóa', danger: true }))) return;
    try {
      await passwordVaultService.delete(id);
      fetchVault();
      toast.success('Đã xóa thông tin.');
    } catch (err) {
      if (err.response?.status === 423) {
        clearVaultToken();
        setStatus('locked');
        toast.error('Phiên mở khóa đã hết hạn. Vui lòng nhập lại PIN.');
      } else {
        toast.error('Xóa thất bại.');
      }
    }
  };

  const toggleVisibility = (id) => {
    const newSet = new Set(visibleIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setVisibleIds(newSet);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-slate-900 flex items-center gap-4 tracking-tight">
            <ShieldCheck className="text-indigo-600" size={40} /> Kho mật khẩu
          </h2>
          <p className="text-slate-500 mt-2 text-lg">Quản lý thông tin đăng nhập dự án trong môi trường bảo mật.</p>
        </div>
        {status === 'unlocked' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-2xl text-sm shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus size={18} strokeWidth={3} /> Thêm thông tin
          </button>
        )}
      </div>

      {status === 'loading' ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      ) : status === 'upgrade' ? (
        <UpgradePanel
          title="Kho mật khẩu là tính năng Premium"
          message="Lưu trữ và quản lý thông tin đăng nhập của bạn một cách an toàn. Nâng cấp Premium để mở khóa."
        />
      ) : status === 'setup' || status === 'locked' ? (
        <VaultGate mode={status} onUnlocked={handleUnlocked} />
      ) : (
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/70">
            <tr>
              <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Dịch vụ / Tiêu đề</th>
              <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Tên đăng nhập</th>
              <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Mật khẩu</th>
              <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {credentials.map((cred) => (
              <tr key={cred.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-6">
                  <div className="font-bold text-slate-900">{cred.title}</div>
                  <div className="text-xs text-slate-400 font-medium">{cred.url || 'Không có URL'}</div>
                </td>
                <td className="px-8 py-6 text-slate-600 font-mono text-sm">{cred.username}</td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                      {visibleIds.has(cred.id) ? cred.password : '••••••••••••'}
                    </span>
                    <button 
                      onClick={() => toggleVisibility(cred.id)}
                      className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                    >
                      {visibleIds.has(cred.id) ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <button 
                    onClick={() => handleDelete(cred.id)}
                    className="text-slate-300 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {credentials.length === 0 && (
          <div className="text-center py-20 text-slate-400 border-t border-slate-100">
             <KeyRound size={48} className="mx-auto mb-4 opacity-20" />
             <p className="text-lg font-medium">Chưa có thông tin nào</p>
             <p className="text-sm">Bắt đầu bằng cách thêm khoá hoặc mật khẩu quan trọng của dự án.</p>
          </div>
        )}
      </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAddCredential} className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-2xl font-bold mb-4">Thêm thông tin đăng nhập</h3>
            <div className="space-y-4">
              <input
                type="text" placeholder="Tên dịch vụ (vd: AWS, GitHub)"
                className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-blue-500"
                value={newCred.title} onChange={e => setNewCred({...newCred, title: e.target.value})} required
              />
              <input
                type="text" placeholder="Tên đăng nhập / Email"
                className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-blue-500"
                value={newCred.username} onChange={e => setNewCred({...newCred, username: e.target.value})} required
              />
              <div>
                <input
                  type="password" placeholder="Mật khẩu"
                  className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-blue-500"
                  value={newCred.password} onChange={e => setNewCred({...newCred, password: e.target.value})} required
                />
                <PasswordStrengthMeter password={newCred.password} />
              </div>
              <input
                type="text" placeholder="URL (không bắt buộc)"
                className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-blue-500"
                value={newCred.url} onChange={e => setNewCred({...newCred, url: e.target.value})}
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-500 font-medium px-4">Hủy</button>
              <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700">Lưu</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default PasswordVaultPage;