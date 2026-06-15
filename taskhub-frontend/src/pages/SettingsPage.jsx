import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Shield, Bell, Moon, Crown, Check } from 'lucide-react';
import { userService, authService, paymentService, passwordVaultService } from '../services/api';
import { toast } from '../components/Toast';
import { setTheme as applyAppTheme, getStoredTheme } from '../theme';

const TABS = [
  { id: 'profile', name: 'Hồ sơ', icon: User },
  { id: 'security', name: 'Bảo mật', icon: Shield },
  { id: 'notifications', name: 'Thông báo', icon: Bell },
  { id: 'display', name: 'Giao diện', icon: Moon },
  { id: 'billing', name: 'Thanh toán', icon: Crown },
];

const THEME_LABELS = { Light: 'Sáng', Dark: 'Tối' };
const ORDER_STATUS_LABELS = { Completed: 'Hoàn tất', Pending: 'Đang xử lý', Failed: 'Thất bại' };

const MAX_AVATAR_BYTES = 1024 * 1024; // 1MB

const formatPrice = (price) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(price || 0);

const ORDER_STATUS_STYLE = {
  Completed: 'bg-green-100 text-green-700',
  Pending: 'bg-amber-100 text-amber-700',
  Failed: 'bg-rose-100 text-rose-700',
};

const initials = (name) =>
  (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// Chỉ coi là ảnh hợp lệ khi là data URL ảnh, http(s) hoặc đường dẫn tương đối —
// tránh render <img> vỡ với dữ liệu rác (vd chuỗi "string").
const isValidImageSrc = (s) =>
  typeof s === 'string' && /^(data:image\/|https?:\/\/|\/)/i.test(s.trim());

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState({
    fullName: '', bio: '', jobTitle: '', phoneNumber: '', username: '', email: '', avatarUrl: '',
  });
  const [settings, setSettings] = useState({ theme: 'Light', enableNotifications: true });
  const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [vaultPins, setVaultPins] = useState({ oldPin: '', newPin: '', confirmPin: '' });
  const [hasVaultPin, setHasVaultPin] = useState(null); // null = chưa biết, true/false sau khi kiểm tra
  const [subscription, setSubscription] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    authService.getCurrentUser()
      .then((res) => {
        const u = res.data;
        setProfile({
          username: u.username || '',
          email: u.email || '',
          fullName: u.profile?.fullName || '',
          bio: u.profile?.bio || '',
          jobTitle: u.profile?.jobTitle || '',
          phoneNumber: u.profile?.phoneNumber || '',
          avatarUrl: u.profile?.avatarUrl || '',
        });
        // Phản ánh theme ĐANG dùng (localStorage) vào tab Giao diện — KHÔNG ép theme
        // lưu trong tài khoản đè lên giao diện hiện tại (trước đây gây nhảy về Light khi mở Cài đặt).
        const currentTheme = getStoredTheme() === 'dark' ? 'Dark' : 'Light';
        setSettings({
          theme: currentTheme,
          enableNotifications: u.settings?.enableNotifications ?? true,
        });
        setSubscription(u.subscription || null);
      })
      .catch(() => toast.error('Không tải được hồ sơ.'))
      .finally(() => setLoading(false));

    paymentService.myOrders()
      .then((res) => setOrders(res.data || []))
      .catch(() => { /* không bắt buộc */ });
  }, []);

  const handlePickAvatar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // cho phép chọn lại cùng tệp
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      return toast.error('Vui lòng chọn tệp ảnh.');
    }
    if (file.size > MAX_AVATAR_BYTES) {
      return toast.error('Ảnh quá lớn (tối đa 1MB).');
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setProfile((p) => ({ ...p, avatarUrl: dataUrl }));
    } catch {
      toast.error('Không đọc được ảnh.');
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await userService.updateProfile({
        fullName: profile.fullName,
        bio: profile.bio,
        jobTitle: profile.jobTitle,
        phoneNumber: profile.phoneNumber,
        avatarUrl: profile.avatarUrl,
      });
      toast.success('Cập nhật hồ sơ thành công!');
    } catch {
      toast.error('Cập nhật thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      return toast.error('Mật khẩu mới không khớp.');
    }
    if (passwords.newPassword.length < 6) {
      return toast.error('Mật khẩu mới phải có ít nhất 6 ký tự.');
    }
    setSaving(true);
    try {
      await userService.changePassword({
        oldPassword: passwords.oldPassword,
        newPassword: passwords.newPassword,
      });
      toast.success('Đổi mật khẩu thành công!');
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const msg = typeof err.response?.data === 'string' ? err.response.data : 'Đổi mật khẩu thất bại.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Kiểm tra trạng thái PIN khi mở tab Bảo mật (chỉ gọi 1 lần).
  useEffect(() => {
    if (activeTab !== 'security' || hasVaultPin !== null) return;
    passwordVaultService.pinStatus()
      .then((res) => setHasVaultPin(!!res.data?.hasPin))
      .catch(() => setHasVaultPin(false)); // 403 (chưa Premium) → coi như chưa có PIN
  }, [activeTab, hasVaultPin]);

  const handleChangePin = async () => {
    if (!/^\d{4,12}$/.test(vaultPins.newPin)) {
      return toast.error('PIN mới cần 4–12 chữ số.');
    }
    if (vaultPins.newPin !== vaultPins.confirmPin) {
      return toast.error('PIN mới nhập lại không khớp.');
    }
    setSaving(true);
    try {
      await passwordVaultService.changePin(vaultPins.oldPin, vaultPins.newPin);
      toast.success('Đã đổi mã PIN kho mật khẩu.');
      setVaultPins({ oldPin: '', newPin: '', confirmPin: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đổi PIN thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async (next) => {
    setSettings(next);
    // Áp dụng chủ đề ngay để thấy thay đổi tức thì.
    applyAppTheme(next.theme?.toLowerCase() === 'dark' ? 'dark' : 'light');
    try {
      await userService.updateProfile({
        theme: next.theme,
        enableNotifications: next.enableNotifications,
      });
      toast.success('Đã lưu tùy chọn.');
    } catch {
      toast.error('Không lưu được tùy chọn.');
    }
  };

  if (loading) {
    return <div className="p-8 text-slate-500">Đang tải cài đặt...</div>;
  }

  const inputClass = "w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none";

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Cài đặt</h2>
        <p className="text-slate-500">Quản lý hồ sơ và tùy chọn tài khoản của bạn.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <item.icon size={18} />
              <span>{item.name}</span>
            </button>
          ))}
        </div>

        <div className="md:col-span-3 bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {/* Ảnh đại diện */}
              <div className="flex items-center gap-5 pb-5 border-b border-slate-100">
                {isValidImageSrc(profile.avatarUrl) ? (
                  <img src={profile.avatarUrl} alt="Ảnh đại diện" className="w-20 h-20 rounded-full object-cover border border-slate-200" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-2xl font-black text-slate-500">
                    {initials(profile.fullName || profile.username)}
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm px-4 py-2 rounded-lg transition-colors">
                      Đổi ảnh
                      <input type="file" accept="image/*" className="hidden" onChange={handlePickAvatar} />
                    </label>
                    {profile.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setProfile((p) => ({ ...p, avatarUrl: '' }))}
                        className="text-rose-600 hover:bg-rose-50 font-bold text-sm px-4 py-2 rounded-lg transition-colors"
                      >
                        Xóa ảnh
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">PNG/JPG, tối đa 1MB. Nhớ bấm "Lưu thay đổi" để áp dụng.</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên đăng nhập</label>
                <input type="text" readOnly className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed" value={profile.username} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Địa chỉ email</label>
                <input type="email" readOnly className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed" value={profile.email} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên</label>
                <input type="text" className={inputClass} value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Chức danh</label>
                <input type="text" className={inputClass} value={profile.jobTitle} onChange={(e) => setProfile({ ...profile, jobTitle: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại</label>
                <input type="tel" className={inputClass} value={profile.phoneNumber} onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Giới thiệu</label>
                <textarea rows={4} className={inputClass} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button onClick={handleSaveProfile} disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Đổi mật khẩu</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu hiện tại</label>
                <input type="password" className={inputClass} value={passwords.oldPassword} onChange={(e) => setPasswords({ ...passwords, oldPassword: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu mới</label>
                <input type="password" className={inputClass} value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Xác nhận mật khẩu mới</label>
                <input type="password" className={inputClass} value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} />
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button onClick={handleChangePassword} disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {saving ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                </button>
              </div>

              <div className="pt-6 mt-2 border-t border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">Mã PIN kho mật khẩu</h3>
                <p className="text-sm text-slate-500 mt-1 mb-4">Lớp xác thực thứ 2 để mở khóa Kho mật khẩu.</p>

                {hasVaultPin === null ? (
                  <p className="text-sm text-slate-400">Đang kiểm tra...</p>
                ) : !hasVaultPin ? (
                  <p className="text-sm text-slate-500">
                    Bạn chưa thiết lập mã PIN. Hãy vào{' '}
                    <Link to="/vault" className="text-indigo-600 font-semibold hover:underline">Kho mật khẩu</Link>{' '}
                    để tạo PIN lần đầu.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">PIN hiện tại</label>
                      <input type="password" inputMode="numeric" maxLength={12} className={inputClass}
                        value={vaultPins.oldPin} onChange={(e) => setVaultPins({ ...vaultPins, oldPin: e.target.value.replace(/\D/g, '') })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">PIN mới (4–12 chữ số)</label>
                      <input type="password" inputMode="numeric" maxLength={12} className={inputClass}
                        value={vaultPins.newPin} onChange={(e) => setVaultPins({ ...vaultPins, newPin: e.target.value.replace(/\D/g, '') })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Xác nhận PIN mới</label>
                      <input type="password" inputMode="numeric" maxLength={12} className={inputClass}
                        value={vaultPins.confirmPin} onChange={(e) => setVaultPins({ ...vaultPins, confirmPin: e.target.value.replace(/\D/g, '') })} />
                    </div>
                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                      <button onClick={handleChangePin} disabled={saving} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50">
                        {saving ? 'Đang cập nhật...' : 'Đổi mã PIN'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900">Tùy chọn thông báo</h3>
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200">
                <div>
                  <p className="font-semibold text-slate-800">Thông báo qua email & trong ứng dụng</p>
                  <p className="text-sm text-slate-500">Nhận cập nhật về công việc, hạn chót và dự án.</p>
                </div>
                <button
                  onClick={() => handleSaveSettings({ ...settings, enableNotifications: !settings.enableNotifications })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${settings.enableNotifications ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${settings.enableNotifications ? 'translate-x-6' : ''}`} />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'display' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900">Giao diện & Chủ đề</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tùy chọn chủ đề</label>
                <div className="grid grid-cols-2 gap-4">
                  {['Light', 'Dark'].map((theme) => (
                    <button
                      key={theme}
                      onClick={() => handleSaveSettings({ ...settings, theme })}
                      className={`p-4 rounded-xl border-2 font-semibold transition-colors ${
                        settings.theme === theme ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {THEME_LABELS[theme]}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-3">Tùy chọn chủ đề được lưu vào tài khoản của bạn.</p>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900">Gói & Thanh toán</h3>

              {/* Gói hiện tại */}
              <div className={`rounded-2xl p-5 border ${subscription?.isPremium ? 'bg-gradient-to-br from-indigo-50 to-white border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${subscription?.isPremium ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      <Crown size={22} />
                    </div>
                    <div>
                      <p className="font-black text-slate-900">{subscription?.isPremium ? 'Premium' : 'Miễn phí'}</p>
                      <p className="text-xs text-slate-500">
                        {subscription?.isPremium
                          ? (subscription?.premiumUntil
                              ? `Hết hạn: ${new Date(subscription.premiumUntil).toLocaleDateString('vi-VN')}`
                              : 'Không giới hạn thời gian')
                          : 'Đang dùng gói miễn phí'}
                      </p>
                    </div>
                  </div>
                  {!subscription?.isPremium && (
                    <Link to="/pricing" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2">
                      <Crown size={16} /> Nâng cấp
                    </Link>
                  )}
                </div>
                {subscription?.isPremium && (
                  <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {['Kho mật khẩu', 'Nhắc deadline', 'Phân tích dự án', 'Cộng tác không giới hạn'].map((p) => (
                      <li key={p} className="flex items-center gap-2 text-sm text-slate-600">
                        <Check size={15} className="text-green-600 shrink-0" /> {p}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Lịch sử đơn hàng */}
              <div>
                <h4 className="font-bold text-slate-700 mb-3">Lịch sử đơn hàng</h4>
                {orders.length === 0 ? (
                  <p className="text-sm text-slate-400">Chưa có đơn hàng nào.</p>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                    {orders.map((o) => (
                      <div key={o.id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{o.planTitle || 'Gói Premium'}</p>
                          <p className="text-xs text-slate-400">{new Date(o.createdAt).toLocaleString('vi-VN')}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-slate-700">{formatPrice(o.amount)}</span>
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${ORDER_STATUS_STYLE[o.status] || 'bg-slate-100 text-slate-500'}`}>
                            {ORDER_STATUS_LABELS[o.status] || o.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
