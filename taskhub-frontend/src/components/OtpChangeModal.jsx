import { useRef, useState } from 'react';
import { ShieldCheck, X, Mail } from 'lucide-react';
import { userService, passwordVaultService } from '../services/api';
import { toast } from './Toast';

// Modal đổi mật khẩu / PIN bằng OTP gửi qua email.
// mode: 'password' | 'pin'
const OtpChangeModal = ({ mode, onClose, onSuccess }) => {
  const isPin = mode === 'pin';
  const [step, setStep] = useState('input'); // 'input' -> 'otp'
  const [value, setValue] = useState('');
  const [confirmValue, setConfirmValue] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [busy, setBusy] = useState(false);
  const inputs = useRef([]);

  const label = isPin ? 'PIN' : 'mật khẩu';

  const validateNewValue = () => {
    if (isPin) {
      if (!/^\d{4,12}$/.test(value)) { toast.error('PIN cần 4–12 chữ số.'); return false; }
    } else if (value.length < 6) {
      toast.error('Mật khẩu mới cần tối thiểu 6 ký tự.'); return false;
    }
    if (value !== confirmValue) { toast.error(`Xác nhận ${label} không khớp.`); return false; }
    return true;
  };

  const requestOtp = async (e) => {
    e.preventDefault();
    if (!validateNewValue()) return;
    setBusy(true);
    try {
      const res = isPin
        ? await passwordVaultService.requestChangePinOtp()
        : await userService.requestChangePasswordOtp();
      setMaskedEmail(res.data?.email || '');
      setStep('otp');
      setTimeout(() => inputs.current[0]?.focus(), 50);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không gửi được mã OTP.');
    } finally {
      setBusy(false);
    }
  };

  const setOtpChar = (i, ch) => {
    setOtp((prev) => { const next = [...prev]; next[i] = ch; return next; });
  };

  const handleOtpChange = (i, raw) => {
    const ch = raw.replace(/\D/g, '').slice(-1);
    setOtpChar(i, ch);
    if (ch && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleOtpKey = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!digits) return;
    e.preventDefault();
    const next = ['', '', '', '', '', ''];
    for (let i = 0; i < digits.length; i++) next[i] = digits[i];
    setOtp(next);
    inputs.current[Math.min(digits.length, 5)]?.focus();
  };

  const verify = async () => {
    const code = otp.join('');
    if (code.length !== 6) { toast.error('Nhập đủ 6 số OTP.'); return; }
    setBusy(true);
    try {
      if (isPin) {
        await passwordVaultService.confirmChangePin(code, value);
      } else {
        await userService.confirmChangePassword({ otp: code, newPassword: value });
      }
      toast.success(`Đã đổi ${label}.`);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xác thực thất bại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start gap-3 p-6 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-extrabold text-slate-900">Xác thực danh tính</h3>
            <p className="text-sm text-slate-500">
              {step === 'input'
                ? `Nhập ${label} mới, mã OTP sẽ được gửi tới email của bạn.`
                : 'Mã gồm 6 chữ số đã được gửi tới email đã đăng ký.'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        {step === 'input' ? (
          <form onSubmit={requestOtp} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{isPin ? 'PIN mới (4–12 chữ số)' : 'Mật khẩu mới'}</label>
              <input
                type="password"
                inputMode={isPin ? 'numeric' : 'text'}
                value={value}
                onChange={(e) => setValue(isPin ? e.target.value.replace(/\D/g, '').slice(0, 12) : e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Xác nhận {label} mới</label>
              <input
                type="password"
                inputMode={isPin ? 'numeric' : 'text'}
                value={confirmValue}
                onChange={(e) => setConfirmValue(isPin ? e.target.value.replace(/\D/g, '').slice(0, 12) : e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="text-slate-500 font-medium px-4 py-2.5">Hủy</button>
              <button type="submit" disabled={busy} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">
                {busy ? 'Đang gửi...' : 'Gửi mã OTP'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 space-y-5">
            {maskedEmail && (
              <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><Mail size={18} /></div>
                <div>
                  <p className="text-xs text-slate-400">Mã đã gửi tới</p>
                  <p className="text-sm font-semibold text-slate-700">{maskedEmail}</p>
                </div>
              </div>
            )}

            <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
              {otp.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => (inputs.current[i] = el)}
                  value={d}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKey(i, e)}
                  inputMode="numeric"
                  maxLength={1}
                  className="w-12 h-14 text-center text-xl font-black border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors">Hủy</button>
              <button onClick={verify} disabled={busy} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {busy ? 'Đang xác thực...' : 'Xác thực'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OtpChangeModal;
