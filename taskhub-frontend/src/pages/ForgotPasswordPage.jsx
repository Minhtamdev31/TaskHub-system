import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, KeyRound, ArrowLeft } from 'lucide-react';
import { authService } from '../services/api';
import { toast } from '../components/Toast';

const getError = (err, fallback) =>
  typeof err.response?.data === 'string'
    ? err.response.data
    : err.response?.data?.message || err.message || fallback;

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: email, 2: otp + new password
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      toast.success('Mã OTP đã được gửi tới email của bạn.');
      setStep(2);
    } catch (err) {
      toast.error(getError(err, 'Không gửi được mã OTP.'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu không khớp.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword({ email, otpCode, newPassword });
      toast.success('Đặt lại mật khẩu thành công. Vui lòng đăng nhập.');
      navigate('/login');
    } catch (err) {
      toast.error(getError(err, 'Không đặt lại được mật khẩu.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <KeyRound size={28} />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900">Đặt lại mật khẩu</h2>
          <p className="text-slate-500 mt-2">
            {step === 1 ? 'Nhập email để nhận mã đặt lại mật khẩu' : 'Nhập mã và mật khẩu mới của bạn'}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Địa chỉ email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-gradient hover:opacity-90 text-white font-bold py-3 rounded-lg transition-opacity shadow-lg disabled:opacity-50"
            >
              {loading ? 'Đang gửi...' : 'Gửi mã đặt lại'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mã OTP</label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="Mã 6 chữ số"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none tracking-[0.3em] text-center font-bold"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu mới</label>
              <input
                type="password"
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Xác nhận mật khẩu</label>
              <input
                type="password"
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-gradient hover:opacity-90 text-white font-bold py-3 rounded-lg transition-opacity shadow-lg disabled:opacity-50"
            >
              {loading ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-sm text-slate-500 hover:text-indigo-600 font-medium"
            >
              Chưa nhận được mã? Thử lại
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <Link to="/login" className="text-slate-600 text-sm font-medium hover:text-indigo-600 flex items-center justify-center gap-1">
            <ArrowLeft size={14} /> Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
