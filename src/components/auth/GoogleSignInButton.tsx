import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Globe } from 'lucide-react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useToast } from '../../contexts/ToastContext';
import firebaseConfigData from '../../../firebase-applet-config.json';

interface GoogleSignInButtonProps {
  role: 'teacher' | 'student';
  buttonText?: string;
  onSuccess: (credential: string, userProfile?: any) => Promise<void> | void;
  onError?: (error: string) => void;
  className?: string;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, options: any) => void;
          prompt: (notification?: any) => void;
          cancel: () => void;
        };
      };
    };
  }
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  role,
  buttonText,
  onSuccess,
  onError,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
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

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGsiReady, setIsGsiReady] = useState<boolean>(false);

  const { toastSuccess, toastError } = useToast();

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const toastErrorRef = useRef(toastError);
  toastErrorRef.current = toastError;

  const label = buttonText || (role === 'teacher' ? 'Tiếp tục bằng tài khoản Google' : 'Tiếp tục với Google');

  // Load server config if needed
  useEffect(() => {
    let isMounted = true;
    const loadConfig = async () => {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          const serverId = (data.googleClientId || '').trim();
          if (serverId && !serverId.startsWith('182246867443') && isMounted && !envClientId) {
            setClientId(serverId);
          }
        }
      } catch (err) {
        console.warn('[GoogleAuth] Failed to load server config:', err);
      }
    };

    if (!clientId || clientId.startsWith('182246867443')) {
      loadConfig();
    }
    return () => {
      isMounted = false;
    };
  }, [clientId, envClientId]);

  // Check for Google Identity Services script
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let attempts = 0;

    const checkGsi = () => {
      if (window.google?.accounts?.id) {
        setIsGsiReady(true);
        if (interval) clearInterval(interval);
      } else {
        attempts++;
        if (attempts > 30 && interval) {
          clearInterval(interval);
        }
      }
    };

    checkGsi();
    if (!window.google?.accounts?.id) {
      interval = setInterval(checkGsi, 300);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // Initialize GIS if client ID is present
  useEffect(() => {
    if (!isGsiReady || !clientId) return;

    try {
      window.google!.accounts!.id!.initialize({
        client_id: clientId,
        callback: async (response: { credential?: string }) => {
          if (!response || !response.credential) return;
          setIsLoading(true);
          try {
            await onSuccessRef.current(response.credential);
            toastSuccess('Đăng nhập Google thành công!');
          } catch (err: any) {
            const msg = err.message || 'Xác thực tài khoản Google thất bại.';
            onErrorRef.current?.(msg);
            toastErrorRef.current(msg);
          } finally {
            setIsLoading(false);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true
      });
    } catch (err) {
      console.warn('[Google GIS Initialize Error]:', err);
    }
  }, [isGsiReady, clientId, toastSuccess]);

  // Primary interactive handler: Direct Google Sign-In via Firebase Auth Popup + GIS fallback
  const handleDirectGoogleLogin = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // 1. Firebase Auth Google Provider with popup
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      const userCredential = await signInWithPopup(auth, provider);
      const idToken = await userCredential.user.getIdToken();
      const profile = {
        email: userCredential.user.email,
        name: userCredential.user.displayName,
        picture: userCredential.user.photoURL,
        sub: userCredential.user.uid
      };

      await onSuccessRef.current(idToken, profile);
      toastSuccess('Đăng nhập Google thành công!');
      return;
    } catch (firebaseErr: any) {
      console.warn('[Firebase Google Sign-In]:', firebaseErr?.code, firebaseErr?.message);

      // User closed popup deliberately
      if (firebaseErr?.code === 'auth/popup-closed-by-user') {
        setIsLoading(false);
        return;
      }

      // 2. Fallback to GIS Prompt if initialized
      if (window.google?.accounts?.id && clientId) {
        try {
          window.google.accounts.id.prompt();
          setIsLoading(false);
          return;
        } catch (gsiErr) {
          console.warn('[GIS Prompt Fallback Error]:', gsiErr);
        }
      }

      // Handle specific error codes
      let errMsg = 'Xác thực Google không thành công. Vui lòng thử lại.';
      if (firebaseErr?.code === 'auth/popup-blocked') {
        errMsg = 'Trình duyệt đang chặn cửa sổ bật lên (popup). Vui lòng cho phép popup để chọn tài khoản Google.';
      } else if (firebaseErr?.message) {
        errMsg = firebaseErr.message;
      }

      onErrorRef.current?.(errMsg);
      toastErrorRef.current(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <button
        type="button"
        disabled={isLoading}
        onClick={handleDirectGoogleLogin}
        id="btn-google-sign-in"
        className="w-full h-[46px] px-4 rounded-xl border border-slate-300/90 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-medium text-sm flex items-center justify-center gap-3 transition-all duration-150 shadow-xs hover:shadow-sm cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        ) : (
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
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
        )}
        <span className="truncate">
          {isLoading ? 'Đang kết nối tài khoản Google...' : label}
        </span>
      </button>

      {/* Hidden container for GIS button fallback if desired */}
      <div ref={containerRef} className="hidden" aria-hidden="true" />
    </div>
  );
};
