import { Link } from 'react-router-dom';
import {
  FolderKanban,
  Users,
  KeyRound,
  Bell,
  LineChart,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

const isLoggedIn = () => !!localStorage.getItem('token');

const features = [
  {
    icon: FolderKanban,
    title: 'Quản lý dự án Kanban',
    desc: 'Tổ chức công việc theo bảng trực quan, kéo-thả task, đặt độ ưu tiên và hạn chót rõ ràng.',
  },
  {
    icon: Users,
    title: 'Cộng tác nhóm',
    desc: 'Mời thành viên, phân quyền theo vai trò, gán việc và thảo luận ngay trên từng task.',
  },
  {
    icon: LineChart,
    title: 'Bảng điều khiển & biểu đồ',
    desc: 'Theo dõi tiến độ, đóng góp của từng thành viên qua dashboard và biểu đồ trực quan.',
  },
  {
    icon: Bell,
    title: 'Thông báo thời gian thực',
    desc: 'Nhận thông báo tức thì khi được giao việc, được mời vào dự án hay có bình luận mới.',
  },
  {
    icon: KeyRound,
    title: 'Kho mật khẩu mã hóa',
    desc: 'Lưu trữ thông tin đăng nhập quan trọng của nhóm an toàn với mã hóa đầu cuối.',
  },
  {
    icon: ShieldCheck,
    title: 'Bảo mật nhiều lớp',
    desc: 'Xác thực OTP qua email, reCAPTCHA chống bot và đăng nhập nhanh bằng Google.',
  },
];

const steps = [
  { num: '1', title: 'Tạo tài khoản', desc: 'Đăng ký miễn phí trong vài giây bằng email hoặc Google.' },
  { num: '2', title: 'Tạo dự án & mời nhóm', desc: 'Lập dự án, thêm thành viên và phân quyền phù hợp.' },
  { num: '3', title: 'Bắt đầu cộng tác', desc: 'Giao việc, theo dõi tiến độ và hoàn thành mục tiêu cùng nhau.' },
];

const LandingPage = () => {
  const loggedIn = isLoggedIn();

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/TaskHubLogo.png" alt="TaskHub" className="h-10 w-auto" />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            {loggedIn ? (
              <Link
                to="/dashboard"
                className="bg-brand-gradient hover:opacity-90 text-white font-semibold px-5 py-2 rounded-lg transition-opacity shadow-md flex items-center gap-2"
              >
                Vào ứng dụng <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-slate-600 hover:text-slate-900 font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="bg-brand-gradient hover:opacity-90 text-white font-semibold px-5 py-2 rounded-lg transition-opacity shadow-md"
                >
                  Đăng ký miễn phí
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/60 via-white to-white pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-sm font-medium px-3 py-1 rounded-full mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Nền tảng quản lý công việc cho nhóm
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight">
              Quản lý dự án của bạn{' '}
              <span className="text-brand-gradient">thông minh hơn</span> cùng TaskHub
            </h1>
            <p className="text-lg text-slate-600 mt-6 max-w-xl">
              Tổ chức công việc, cộng tác cùng nhóm và theo dõi tiến độ — tất cả trong một nơi.
              Đơn giản, trực quan và bảo mật.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link
                to={loggedIn ? '/dashboard' : '/register'}
                className="bg-brand-gradient hover:opacity-90 text-white font-bold px-7 py-3 rounded-lg transition-opacity shadow-lg flex items-center gap-2"
              >
                {loggedIn ? 'Vào ứng dụng' : 'Bắt đầu miễn phí'} <ArrowRight size={18} />
              </Link>
              <Link
                to="/login"
                className="border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold px-7 py-3 rounded-lg transition-colors"
              >
                Đăng nhập
              </Link>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-8 text-sm text-slate-500">
              <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-emerald-500" /> Miễn phí khi bắt đầu</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-emerald-500" /> Không cần thẻ tín dụng</span>
            </div>
          </div>

          {/* App preview mockup */}
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-5 rotate-1 hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center gap-1.5 mb-4">
                <span className="w-3 h-3 rounded-full bg-rose-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {['Cần làm', 'Đang làm', 'Hoàn thành'].map((col, ci) => (
                  <div key={col} className="bg-slate-50 rounded-xl p-3">
                    <div className="text-xs font-bold text-slate-500 mb-2">{col}</div>
                    <div className="space-y-2">
                      {Array.from({ length: ci === 1 ? 3 : 2 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-lg p-2.5 shadow-sm border border-slate-100">
                          <div className="h-1.5 w-10 rounded-full bg-brand-gradient mb-2" />
                          <div className="h-2 w-full rounded bg-slate-200 mb-1.5" />
                          <div className="h-2 w-2/3 rounded bg-slate-100" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -bottom-5 -left-5 bg-white rounded-xl shadow-xl border border-slate-100 px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-gradient flex items-center justify-center text-white">
                <LineChart size={18} />
              </div>
              <div>
                <div className="text-xs text-slate-400">Tiến độ tuần này</div>
                <div className="text-sm font-bold text-slate-800">+24% hoàn thành</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Mọi thứ nhóm bạn cần để hoàn thành công việc
          </h2>
          <p className="text-slate-600 mt-4">
            TaskHub gom mọi công cụ quản lý dự án vào một nền tảng duy nhất, gọn gàng và dễ dùng.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="group bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-gradient flex items-center justify-center text-white mb-4 shadow-md">
                <f.icon size={22} />
              </div>
              <h3 className="text-lg font-bold mb-2">{f.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Bắt đầu chỉ trong 3 bước</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.num} className="text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-gradient text-white text-xl font-black flex items-center justify-center shadow-lg mb-5">
                  {s.num}
                </div>
                <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                <p className="text-slate-600 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="bg-brand-gradient rounded-3xl px-8 py-14 text-center text-white shadow-2xl">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Sẵn sàng tăng năng suất cho nhóm?</h2>
          <p className="text-white/90 mt-4 max-w-xl mx-auto">
            Tham gia TaskHub ngay hôm nay và trải nghiệm cách quản lý công việc hiệu quả hơn.
          </p>
          <Link
            to={loggedIn ? '/dashboard' : '/register'}
            className="inline-flex items-center gap-2 bg-white text-slate-900 font-bold px-8 py-3 rounded-lg mt-8 hover:bg-slate-100 transition-colors shadow-lg"
          >
            {loggedIn ? 'Vào ứng dụng' : 'Tạo tài khoản miễn phí'} <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src="/TaskHubLogo.png" alt="TaskHub" className="h-9 w-auto" />
          <p className="text-sm text-slate-400">© {new Date().getFullYear()} TaskHub. Mọi quyền được bảo lưu.</p>
          <div className="flex gap-4 text-sm text-slate-500">
            <Link to="/login" className="hover:text-slate-900">Đăng nhập</Link>
            <Link to="/register" className="hover:text-slate-900">Đăng ký</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
