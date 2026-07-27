import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import ReCAPTCHA from "react-google-recaptcha";
import { authService } from '../services/api';
import GoogleLoginButton from '../components/GoogleLoginButton';
import AuthLayout from '../components/AuthLayout';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const recaptchaRef = useRef(null);

  const handleGoogleError = useCallback((message) => setError(message), []);

  const resetCaptcha = () => {
    recaptchaRef.current?.reset();
    setCaptchaToken(null);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return; // chặn double-submit khi đang gửi
    setError('');

    if (!captchaToken) {
      setError('Vui lòng xác thực reCAPTCHA.');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.login({ email, password, captchaToken });
      localStorage.setItem('token', response.data.token);
      // Admin vào thẳng Bảng quản trị; người dùng thường vào Dashboard cá nhân.
      let target = '/dashboard';
      try {
        const me = await authService.getCurrentUser();
        if ((me.data?.role || '').toLowerCase() === 'admin') target = '/admin';
      } catch { /* lỗi đọc role → mặc định /dashboard */ }
      window.location.href = target;
    } catch (err) {
      const errorMessage = typeof err.response?.data === 'string'
        ? err.response.data
        : (err.response?.data?.message || err.message || "Đã xảy ra lỗi không xác định");
      setError(errorMessage);
      // Token reCAPTCHA chỉ dùng được 1 lần → phải xác thực lại trước khi thử lại
      resetCaptcha();
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <img src="/TaskHubLogo.png" alt="TaskHub" className="h-16 w-auto mx-auto mb-4 lg:hidden" />
          <h2 className="text-3xl font-extrabold text-slate-900">Chào mừng trở lại</h2>
          <p className="text-slate-500 mt-2">Đăng nhập để quản lý dự án của bạn</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-6 text-sm">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Địa chỉ email</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="email"
                required
                disabled={loading}
                placeholder="ban@congty.vn"
                className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition disabled:bg-slate-50"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Mật khẩu</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={loading}
                placeholder="••••••••"
                className="w-full pl-11 pr-11 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition disabled:bg-slate-50"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                tabIndex={-1}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex justify-end -mt-2">
            <Link to="/forgot-password" className="text-sm text-blue-600 font-medium hover:underline">
              Quên mật khẩu?
            </Link>
          </div>

          <div className="flex justify-center py-2">
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LccYRotAAAAAKOZSmz1WzN0HoclDl3rXI3qKyau"}
              onChange={(token) => setCaptchaToken(token)}
              onExpired={() => setCaptchaToken(null)}
              onErrored={() => setCaptchaToken(null)}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !captchaToken}
            className="w-full bg-brand-gradient hover:opacity-90 text-white font-bold py-3 rounded-lg transition-opacity shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Đang đăng nhập...
              </>
            ) : (
              'Đăng nhập'
            )}
          </button>

          {loading && (
            <p className="text-xs text-center text-slate-400">
              Lần đăng nhập đầu có thể mất 30–60 giây nếu server vừa khởi động lại.
            </p>
          )}
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400 uppercase tracking-wide">hoặc</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <GoogleLoginButton onError={handleGoogleError} />

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-slate-600 text-sm">
            Chưa có tài khoản? <Link to="/register" className="text-blue-600 font-bold hover:underline">Đăng ký</Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
};

export default LoginPage;
