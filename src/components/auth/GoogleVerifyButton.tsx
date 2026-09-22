import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, RefreshCw, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { authService } from '../../services/authService';
import firebaseConfigData from '../../../firebase-applet-config.json';

export interface GoogleVerifiedUser {
  sub: string;
  email: string;
  name: string;
  picture: string;
  emailVerified: boolean;
}

interface GoogleVerifyButtonProps {
  isVerified: boolean;
  verifiedUser: GoogleVerifiedUser | null;
  onVerified: (user: GoogleVerifiedUser) => void;
  onReset: () => void;
  disabled?: boolean;
}

export const GoogleVerifyButton: React.FC<GoogleVerifyButtonProps> = ({
  isVerified,
  verifiedUser,
  onVerified,
  onReset,
  disabled = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isGsiReady, setIsGsiReady] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const envClientId = (import.meta.env?.VITE_GOOGLE_CLIENT_ID || '').trim();
  const defaultAppletClientId = (firebaseConfigData as any)?.oAuthClientId || '';
  const [clientId, setClientId] = useState<string>(() => {
    const saved = (localStorage.getItem('sblms_google_client_id') || '').trim();
    if (saved && saved.startsWith('182246867443')) {
      localStorage.removeItem('sblms_google_client_id');
      return envClientId || defaultAppletClientId;
    }
    return envClientId || saved || defaultAppletClientId;
  });

  // Fetch client ID from server if missing
  useEffect(() => {
    let isMounted = true;
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/config');
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          const sId = (data.googleClientId || '').trim();
          if (sId && !sId.startsWith('182246867443') && isMounted && !envClientId) {
            setClientId(sId);
          }
        }
      } catch (err) {
        console.warn('[GoogleVerifyButton] Config fetch warning:', err);
      }
    };

    if (!clientId || clientId.startsWith('182246867443')) {
      fetchConfig();
    }
    return () => {
      isMounted = false;
    };
  }, [clientId, envClientId]);

  // Wait for Google Identity Services SDK
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    const checkGsi = () => {
      if (window.google?.accounts?.id) {
        setIsGsiReady(true);
        if (interval) clearInterval(interval);
      }
    };

    checkGsi();
    if (!window.google?.accounts?.id) {
      interval = setInterval(checkGsi, 200);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const handleCredentialResponse = async (response: { credential?: string }) => {
    if (!response || !response.credential) {
      setErrorMessage('Không nhận được mã xác thực (credential) từ Google.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const verified = await authService.verifyGoogleToken(response.credential);
      onVerified(verified);
    } catch (err: any) {
      console.error('[GoogleVerifyButton] Verification error:', err);
      setErrorMessage(err.message || 'Xác thực tài khoản Google thất bại.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Render or initialize Google Button
  useEffect(() => {
    if (isVerified || !isGsiReady || !clientId || !containerRef.current) {
      return;
    }

    try {
      window.google!.accounts!.id!.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true
      });

      containerRef.current.innerHTML = '';
      window.google!.accounts!.id!.renderButton(containerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 300
      });
    } catch (err) {
      console.warn('[GoogleVerifyButton] GIS render error:', err);
    }
  }, [isGsiReady, clientId, isVerified]);

  const handleCustomTrigger = () => {
    if (!isGsiReady || !clientId) {
      setErrorMessage('Hệ thống xác thực Google đang tải, vui lòng thử lại sau giây lát.');
      return;
    }
    setErrorMessage(null);
    try {
      window.google!.accounts!.id!.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true
      });
      window.google!.accounts!.id!.prompt();
    } catch (err) {
      console.warn('[GoogleVerifyButton] Prompt failed:', err);
    }
  };

  if (isVerified && verifiedUser) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-2.5 transition-all">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-emerald-900 flex items-center gap-1">
                <span>✓ Tài khoản Google đã được xác minh</span>
              </p>
              <p className="text-xs text-emerald-700 font-mono font-medium">
                {verifiedUser.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onReset}
            disabled={disabled}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 shadow-2xs transition cursor-pointer shrink-0"
            title="Xác minh lại bằng tài khoản khác"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Xác minh lại</span>
          </button>
        </div>

        <p className="text-[11px] text-emerald-800/80 leading-snug">
          Quyền sở hữu email <strong>{verifiedUser.email}</strong> đã được Google chứng thực. Vui lòng hoàn tất đặt mật khẩu để tạo tài khoản.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Xác minh danh tính qua Google <span className="text-red-500">*</span></span>
        </label>
        <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
          Bắt buộc
        </span>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">
        Google chỉ được dùng để <strong>xác minh quyền sở hữu email</strong> và danh tính. Hệ thống <strong>không tự động đăng nhập</strong>.
      </p>

      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <span className="leading-snug">{errorMessage}</span>
        </div>
      )}

      {isVerifying ? (
        <div className="py-3 flex items-center justify-center gap-2 text-xs font-semibold text-blue-700 bg-blue-50/60 border border-blue-200 rounded-xl">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>Đang xác minh tài khoản Google...</span>
        </div>
      ) : (
        <div className="space-y-2 pt-0.5">
          {/* Main action button: Xác minh tài khoản Google */}
          <button
            type="button"
            onClick={handleCustomTrigger}
            disabled={disabled || !isGsiReady}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 shadow-2xs hover:border-slate-400 transition flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Xác minh tài khoản Google</span>
          </button>

          {/* Fallback GIS container iframe if popup blocked */}
          <div className="flex justify-center overflow-hidden">
            <div ref={containerRef} className="min-h-[40px]" />
          </div>
        </div>
      )}
    </div>
  );
};
