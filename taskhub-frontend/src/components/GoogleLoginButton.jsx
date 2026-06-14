import { useEffect, useRef, useState } from 'react';
import { authService } from '../services/api';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '523086170118-8hmdpvtjno80u4pp3cq1o6i9vddd7t0b.apps.googleusercontent.com';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

// Load Google Identity Services script once and resolve when window.google is ready.
let gsiPromise = null;
const loadGsiScript = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gsiPromise) return gsiPromise;

  gsiPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return gsiPromise;
};

/**
 * Nút "Đăng nhập bằng Google" dùng Google Identity Services.
 * Sau khi Google trả về id_token, gọi backend /auth/google-login để đổi lấy JWT.
 */
const GoogleLoginButton = ({ onError }) => {
  const containerRef = useRef(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const handleCredential = async (response) => {
      if (!response?.credential) return;
      setBusy(true);
      try {
        const res = await authService.googleLogin(response.credential);
        localStorage.setItem('token', res.data.token);
        window.location.href = '/dashboard';
      } catch (err) {
        const message =
          typeof err.response?.data === 'string'
            ? err.response.data
            : err.response?.data?.message || err.message || 'Đăng nhập Google thất bại.';
        onError?.(message);
        setBusy(false);
      }
    };

    loadGsiScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredential,
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 320,
        });
      })
      .catch(() => {
        onError?.('Không tải được Google Sign-In. Vui lòng thử lại.');
      });

    return () => {
      cancelled = true;
    };
  }, [onError]);

  return (
    <div className="flex justify-center min-h-[44px]">
      <div ref={containerRef} className={busy ? 'opacity-50 pointer-events-none' : ''} />
    </div>
  );
};

export default GoogleLoginButton;
