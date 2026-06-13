import { useEffect, useState } from 'react';
import { User, Shield, Bell, Moon } from 'lucide-react';
import { userService, authService } from '../services/api';
import { toast } from '../components/Toast';

const TABS = [
  { id: 'profile', name: 'Profile', icon: User },
  { id: 'security', name: 'Security', icon: Shield },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'display', name: 'Display', icon: Moon },
];

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState({
    fullName: '', bio: '', jobTitle: '', phoneNumber: '', username: '', email: '',
  });
  const [settings, setSettings] = useState({ theme: 'Light', enableNotifications: true });
  const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
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
        });
        setSettings({
          theme: u.settings?.theme || 'Light',
          enableNotifications: u.settings?.enableNotifications ?? true,
        });
      })
      .catch(() => toast.error('Failed to load profile.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await userService.updateProfile({
        fullName: profile.fullName,
        bio: profile.bio,
        jobTitle: profile.jobTitle,
        phoneNumber: profile.phoneNumber,
      });
      toast.success('Profile updated successfully!');
    } catch {
      toast.error('Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      return toast.error('New passwords do not match.');
    }
    if (passwords.newPassword.length < 6) {
      return toast.error('New password must be at least 6 characters.');
    }
    setSaving(true);
    try {
      await userService.changePassword({
        oldPassword: passwords.oldPassword,
        newPassword: passwords.newPassword,
      });
      toast.success('Password changed successfully!');
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const msg = typeof err.response?.data === 'string' ? err.response.data : 'Failed to change password.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async (next) => {
    setSettings(next);
    try {
      await userService.updateProfile({
        theme: next.theme,
        enableNotifications: next.enableNotifications,
      });
      toast.success('Preferences saved.');
    } catch {
      toast.error('Failed to save preferences.');
    }
  };

  if (loading) {
    return <div className="p-8 text-slate-500">Loading settings...</div>;
  }

  const inputClass = "w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none";

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Settings</h2>
        <p className="text-slate-500">Manage your profile and account preferences.</p>
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                <input type="text" readOnly className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed" value={profile.username} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input type="email" readOnly className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed" value={profile.email} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input type="text" className={inputClass} value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Job Title</label>
                <input type="text" className={inputClass} value={profile.jobTitle} onChange={(e) => setProfile({ ...profile, jobTitle: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <input type="tel" className={inputClass} value={profile.phoneNumber} onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
                <textarea rows={4} className={inputClass} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button onClick={handleSaveProfile} disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Change Password</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                <input type="password" className={inputClass} value={passwords.oldPassword} onChange={(e) => setPasswords({ ...passwords, oldPassword: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <input type="password" className={inputClass} value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                <input type="password" className={inputClass} value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} />
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button onClick={handleChangePassword} disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {saving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900">Notification Preferences</h3>
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200">
                <div>
                  <p className="font-semibold text-slate-800">Email & in-app notifications</p>
                  <p className="text-sm text-slate-500">Receive updates about tasks, deadlines and projects.</p>
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
              <h3 className="text-lg font-bold text-slate-900">Display & Theme</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Theme preference</label>
                <div className="grid grid-cols-2 gap-4">
                  {['Light', 'Dark'].map((theme) => (
                    <button
                      key={theme}
                      onClick={() => handleSaveSettings({ ...settings, theme })}
                      className={`p-4 rounded-xl border-2 font-semibold transition-colors ${
                        settings.theme === theme ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-3">Your theme preference is saved to your account.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
