import { Link } from 'react-router-dom';
import { KeyRound, Users, ShieldCheck } from 'lucide-react';

// Khung dùng chung cho các trang xác thực (Login / Register / Forgot).
// Trái: panel gradient thương hiệu (chỉ hiện từ lg) — đặt bối cảnh, tạo màu.
// Phải: vùng form (children) trên nền wash nhẹ.
const points = [
  { icon: KeyRound, text: 'Kho mật khẩu mã hoá, khoá bằng mã PIN' },
  { icon: Users, text: 'Giao việc & phân quyền cho cả đội' },
  { icon: ShieldCheck, text: 'Nhắc deadline và thông báo real-time' },
];

const AuthLayout = ({ children }) => (
  <div className="min-h-[100dvh] flex">
    {/* Panel thương hiệu */}
    <div className="hidden lg:flex lg:w-[44%] xl:w-[40%] relative bg-brand-gradient text-white overflow-hidden">
      {/* Đốm sáng trang trí */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-20 -right-16 w-80 h-80 rounded-full bg-white/10 blur-2xl" />

      <Link to="/" className="absolute top-12 left-12 z-10 flex items-center gap-2.5">
        <img src="/TaskHubLogo.png" alt="TaskHub" className="h-11 w-auto brightness-0 invert" />
      </Link>

      <div className="relative z-10 flex flex-col justify-center px-12 w-full">
        <h1 className="text-4xl font-black leading-[1.15] tracking-tight max-w-md">
          Quản lý việc nhóm và kho mật khẩu, gọn trong một nơi
        </h1>
        <ul className="mt-8 space-y-4 max-w-md">
          {points.map((p) => (
            <li key={p.text} className="flex items-center gap-3 text-white/90">
              <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <p.icon size={18} strokeWidth={2} />
              </span>
              <span className="text-[15px] font-medium">{p.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="absolute bottom-12 left-12 z-10 text-sm text-white/70">© {new Date().getFullYear()} TaskHub</p>
    </div>

    {/* Vùng form */}
    <div className="flex-1 flex items-center justify-center app-bg px-4 py-10">
      {children}
    </div>
  </div>
);

export default AuthLayout;
