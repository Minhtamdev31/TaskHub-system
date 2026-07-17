import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  Users,
  KeyRound,
  Bell,
  LineChart,
  ShieldCheck,
  Lock,
  History,
  UserMinus,
  Eye,
  ArrowRight,
  Check,
} from 'lucide-react';

const isLoggedIn = () => !!localStorage.getItem('token');

// Nhãn CTA khóa cố định cho ý định "đăng ký" trên toàn trang.
const SIGNUP_LABEL = 'Dùng thử miễn phí';

const prefersReduced =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Reveal-on-scroll bằng IntersectionObserver (không dùng scroll listener).
// Mục đích: dẫn mắt theo trình tự khi cuộn. Tự tắt khi prefers-reduced-motion.
// Mặc định trạng thái 'idle' = hiển thị đầy đủ: nếu JS lỗi/chậm hoặc observer
// không kích hoạt, nội dung vẫn thấy được. Chỉ ẩn-rồi-animate khi JS đã gắn
// observer (useLayoutEffect chạy trước paint nên không gây nháy).
function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const [state, setState] = useState('idle'); // idle | hidden | shown

  useLayoutEffect(() => {
    if (prefersReduced || !ref.current) return;
    setState('hidden');
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState('shown');
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  const hidden = state === 'hidden';

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: hidden ? 0 : 1,
        transform: hidden ? 'translateY(24px)' : 'none',
        transition:
          state === 'idle'
            ? undefined
            : `opacity .6s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .6s cubic-bezier(.16,1,.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// Khách hàng minh họa: tên bối cảnh VN + monogram SVG (logo-only, không nhãn ngành).
const clients = [
  { name: 'Sao Bắc Media', mono: 'SB' },
  { name: 'Tầm Nhìn Digital', mono: 'TN' },
  { name: 'Minh Long Co.', mono: 'ML' },
  { name: 'Hạo Group', mono: 'HG' },
  { name: 'Vũ Studio', mono: 'VS' },
];

const ClientMark = ({ mono, name }) => (
  <div className="flex items-center gap-2.5 text-slate-400" title={name}>
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true" className="shrink-0">
      <circle cx="17" cy="17" r="16" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text
        x="17"
        y="22"
        textAnchor="middle"
        fontSize="12"
        fontWeight="700"
        fill="currentColor"
        fontFamily="ui-sans-serif, system-ui"
      >
        {mono}
      </text>
    </svg>
    <span className="text-sm font-semibold whitespace-nowrap">{name}</span>
  </div>
);

const bentoFeatures = [
  {
    icon: FolderKanban,
    title: 'Bảng Kanban trực quan',
    desc: 'Kéo-thả công việc qua từng cột, đặt độ ưu tiên và hạn chót rõ ràng cho cả đội.',
    span: 'md:col-span-4',
    tone: 'light',
  },
  {
    icon: KeyRound,
    title: 'Kho tài khoản chia sẻ',
    desc: 'Chia sẻ thông tin đăng nhập chung mà thành viên không nhìn thấy mật khẩu gốc.',
    span: 'md:col-span-2',
    tone: 'brand',
  },
  {
    icon: Users,
    title: 'Phân quyền theo vai trò',
    desc: 'Chủ sở hữu, quản trị, thành viên, khách. Mỗi người thấy đúng phần của mình.',
    span: 'md:col-span-2',
    tone: 'light',
  },
  {
    icon: LineChart,
    title: 'Dashboard & báo cáo',
    desc: 'Tiến độ dự án và đóng góp từng người, trực quan cho cấp quản lý.',
    span: 'md:col-span-2',
    tone: 'dark',
  },
  {
    icon: Bell,
    title: 'Thông báo thời gian thực',
    desc: 'Báo ngay khi được giao việc, được nhắc tên hay có bình luận mới.',
    span: 'md:col-span-2',
    tone: 'light',
  },
];

const securityPillars = [
  {
    icon: Lock,
    title: 'Mã hóa khi lưu trữ',
    desc: 'Mật khẩu được mã hóa và bảo vệ thêm bằng mã PIN riêng cho từng người.',
  },
  {
    icon: UserMinus,
    title: 'Thu hồi quyền tức thì',
    desc: 'Nhân viên nghỉ việc, gỡ quyền truy cập tài khoản chung chỉ trong một thao tác.',
  },
  {
    icon: History,
    title: 'Nhật ký kiểm toán',
    desc: 'Biết rõ ai đã xem, dùng hay thay đổi tài khoản nào, vào lúc nào.',
  },
];

const steps = [
  { num: '1', title: 'Tạo không gian làm việc', desc: 'Đăng ký bằng email hoặc Google, lập dự án đầu tiên trong vài giây.' },
  { num: '2', title: 'Mời nhóm & phân quyền', desc: 'Thêm thành viên, gán vai trò và chia sẻ tài khoản chung an toàn.' },
  { num: '3', title: 'Vận hành & kiểm soát', desc: 'Giao việc, theo dõi tiến độ và nắm toàn quyền kiểm soát truy cập.' },
];

const LandingPage = () => {
  const loggedIn = isLoggedIn();
  const primaryCta = loggedIn ? '/dashboard' : '/register';
  const primaryLabel = loggedIn ? 'Vào ứng dụng' : SIGNUP_LABEL;

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
                Vào ứng dụng <ArrowRight size={16} strokeWidth={2} />
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
                  {SIGNUP_LABEL}
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero - split bất đối xứng: copy bên trái, preview kho tài khoản bên phải */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/60 via-white to-white pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 lg:pt-20 pb-24 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <span className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium px-3 py-1 rounded-full mb-6 shadow-sm">
              <ShieldCheck size={15} strokeWidth={2} className="text-emerald-500" />
              Dành cho đội nhóm và doanh nghiệp
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-[1.1] tracking-tight">
              Quản lý công việc và{' '}
              <span className="text-brand-gradient">chia sẻ tài khoản</span> cho cả đội
            </h1>
            <p className="text-lg text-slate-600 mt-6 max-w-xl leading-relaxed">
              Kanban trực quan kết hợp kho mật khẩu mã hóa. Chia sẻ tài khoản chung cho nhóm mà không bao giờ để lộ mật khẩu.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link
                to={primaryCta}
                className="bg-brand-gradient hover:opacity-90 text-white font-bold px-7 py-3 rounded-lg transition-opacity shadow-lg flex items-center gap-2 active:translate-y-px"
              >
                {primaryLabel} <ArrowRight size={18} strokeWidth={2} />
              </Link>
              <Link
                to="/login"
                className="border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold px-7 py-3 rounded-lg transition-colors active:translate-y-px"
              >
                Đăng nhập
              </Link>
            </div>
          </div>

          {/* Preview thật: thẻ tài khoản chia sẻ trong kho mật khẩu của TaskHub */}
          <Reveal delay={120}>
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center text-white shadow-md">
                      <KeyRound size={18} strokeWidth={2} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800">Facebook Ads - Team Marketing</div>
                      <div className="text-xs text-slate-400">Tài khoản dùng chung</div>
                    </div>
                  </div>
                  <Lock size={16} strokeWidth={2} className="text-emerald-500" />
                </div>

                <div className="space-y-3">
                  <div className="bg-slate-50 rounded-xl px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Tên đăng nhập</div>
                    <div className="text-sm font-medium text-slate-700">ads.marketing@congty.vn</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Mật khẩu</div>
                      <div className="text-sm font-mono tracking-widest text-slate-700">••••••••••</div>
                    </div>
                    <Eye size={18} strokeWidth={2} className="text-slate-400" />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
                  <div className="flex items-center">
                    {['NH', 'TL', 'PA'].map((m, i) => (
                      <div
                        key={m}
                        className="w-8 h-8 rounded-full bg-brand-gradient text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-white"
                        style={{ marginLeft: i === 0 ? 0 : -8 }}
                      >
                        {m}
                      </div>
                    ))}
                    <span className="ml-3 text-xs text-slate-500">Chia sẻ với 3 thành viên</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                    <UserMinus size={13} strokeWidth={2} /> Thu hồi
                  </span>
                </div>
              </div>

              <div className="absolute -bottom-5 -left-4 bg-white rounded-xl shadow-xl border border-slate-100 px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white">
                  <History size={17} strokeWidth={2} />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Nhật ký truy cập</div>
                  <div className="text-sm font-semibold text-slate-800">Phương An đã xem, 2 phút trước</div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Logo wall - dưới hero, chỉ logo */}
      <section className="border-y border-slate-100 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <p className="text-center text-sm font-medium text-slate-500 mb-7">
            Được tin dùng bởi các đội nhóm đang tăng trưởng
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
            {clients.map((c) => (
              <ClientMark key={c.name} mono={c.mono} name={c.name} />
            ))}
          </div>
        </div>
      </section>

      {/* Khác biệt cốt lõi - split text + visual nhật ký kiểm soát */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal>
            <span className="text-sm font-bold text-emerald-600 mb-4 inline-block">
              Khác biệt của TaskHub
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Chia sẻ tài khoản chung, giữ trọn quyền kiểm soát
            </h2>
            <p className="text-slate-600 mt-5 leading-relaxed max-w-xl">
              Các công cụ quản lý việc khác bắt bạn dán mật khẩu vào ghi chú hay nhắn qua chat. TaskHub gom việc và tài khoản chung vào một nơi, có kiểm soát thật sự.
            </p>
            <ul className="mt-7 space-y-3">
              {[
                'Thành viên dùng được tài khoản mà không thấy mật khẩu gốc',
                'Gỡ quyền tức thì khi có người rời nhóm',
                'Mọi lượt truy cập đều được ghi lại để kiểm toán',
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-slate-700">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check size={13} strokeWidth={3} />
                  </span>
                  <span className="text-[15px]">{t}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={120}>
            <div className="bg-slate-900 rounded-3xl p-7 shadow-2xl">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-5">
                <History size={15} strokeWidth={2} /> Nhật ký kiểm toán
              </div>
              <div className="space-y-3">
                {[
                  { who: 'Ngọc Hân', act: 'đã xem mật khẩu CRM', time: 'Vừa xong' },
                  { who: 'Tuấn Lê', act: 'được cấp quyền Canva Pro', time: '14:02' },
                  { who: 'Phương An', act: 'bị thu hồi quyền Facebook Ads', time: 'Hôm qua' },
                  { who: 'Minh Long', act: 'cập nhật mật khẩu hosting', time: 'Hôm qua' },
                ].map((row) => (
                  <div
                    key={row.who + row.act}
                    className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-brand-gradient text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                      {row.who.split(' ').slice(-1)[0][0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-slate-200 truncate">
                        <span className="font-semibold text-white">{row.who}</span> {row.act}
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 shrink-0">{row.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Bento năng lực */}
      <section className="bg-slate-50 py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Một nền tảng cho cả công việc lẫn tài khoản đội nhóm
            </h2>
            <p className="text-slate-600 mt-4 leading-relaxed">
              Thay vì ghép Trello với một trình quản lý mật khẩu rời rạc, mọi thứ nằm gọn trong TaskHub.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-5">
            {bentoFeatures.map((f, i) => {
              const toneClass =
                f.tone === 'brand'
                  ? 'bg-brand-gradient text-white border-transparent'
                  : f.tone === 'dark'
                    ? 'bg-slate-900 text-white border-transparent'
                    : 'bg-white text-slate-900 border-slate-100';
              const descClass =
                f.tone === 'light' ? 'text-slate-600' : 'text-white/80';
              const iconWrap =
                f.tone === 'light'
                  ? 'bg-brand-gradient text-white'
                  : 'bg-white/15 text-white';
              return (
                <Reveal key={f.title} delay={i * 60} className={f.span}>
                  <div className={`h-full rounded-2xl border p-6 shadow-sm ${toneClass}`}>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${iconWrap}`}>
                      <f.icon size={22} strokeWidth={2} />
                    </div>
                    <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                    <p className={`text-sm leading-relaxed ${descClass}`}>{f.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bảo mật - dải 3 trụ cột, không phải thẻ rời */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Đủ an toàn để doanh nghiệp tin tưởng
          </h2>
        </div>
        <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 rounded-2xl border border-slate-100 overflow-hidden">
          {securityPillars.map((p) => (
            <div key={p.title} className="p-8">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <p.icon size={21} strokeWidth={2} />
              </div>
              <h3 className="text-lg font-bold mb-2">{p.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Các bước - luồng ngang có đường nối */}
      <section className="bg-slate-50 py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Đưa cả đội lên TaskHub trong 3 bước</h2>
          </div>
          <div className="relative grid md:grid-cols-3 gap-10">
            <div className="hidden md:block absolute top-7 left-[16%] right-[16%] h-px bg-slate-200" />
            {steps.map((s) => (
              <div key={s.num} className="relative text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-gradient text-white text-xl font-black flex items-center justify-center shadow-lg mb-5 ring-8 ring-slate-50">
                  {s.num}
                </div>
                <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed max-w-xs mx-auto">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
        <div className="bg-brand-gradient rounded-3xl px-8 py-16 text-center text-white shadow-2xl">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Sẵn sàng đưa đội nhóm vào một nơi an toàn?</h2>
          <p className="text-white/90 mt-4 max-w-xl mx-auto leading-relaxed">
            Bắt đầu miễn phí, không cần thẻ tín dụng. Nâng cấp theo số thành viên khi đội của bạn lớn lên.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <Link
              to={primaryCta}
              className="inline-flex items-center gap-2 bg-white text-slate-900 font-bold px-8 py-3 rounded-lg hover:bg-slate-100 transition-colors shadow-lg active:translate-y-px"
            >
              {primaryLabel} <ArrowRight size={18} strokeWidth={2} />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 border border-white/40 text-white font-semibold px-8 py-3 rounded-lg hover:bg-white/10 transition-colors active:translate-y-px"
            >
              Xem bảng giá
            </Link>
          </div>
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
            <Link to="/pricing" className="hover:text-slate-900">Bảng giá</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
