// Centralized Google Apps Script Web App API Client

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  message?: string;
  timestamp?: string;
  httpStatus?: number;
  contentType?: string;
}

export interface DiagnosticInfo {
  isConfigured: boolean;
  rawUrl: string;
  maskedEndpoint: string;
  action: string;
  httpStatus: number | null;
  contentType: string | null;
  isJson: boolean;
  success: boolean | null;
  errorCode: string | null;
  errorMessage: string | null;
  responseSnippet: string;
  timestamp: string;
}

export const ERROR_MESSAGES: Record<string, string> = {
  EMAIL_EXISTS: 'Email này đã được đăng ký.',
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không chính xác.',
  SESSION_EXPIRED: 'Phiên đăng nhập đã hết hạn.',
  CLASS_NOT_FOUND: 'Không tìm thấy lớp học với mã này.',
  ALREADY_ENROLLED: 'Bạn đã tham gia lớp học này.',
  CLASS_JOIN_DISABLED: 'Lớp học hiện chưa cho phép tham gia.',
  API_UNREACHABLE: 'Không thể kết nối máy chủ.',
  API_NOT_CONFIGURED: 'Website chưa được cấu hình máy chủ dữ liệu.',
  UNAUTHORIZED_DEPLOYMENT: 'Máy chủ hiện chưa cho phép thiết bị này truy cập.',
  DATABASE_ERROR: 'Có lỗi khi truy cập cơ sở dữ liệu.'
};

export function mapErrorCodeToMessage(code: string | undefined, defaultMsg?: string): string {
  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }
  return defaultMsg || 'Đã có lỗi xảy ra.';
}

const APPS_SCRIPT_URL_STORAGE_KEY = 'sb_lms_appsscript_url_v1';
const DATA_PROVIDER_STORAGE_KEY = 'sb_lms_data_provider_v1'; // 'appsScript' | 'localStorage'

// In-memory cache for fast access
let cachedApiUrl: string = '';
let isConfigLoadedFromServer = false;

// Global diagnostic state for UI inspecting
let currentDiagnostic: DiagnosticInfo = {
  isConfigured: false,
  rawUrl: '',
  maskedEndpoint: 'Chưa cấu hình',
  action: 'none',
  httpStatus: null,
  contentType: null,
  isJson: false,
  success: null,
  errorCode: null,
  errorMessage: null,
  responseSnippet: '',
  timestamp: new Date().toISOString()
};

const diagnosticListeners: Array<(info: DiagnosticInfo) => void> = [];

function maskUrl(url: string): string {
  if (!url) return 'Chưa cấu hình';
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1] || '';
    const execPart = pathParts.includes('exec') ? '/exec' : (pathParts.includes('dev') ? '/dev' : '');
    const idSnippet = url.length > 20 ? `...${url.slice(-8)}` : '';
    return `${parsed.host}${execPart} (${idSnippet})`;
  } catch {
    return url.length > 15 ? `${url.substring(0, 15)}...` : url;
  }
}

function updateDiagnostic(info: Partial<DiagnosticInfo>) {
  currentDiagnostic = {
    ...currentDiagnostic,
    ...info,
    timestamp: new Date().toISOString()
  };
  diagnosticListeners.forEach(listener => {
    try {
      listener(currentDiagnostic);
    } catch (e) {
      console.warn('[apiClient] Diagnostic listener error:', e);
    }
  });
}

export const apiClient = {
  subscribeDiagnostics(callback: (info: DiagnosticInfo) => void): () => void {
    diagnosticListeners.push(callback);
    callback(currentDiagnostic);
    return () => {
      const idx = diagnosticListeners.indexOf(callback);
      if (idx >= 0) diagnosticListeners.splice(idx, 1);
    };
  },

  getDiagnosticInfo(): DiagnosticInfo {
    const url = this.getApiUrl();
    currentDiagnostic.isConfigured = this.isAppsScriptConfigured();
    currentDiagnostic.rawUrl = url;
    currentDiagnostic.maskedEndpoint = maskUrl(url);
    return { ...currentDiagnostic };
  },

  getApiUrl(): string {
    // 1. Check in-memory cache
    if (cachedApiUrl && cachedApiUrl.trim()) {
      return cachedApiUrl.trim();
    }

    // 2. Check local storage
    const customUrl = localStorage.getItem(APPS_SCRIPT_URL_STORAGE_KEY);
    if (customUrl && customUrl.trim()) {
      cachedApiUrl = customUrl.trim();
      return cachedApiUrl;
    }

    // 3. Fallback to env variable if set
    const envUrl = ((import.meta as any).env?.VITE_APPS_SCRIPT_API_URL as string) ||
                   ((import.meta as any).env?.VITE_APPS_SCRIPT_URL as string) || '';
    if (envUrl && envUrl.trim()) {
      cachedApiUrl = envUrl.trim();
      return cachedApiUrl;
    }

    // 4. Trigger background fetch from server config if not yet loaded
    if (!isConfigLoadedFromServer) {
      isConfigLoadedFromServer = true;
      this.syncConfigFromServer().catch(() => {});
    }

    return '';
  },

  async syncConfigFromServer(): Promise<string> {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const config = await res.json();
        if (config?.appsScriptUrl && config.appsScriptUrl.trim()) {
          const url = config.appsScriptUrl.trim();
          cachedApiUrl = url;
          localStorage.setItem(APPS_SCRIPT_URL_STORAGE_KEY, url);
          if (config.dataProvider) {
            localStorage.setItem(DATA_PROVIDER_STORAGE_KEY, config.dataProvider);
          }
          updateDiagnostic({
            isConfigured: true,
            rawUrl: url,
            maskedEndpoint: maskUrl(url)
          });
          return url;
        }
      }
    } catch {
      // Ignored
    }
    return '';
  },

  setApiUrl(url: string): void {
    const cleanUrl = (url || '').trim();
    cachedApiUrl = cleanUrl;
    if (cleanUrl) {
      localStorage.setItem(APPS_SCRIPT_URL_STORAGE_KEY, cleanUrl);
      localStorage.setItem(DATA_PROVIDER_STORAGE_KEY, 'appsScript');
      updateDiagnostic({
        isConfigured: true,
        rawUrl: cleanUrl,
        maskedEndpoint: maskUrl(cleanUrl)
      });
      // Broadcast to server so all student devices and incognito tabs share this config
      fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appsScriptUrl: cleanUrl, dataProvider: 'appsScript' })
      }).catch(() => {});
    } else {
      localStorage.removeItem(APPS_SCRIPT_URL_STORAGE_KEY);
      localStorage.setItem(DATA_PROVIDER_STORAGE_KEY, 'localStorage');
      updateDiagnostic({
        isConfigured: false,
        rawUrl: '',
        maskedEndpoint: 'Chưa cấu hình'
      });
      fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appsScriptUrl: '', dataProvider: 'localStorage' })
      }).catch(() => {});
    }
  },

  getAppsScriptUrl(): string {
    return this.getApiUrl();
  },

  setAppsScriptUrl(url: string): void {
    this.setApiUrl(url);
  },

  getDataProvider(): 'appsScript' | 'firestore' {
    const url = this.getApiUrl();
    if (!url) return 'firestore';
    const provider = localStorage.getItem(DATA_PROVIDER_STORAGE_KEY);
    return provider === 'appsScript' ? 'appsScript' : 'firestore';
  },

  setDataProvider(provider: 'appsScript' | 'firestore'): void {
    localStorage.setItem(DATA_PROVIDER_STORAGE_KEY, provider);
    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataProvider: provider })
    }).catch(() => {});
  },

  isAppsScriptConfigured(): boolean {
    const url = this.getApiUrl();
    return Boolean(url && (url.startsWith('https://script.google.com/macros/s/') || url.includes('/exec')));
  },

  /**
   * Sends a POST request to Google Apps Script /exec
   * Avoids CORS preflight by using Content-Type: text/plain;charset=utf-8
   */
  async request<T = any>(action: string, data: any = {}): Promise<ApiResponse<T>> {
    let url = this.getApiUrl();
    
    // If not configured locally, try one quick sync from server
    if (!url) {
      url = await this.syncConfigFromServer();
    }

    if (!url) {
      const errInfo: ApiResponse<T> = {
        success: false,
        errorCode: 'API_NOT_CONFIGURED',
        error: ERROR_MESSAGES.API_NOT_CONFIGURED,
        message: 'Website chưa được cấu hình máy chủ dữ liệu Google Apps Script Web App.'
      };
      updateDiagnostic({
        isConfigured: false,
        action,
        httpStatus: null,
        contentType: null,
        isJson: false,
        success: false,
        errorCode: 'API_NOT_CONFIGURED',
        errorMessage: errInfo.error,
        responseSnippet: 'No URL configured'
      });
      return errInfo;
    }

    updateDiagnostic({
      isConfigured: true,
      rawUrl: url,
      maskedEndpoint: maskUrl(url),
      action,
      success: null,
      errorCode: null,
      errorMessage: null,
      responseSnippet: 'Đang gửi yêu cầu...'
    });

    try {
      const payload = JSON.stringify({
        action,
        data,
        clientTimestamp: new Date().toISOString()
      });

      // Google Apps Script doPost receives text/plain to avoid CORS preflight OPTIONS block
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: payload
      });
      clearTimeout(timeoutId);

      const httpStatus = response.status;
      const contentType = response.headers.get('content-type') || 'unknown';
      const rawText = await response.text();
      const snippet = rawText.length > 200 ? `${rawText.substring(0, 200)}...` : rawText;

      // Detect Google Accounts login screen / permission restriction (HTML response)
      if (
        rawText.includes('accounts.google.com') ||
        rawText.includes('ServiceLogin') ||
        rawText.includes('Sign in - Google Accounts') ||
        rawText.trim().startsWith('<!DOCTYPE html') ||
        rawText.trim().startsWith('<html')
      ) {
        const errorMsg = 'Máy chủ Google Apps Script chưa được mở quyền truy cập công khai (Cần cấu hình Execute as: Me, Who has access: Anyone).';
        updateDiagnostic({
          action,
          httpStatus,
          contentType,
          isJson: false,
          success: false,
          errorCode: 'UNAUTHORIZED_DEPLOYMENT',
          errorMessage: errorMsg,
          responseSnippet: snippet
        });
        return {
          success: false,
          httpStatus,
          contentType,
          errorCode: 'UNAUTHORIZED_DEPLOYMENT',
          error: ERROR_MESSAGES.UNAUTHORIZED_DEPLOYMENT,
          message: errorMsg
        };
      }

      if (!response.ok) {
        const errCode = 'HTTP_ERROR';
        updateDiagnostic({
          action,
          httpStatus,
          contentType,
          isJson: false,
          success: false,
          errorCode: errCode,
          errorMessage: `HTTP error! status: ${response.status}`,
          responseSnippet: snippet
        });
        if (action === 'students.join' || process.env.NODE_ENV !== 'production') {
          console.log('[apiClient:Instrument]', {
            action,
            targetHost: new URL(url).host,
            httpStatus,
            redirected: response.redirected,
            contentType,
            responsePreview: snippet.slice(0, 100),
            parsedErrorCode: errCode
          });
        }
        return {
          success: false,
          httpStatus,
          contentType,
          errorCode: errCode,
          error: `Máy chủ trả về mã HTTP ${response.status}`
        };
      }

      let resJson: ApiResponse<T>;
      try {
        resJson = JSON.parse(rawText);
      } catch (parseErr) {
        const errCode = 'NON_JSON_RESPONSE';
        updateDiagnostic({
          action,
          httpStatus,
          contentType,
          isJson: false,
          success: false,
          errorCode: errCode,
          errorMessage: 'Phản hồi từ máy chủ không phải là JSON hợp lệ.',
          responseSnippet: snippet
        });
        if (action === 'students.join' || process.env.NODE_ENV !== 'production') {
          console.log('[apiClient:Instrument]', {
            action,
            targetHost: new URL(url).host,
            httpStatus,
            redirected: response.redirected,
            contentType,
            responsePreview: snippet.slice(0, 100),
            parsedErrorCode: errCode
          });
        }
        return {
          success: false,
          httpStatus,
          contentType,
          errorCode: errCode,
          error: ERROR_MESSAGES.API_UNREACHABLE,
          message: 'Phản hồi từ máy chủ không phải là JSON hợp lệ.'
        };
      }

      // Check if backend returned an error
      if (!resJson.success) {
        let mappedCode = resJson.errorCode;
        const rawError = resJson.error || '';

        if (!mappedCode) {
          if (rawError.includes('CLASS_NOT_FOUND') || rawError.toLowerCase().includes('không tìm thấy lớp')) {
            mappedCode = 'CLASS_NOT_FOUND';
          } else if (rawError.includes('CLASS_JOIN_DISABLED') || rawError.toLowerCase().includes('khóa tham gia')) {
            mappedCode = 'CLASS_JOIN_DISABLED';
          } else if (rawError.includes('DATABASE_ERROR') || rawError.toLowerCase().includes('chưa được khởi tạo')) {
            mappedCode = 'DATABASE_ERROR';
          }
        }

        const finalCode = mappedCode || 'API_ERROR';
        const friendlyMsg = mappedCode && ERROR_MESSAGES[mappedCode] ? ERROR_MESSAGES[mappedCode] : (rawError || 'Thao tác thất bại.');

        updateDiagnostic({
          action,
          httpStatus,
          contentType,
          isJson: true,
          success: false,
          errorCode: finalCode,
          errorMessage: friendlyMsg,
          responseSnippet: snippet
        });

        if (action === 'students.join' || process.env.NODE_ENV !== 'production') {
          console.log('[apiClient:Instrument]', {
            action,
            targetHost: new URL(url).host,
            httpStatus,
            redirected: response.redirected,
            contentType,
            responsePreview: snippet.slice(0, 100),
            parsedErrorCode: finalCode
          });
        }

        return {
          ...resJson,
          httpStatus,
          contentType,
          errorCode: finalCode,
          error: friendlyMsg
        };
      }

      // Success
      updateDiagnostic({
        action,
        httpStatus,
        contentType,
        isJson: true,
        success: true,
        errorCode: null,
        errorMessage: null,
        responseSnippet: snippet
      });

      if (action === 'students.join' || process.env.NODE_ENV !== 'production') {
        console.log('[apiClient:Instrument]', {
          action,
          targetHost: new URL(url).host,
          httpStatus,
          redirected: response.redirected,
          contentType,
          responsePreview: snippet.slice(0, 100),
          parsedErrorCode: null
        });
      }

      return {
        ...resJson,
        httpStatus,
        contentType
      };
    } catch (err: any) {
      console.error(`API call failed for action [${action}]:`, err);
      const isNetworkError = err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.name === 'TypeError';
      const errCode = isNetworkError ? 'NETWORK_ERROR' : 'API_ERROR';
      const friendlyMsg = isNetworkError ? ERROR_MESSAGES.API_UNREACHABLE : (err.message || 'Lỗi kết nối máy chủ.');

      updateDiagnostic({
        action,
        httpStatus: null,
        contentType: null,
        isJson: false,
        success: false,
        errorCode: errCode,
        errorMessage: friendlyMsg,
        responseSnippet: err.message
      });

      if (action === 'students.join' || process.env.NODE_ENV !== 'production') {
        console.log('[apiClient:Instrument]', {
          action,
          targetHost: url ? (function() { try { return new URL(url).host; } catch { return 'unknown'; } })() : 'none',
          httpStatus: null,
          redirected: false,
          contentType: 'none',
          responsePreview: err.message || '',
          parsedErrorCode: errCode
        });
      }

      return {
        success: false,
        errorCode: errCode,
        error: friendlyMsg,
        message: err.message
      };
    }
  },

  /**
   * Health Check: calls system.health (supports both GET and POST)
   */
  async checkHealth(): Promise<{ ok: boolean; statusText?: string; data?: any; error?: string; errorCode?: string }> {
    const url = this.getApiUrl();
    if (!url) {
      const serverRes = await fetch('/api/system/health').catch(() => null);
      if (serverRes && serverRes.ok) {
        const data = await serverRes.json();
        return { ok: true, statusText: 'Máy chủ Node.js cục bộ hoạt động bình thường', data: data.data };
      }
      return { ok: false, error: ERROR_MESSAGES.API_NOT_CONFIGURED, errorCode: 'API_NOT_CONFIGURED' };
    }

    // Try GET first to test direct browser URL accessibility
    try {
      const getUrl = url.includes('?') ? `${url}&action=system.health` : `${url}?action=system.health`;
      const response = await fetch(getUrl, { mode: 'cors', redirect: 'follow' });
      const rawText = await response.text();
      
      if (rawText.includes('accounts.google.com') || rawText.includes('<html')) {
        updateDiagnostic({
          action: 'system.health',
          httpStatus: response.status,
          contentType: response.headers.get('content-type'),
          isJson: false,
          success: false,
          errorCode: 'UNAUTHORIZED_DEPLOYMENT',
          errorMessage: 'Yêu cầu đăng nhập Google (Cần mở quyền "Anyone")',
          responseSnippet: rawText.substring(0, 150)
        });
        return {
          ok: false,
          errorCode: 'UNAUTHORIZED_DEPLOYMENT',
          error: 'Apps Script chưa được cấp quyền công khai (Who has access: Anyone).'
        };
      }

      if (response.ok) {
        const json = JSON.parse(rawText);
        if (json.status === 'ok' || json.data?.status === 'ok' || json.success) {
          updateDiagnostic({
            action: 'system.health',
            httpStatus: response.status,
            contentType: response.headers.get('content-type'),
            isJson: true,
            success: true,
            errorCode: null,
            errorMessage: null,
            responseSnippet: rawText.substring(0, 150)
          });
          return { ok: true, statusText: 'Google Apps Script Web App kết nối hoàn hảo!', data: json.data || json };
        }
      }
    } catch {
      // Fallback to POST
    }

    const postRes = await this.request('system.health', {});
    if (postRes.success) {
      return { ok: true, statusText: 'Google Apps Script Web App hoạt động tốt!', data: postRes.data };
    }

    return {
      ok: false,
      errorCode: postRes.errorCode || 'API_UNREACHABLE',
      error: postRes.error || ERROR_MESSAGES.API_UNREACHABLE
    };
  },

  async ping(): Promise<{ ok: boolean; message?: string; time?: string }> {
    const res = await this.request('system.ping', {});
    if (res.success && res.data) {
      return { ok: true, message: res.data.message || 'Kết nối thành công', time: res.data.time };
    }
    return { ok: false, message: res.error || 'Kết nối thất bại' };
  },

  async studentJoinClass(fullName: string, classCode: string): Promise<ApiResponse<any>> {
    return this.request('students.join', {
      fullName: (fullName || '').trim(),
      classCode: (classCode || '').trim().toUpperCase()
    });
  },

  async setupDatabase(): Promise<ApiResponse> {
    return this.request('system.setupDatabase', {});
  },

  async seedDemoData(): Promise<ApiResponse> {
    return this.request('system.seedDemoData', {});
  },

  async validateDatabase(): Promise<ApiResponse> {
    return this.request('system.validateDatabase', {});
  },

  /**
   * Generic POST method for server API routes (e.g. /api/student-auth/*, /api/student/*)
   */
  async post<T = any>(endpoint: string, data: any = {}, customHeaders: Record<string, string> = {}): Promise<T> {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...customHeaders
      },
      body: JSON.stringify(data)
    });

    const json = await res.json();
    return json as T;
  }
};


