import React, { useEffect, useRef, useState } from 'react';
import { Globe, Loader2, Settings, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface GoogleSignInButtonProps {
  role: 'teacher' | 'student';
  buttonText?: string;
  onSuccess: (credential: string) => Promise<void> | void;
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
  const [clientId, setClientId] = useState<string>(() => {
    return (import.meta.env.VITE_GOOGLE_CLIENT_ID || localStorage.getItem('sblms_google_client_id') || '').trim();
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGsiReady, setIsGsiReady] = useState<boolean>(false);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [inputClientId, setInputClientId] = useState<string>('');
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);

  const { toastSuccess, toastError, toastInfo } = useToast();

  const label = buttonText || (role === 'teacher' ? 'Đăng nhập bằng Google' : 'Tiếp tục với Google');

  // 1. Fetch server config if client ID is not present
  useEffect(() => {
    let isMounted = true;
    const loadConfig = async () => {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          if (data.googleClientId && isMounted) {
            setClientId(data.googleClientId.trim());
          }
        }
      } catch (err) {
        console.warn('[GoogleAuth] Failed to load server config:', err);
      }
    };

    if (!clientId) {
      loadConfig();
    }
    return () => {
      isMounted = false;
    };
  }, [clientId]);

  // 2. Poll/wait for Google Identity Services script
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let attempts = 0;

    const checkGsi = () => {
      if (window.google?.accounts?.id) {
        setIsGsiReady(true);
        if (interval) clearInterval(interval);
      } else {
        attempts++;
        if (attempts > 40 && interval) {
          clearInterval(interval);
        }
      }
    };

    checkGsi();
    if (!window.google?.accounts?.id) {
      interval = setInterval(checkGsi, 250);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // 3. Render Google Sign-In button using GIS SDK
  useEffect(() => {
    if (!isGsiReady || !clientId || !containerRef.current) {
      return;
    }

    try {
      window.google!.accounts!.id!.initialize({
        client_id: clientId,
        callback: async (response: { credential?: string }) => {
          if (!response || !response.credential) {
            const err = 'Không nhận được mã xác thực (credential) từ Google.';
            onError?.(err);
            toastError(err);
            return;
          }

          setIsLoading(true);
          try {
            await onSuccess(response.credential);
          } catch (err: any) {
            console.error('[Google Sign-In Callback Error]:', err);
            const msg = err.message || 'Xác thực tài khoản Google thất bại.';
            onError?.(msg);
            toastError(msg);
          } finally {
            setIsLoading(false);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true
      });

      // Clear container before rendering
      containerRef.current.innerHTML = '';

      window.google!.accounts!.id!.renderButton(containerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: role === 'student' ? 'continue_with' : 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 380,
        locale: 'vi'
      });
    } catch (err) {
      console.error('[Google Button Render Error]:', err);
    }
  }, [isGsiReady, clientId, role, onSuccess, onError, toastError]);

  const handleManualClick = () => {
    if (!clientId) {
      setShowConfigModal(true);
      return;
    }

    if (!isGsiReady) {
      toastInfo('Đang tải thư viện Google Identity Services. Vui lòng thử lại sau giây lát...');
      return;
    }

    try {
      window.google?.accounts?.id?.prompt();
    } catch (err) {
      console.warn('Google prompt fallback:', err);
    }
  };

  const handleSaveClientId = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = inputClientId.trim();
    if (!cleanId) {
      toastError('Vui lòng nhập Google Client ID.');
      return;
    }

    setIsSavingConfig(true);
    try {
      localStorage.setItem('sblms_google_client_id', cleanId);
      setClientId(cleanId);

      // Persist to server config
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleClientId: cleanId })
      });

      toastSuccess('Đã lưu cấu hình Google Client ID thành công!');
      setShowConfigModal(false);
    } catch (err: any) {
      toastError('Không thể lưu cấu hình Google Client ID.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* If Client ID is ready and GSI loaded, Google's official button renders inside this container */}
      {clientId ? (
        <div className="w-full flex flex-col items-center">
          <div
            ref={containerRef}
            className="w-full flex justify-center min-h-[44px]"
            id="google-signin-btn-container"
          />
          {isLoading && (
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              <span>Đang xác minh bảo mật với Google...</span>
            </div>
          )}
        </div>
      ) : (
        /* When Client ID is not configured yet, show a clean, native button that prompts configuration */
        <button
          type="button"
          onClick={handleManualClick}
          className="w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm flex items-center justify-center gap-3 transition-colors shadow-xs cursor-pointer"
        >
          <Globe className="w-5 h-5 text-blue-600" />
          <span>{label}</span>
        </button>
      )}

      {/* Modal: Setup Google Client ID if missing */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 flex-shrink-0">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Cấu hình Google OAuth Client ID
                </h3>
                <p className="text-xs text-slate-500">
                  Yêu cầu Google OAuth 2.0 Web Client ID để đăng nhập tài khoản thật
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs mb-4 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Hướng dẫn lấy Google Client ID:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-700">
                <li>Vào Google Cloud Console &gt; APIs &amp; Services &gt; Credentials.</li>
                <li>Tạo OAuth 2.0 Client ID (Loại: Web Application).</li>
                <li>Dán Client ID (dạng: <code className="bg-amber-100/80 px-1 py-0.5 rounded text-[11px]">xxx.apps.googleusercontent.com</code>) vào ô bên dưới.</li>
              </ol>
            </div>

            <form onSubmit={handleSaveClientId} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Google Client ID
                </label>
                <input
                  type="text"
                  required
                  value={inputClientId}
                  onChange={(e) => setInputClientId(e.target.value)}
                  placeholder="Ví dụ: 123456789-abcdef.apps.googleusercontent.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isSavingConfig ? 'Đang lưu...' : 'Kích hoạt Google Sign-In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
