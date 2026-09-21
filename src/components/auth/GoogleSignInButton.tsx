import React, { useEffect, useRef, useState } from 'react';
import { Globe, Loader2, Settings, AlertCircle, CheckCircle2, Copy, Check, ExternalLink, ChevronDown, ChevronUp, ShieldCheck, RefreshCw } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import firebaseConfigData from '../../../firebase-applet-config.json';

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
  const envClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  const defaultAppletClientId = (firebaseConfigData as any)?.oAuthClientId || '';

  const [clientId, setClientId] = useState<string>(() => {
    const saved = (localStorage.getItem('sblms_google_client_id') || '').trim();
    if (saved && saved.startsWith('182246867443')) {
      // Purge obsolete dummy ID from cache
      localStorage.removeItem('sblms_google_client_id');
      return envClientId || defaultAppletClientId;
    }
    return envClientId || saved || defaultAppletClientId;
  });
  const [copiedClientId, setCopiedClientId] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGsiReady, setIsGsiReady] = useState<boolean>(false);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [inputClientId, setInputClientId] = useState<string>('');
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [copiedOrigin, setCopiedOrigin] = useState<boolean>(false);
  const [showDebugGuide, setShowDebugGuide] = useState<boolean>(true);

  const { toastSuccess, toastError, toastInfo } = useToast();

  const label = buttonText || (role === 'teacher' ? 'Đăng nhập bằng Google' : 'Tiếp tục với Google');

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  // 1. Output Current Origin to console immediately
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log("CURRENT ORIGIN:", window.location.origin);
      console.log("[Google Auth Debug]", {
        configured: Boolean(clientId),
        currentOrigin: window.location.origin,
        activeClientId: clientId,
        sdkReady: Boolean(window.google?.accounts?.id)
      });
    }
  }, [clientId]);

  // 2. Fetch server config if client ID is not present in env
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

  // 3. Poll/wait for Google Identity Services script
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

  // 4. Render Google Sign-In button using GIS SDK
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

      const containerWidth = containerRef.current.offsetWidth || 340;
      const targetWidth = Math.min(380, Math.max(240, containerWidth));

      window.google!.accounts!.id!.renderButton(containerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: role === 'student' ? 'continue_with' : 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: targetWidth,
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

  const handleCopyOrigin = () => {
    if (!currentOrigin) return;
    navigator.clipboard.writeText(currentOrigin);
    setCopiedOrigin(true);
    toastSuccess(`Đã sao chép Origin: ${currentOrigin}`);
    setTimeout(() => setCopiedOrigin(false), 2500);
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

  const handleCopyClientId = () => {
    if (!clientId) return;
    navigator.clipboard.writeText(clientId);
    setCopiedClientId(true);
    toastSuccess('Đã sao chép Client ID!');
    setTimeout(() => setCopiedClientId(false), 2500);
  };

  const handleResetClient = () => {
    localStorage.removeItem('sblms_google_client_id');
    const fallback = envClientId || defaultAppletClientId;
    setClientId(fallback);
    toastInfo('Đã xóa bộ nhớ đệm. Đang tải Client ID của hệ thống.');
  };

  const isInvalidOldId = clientId.startsWith('182246867443');

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

      {/* Origin Diagnostic & Error 400: origin_mismatch Guide Panel */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-600 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Google OAuth Status &amp; Origin</span>
          </div>
          <button
            type="button"
            onClick={() => setShowDebugGuide(!showDebugGuide)}
            className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-medium transition cursor-pointer"
          >
            <span>{showDebugGuide ? 'Thu gọn' : 'Xem chi tiết'}</span>
            {showDebugGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 bg-white p-2 rounded-lg border border-slate-200">
            <span className="text-slate-500">Google Client:</span>
            <span className={`font-semibold ${clientId ? 'text-emerald-600' : 'text-amber-600'}`}>
              {clientId ? 'true (Đã nạp)' : 'false (Chưa có)'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-white p-2 rounded-lg border border-slate-200">
            <span className="text-slate-500">Google SDK:</span>
            <span className={`font-semibold ${isGsiReady ? 'text-emerald-600' : 'text-slate-500'}`}>
              {isGsiReady ? 'Sẵn sàng' : 'Đang nạp...'}
            </span>
          </div>
        </div>

        {/* Current Origin with 1-Click Copy */}
        <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium text-[11px]">Current Origin:</span>
            <button
              type="button"
              onClick={handleCopyOrigin}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold transition cursor-pointer"
            >
              {copiedOrigin ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700">Đã sao chép!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-blue-600" />
                  <span>Sao chép Origin</span>
                </>
              )}
            </button>
          </div>
          <div className="font-mono text-xs text-slate-800 break-all bg-slate-50 px-2 py-1.5 rounded border border-slate-200 select-all">
            {currentOrigin || 'Đang xác định...'}
          </div>
        </div>

        {/* Active Client ID */}
        <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium text-[11px]">Active Client ID:</span>
              {isInvalidOldId && (
                <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                  ID cũ không hợp lệ
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyClientId}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition cursor-pointer"
                title="Sao chép Client ID"
              >
                {copiedClientId ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700 text-[10px]">Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px]">Chép ID</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputClientId(clientId);
                  setShowConfigModal(true);
                }}
                className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold transition cursor-pointer"
              >
                Đổi ID
              </button>
              <button
                type="button"
                onClick={handleResetClient}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                title="Xóa cache & Khôi phục mặc định"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className={`font-mono text-[11px] break-all px-2 py-1.5 rounded border select-all ${
            isInvalidOldId
              ? 'bg-red-50 text-red-800 border-red-200 font-semibold'
              : 'bg-slate-50 text-slate-800 border-slate-200'
          }`}>
            {clientId || 'Chưa cấu hình Client ID'}
          </div>
          {isInvalidOldId && (
            <p className="text-[10px] text-red-600 font-medium">
              ⚠️ Đây là Client ID mẫu cũ (18224686...). Bạn hãy bấm nút <strong>"Đổi ID"</strong> ở trên và dán Client ID mới tạo từ Google Cloud Console để không bị lỗi 401.
            </p>
          )}
        </div>

        {/* Step-by-step fix guide for Error 401 & Error 400 */}
        {showDebugGuide && (
          <div className="space-y-2.5">
            {/* Error 401 Guide */}
            <div className="p-3 bg-red-50/90 rounded-lg border border-red-200 text-red-950 space-y-2 text-[11px]">
              <div className="flex items-center gap-1.5 font-bold text-red-800">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                <span>Cách sửa lỗi "Error 401: invalid_client - The OAuth client was not found":</span>
              </div>
              <p className="text-slate-700 leading-relaxed">
                Lỗi này xuất hiện khi Google <strong>không tìm thấy Client ID</strong> này trong hệ thống Google Cloud (Client ID bị xóa, chưa tạo, hoặc gõ sai trên Vercel).
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-700 pl-0.5">
                <li>
                  Vào <strong>Google Cloud Console</strong> (<span className="text-blue-700 font-semibold">hoant143@fpt.edu.vn</span>) &rarr; <strong>APIs &amp; Services</strong> &rarr; <strong>Credentials</strong>.
                </li>
                <li>
                  Bấm <strong>+ CREATE CREDENTIALS</strong> &rarr; chọn <strong>OAuth client ID</strong>.
                </li>
                <li>
                  Application type: chọn <strong>Web application</strong> (Bắt buộc).
                </li>
                <li>
                  Mục <strong>Authorized JavaScript origins</strong>: Thêm cả domain Vercel và local:
                  <div className="my-1 space-y-1 font-mono text-[10px] pl-4">
                    <div className="text-slate-800 bg-white p-1 rounded border border-slate-200">{currentOrigin || 'https://smart-blended-lms.vercel.app'}</div>
                    <div className="text-slate-600 bg-white p-1 rounded border border-slate-200">http://localhost:3000</div>
                  </div>
                </li>
                <li>
                  Bấm <strong>CREATE</strong>, sau đó <strong>Copy Client ID</strong> (dạng <code>...apps.googleusercontent.com</code>).
                </li>
                <li>
                  <strong>Trên Vercel:</strong> Vào <strong>Project Settings &rarr; Environment Variables</strong> &rarr; Thêm:
                  <div className="my-1 bg-slate-900 text-emerald-400 font-mono p-1.5 rounded text-[10px]">
                    VITE_GOOGLE_CLIENT_ID = [Dán Client ID của bạn vào đây]
                  </div>
                  Sau đó bấm <strong>Redeploy</strong> dự án trên Vercel.
                </li>
                <li>
                  <strong>Tại đây:</strong> Bạn cũng có thể bấm nút <strong>"Đổi"</strong> ở trên và dán Client ID mới vào để kích hoạt ngay lập tức.
                </li>
              </ol>
            </div>

            {/* Error 400 Guide */}
            <div className="p-3 bg-amber-50/80 rounded-lg border border-amber-200 text-amber-900 space-y-2 text-[11px]">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <span>Nếu gặp "Error 400: origin_mismatch":</span>
              </div>
              <p className="text-slate-700">
                Thêm chính xác Origin <code className="bg-amber-100 font-mono px-1 py-0.5 rounded font-bold text-amber-900">{currentOrigin}</code> vào mục <strong>Authorized JavaScript origins</strong> của Client ID đó trên Google Cloud Console.
              </p>
            </div>

            <div className="pt-0.5">
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-800 font-semibold underline text-xs"
              >
                <span>Mở Google Cloud Console Credentials</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Setup Google Client ID if missing or editing */}
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
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
                  {isSavingConfig ? 'Đang lưu...' : 'Lưu Google Client ID'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
