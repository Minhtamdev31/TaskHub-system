import { useEffect, useState } from 'react';
import { X, Mail, Briefcase, Crown, Calendar } from 'lucide-react';
import { userService } from '../services/api';

const initials = (name) =>
  (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';

const UserProfileModal = ({ userId, onClose }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    userService.getProfile(userId)
      .then((res) => { if (!cancelled) setProfile(res.data); })
      .catch(() => { if (!cancelled) setError('Không tải được hồ sơ.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  if (!userId) return null;

  const name = profile?.fullName || profile?.username || 'Người dùng';

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[120] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 text-white/80 hover:text-white z-10">
          <X size={20} />
        </button>

        {/* Header gradient */}
        <div className="h-24 bg-brand-gradient" />

        <div className="px-6 pb-6 -mt-12">
          {loading ? (
            <div className="flex flex-col items-center py-8">
              <span className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="mt-16 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-sm text-center">
              {error}
            </div>
          ) : (
            <>
              {/* Avatar */}
              <div className="flex justify-center">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={name}
                    className="w-24 h-24 rounded-full border-4 border-white object-cover shadow-lg bg-white"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-slate-100 flex items-center justify-center text-2xl font-black text-slate-500">
                    {initials(name)}
                  </div>
                )}
              </div>

              <div className="text-center mt-3">
                <h3 className="text-xl font-black text-slate-900 flex items-center justify-center gap-2">
                  {name}
                  {profile.isPremium && (
                    <span title="Premium" className="text-amber-500"><Crown size={16} /></span>
                  )}
                </h3>
                <p className="text-sm text-slate-400">@{profile.username}</p>
              </div>

              {profile.bio && (
                <p className="text-sm text-slate-600 text-center mt-4 leading-relaxed">{profile.bio}</p>
              )}

              <div className="mt-5 space-y-3 text-sm">
                {profile.jobTitle && (
                  <div className="flex items-center gap-3 text-slate-700">
                    <Briefcase size={16} className="text-slate-400 shrink-0" />
                    <span>{profile.jobTitle}</span>
                  </div>
                )}
                {profile.email && (
                  <div className="flex items-center gap-3 text-slate-700">
                    <Mail size={16} className="text-slate-400 shrink-0" />
                    <a href={`mailto:${profile.email}`} className="hover:text-blue-600 truncate">{profile.email}</a>
                  </div>
                )}
                {profile.createdAt && (
                  <div className="flex items-center gap-3 text-slate-700">
                    <Calendar size={16} className="text-slate-400 shrink-0" />
                    <span>Tham gia {new Date(profile.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
