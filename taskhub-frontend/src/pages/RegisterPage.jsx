import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ReCAPTCHA from "react-google-recaptcha";
import { authService } from '../services/api';
import { toast } from '../components/Toast';
import GoogleLoginButton from '../components/GoogleLoginButton';
import AuthLayout from '../components/AuthLayout';

const getError = (err, fallback) =>
  typeof err.response?.data === 'string'
    ? err.response.data
    : err.response?.data?.message || err.message || fallback;

const RegisterPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: form, 2: otp
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [captchaToken, setCaptchaToken] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) return setError("Mật khẩu không khớp.");
    if (formData.password.length < 6) return setError("Mật khẩu phải có ít nhất 6 ký tự.");
    if (!captchaToken) return setError('Vui lòng xác minh bạn không phải robot.');

    setLoading(true);
    try {
      await authService.register({ ...formData, captchaToken });
      toast.success('Mã OTP đã được gửi tới email của bạn.');
      setStep(2);
    } catch (err) {
      setError(getError(err, 'Đăng ký thất bại.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.verifyRegisterOtp({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        otpCode,
      });
      toast.success('Đăng ký thành công! Bạn có thể đăng nhập ngay.');
      navigate('/login');
    } catch (err) {
      setError(getError(err, 'Xác minh thất bại.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <img src="/TaskHubLogo.png" alt="TaskHub" className="h-16 w-auto mx-auto mb-4 lg:hidden" />
          <h2 className="text-3xl font-extrabold text-slate-900">
            {step === 1 ? 'Tạo tài khoản' : 'Xác minh email'}
          </h2>
          <p className="text-slate-500 mt-2">
            {step === 1 ? 'Tham gia TaskHub để bắt đầu cộng tác' : `Nhập mã chúng tôi đã gửi tới ${formData.email}`}
          </p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-6 text-sm">{error}</div>}

        {step === 1 ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tên người dùng</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu</label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Xác nhận</label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-center py-2 scale-90">
              <ReCAPTCHA
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LccYRotAAAAAKOZSmz1WzN0HoclDl3rXI3qKyau"}
                onChange={(token) => setCaptchaToken(token)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-gradient hover:opacity-90 text-white font-bold py-3 rounded-lg transition-opacity shadow-lg disabled:opacity-50"
            >
              {loading ? 'Đang gửi OTP...' : 'Đăng ký'}
            </button>

            <div className="flex items-center gap-3 pt-2">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 uppercase tracking-wide">hoặc</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <GoogleLoginButton onError={setError} />
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mã OTP</label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="Mã 6 chữ số"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none tracking-[0.3em] text-center font-bold text-lg"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-gradient hover:opacity-90 text-white font-bold py-3 rounded-lg transition-opacity shadow-lg disabled:opacity-50"
            >
              {loading ? 'Đang xác minh...' : 'Xác minh & Hoàn tất'}
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-sm text-slate-500 hover:text-indigo-600 font-medium"
            >
              Quay lại
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-slate-600 text-sm">
            Đã có tài khoản? <Link to="/login" className="text-blue-600 font-bold hover:underline">Đăng nhập</Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
};

export default RegisterPage;
