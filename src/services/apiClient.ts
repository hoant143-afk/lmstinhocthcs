// Centralized Google Apps Script Web App API Client

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

const APPS_SCRIPT_URL_STORAGE_KEY = 'sb_lms_appsscript_url_v1';
const DATA_PROVIDER_STORAGE_KEY = 'sb_lms_data_provider_v1'; // 'appsScript' | 'localStorage'

// In-memory cache for fast access
let cachedApiUrl: string = '';
let isConfigLoadedFromServer = false;

export const apiClient = {
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
      // Broadcast to server so all student devices and incognito tabs share this config
      fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appsScriptUrl: cleanUrl, dataProvider: 'appsScript' })
      }).catch(() => {});
    } else {
      localStorage.removeItem(APPS_SCRIPT_URL_STORAGE_KEY);
      localStorage.setItem(DATA_PROVIDER_STORAGE_KEY, 'localStorage');
      fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appsScriptUrl: '', dataProvider: 'localStorage' })
      }).catch(() => {});
    }
  },

  getDataProvider(): 'appsScript' | 'localStorage' {
    const url = this.getApiUrl();
    if (!url) return 'localStorage';
    const provider = localStorage.getItem(DATA_PROVIDER_STORAGE_KEY);
    return provider === 'appsScript' ? 'appsScript' : 'appsScript';
  },

  setDataProvider(provider: 'appsScript' | 'localStorage'): void {
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
   * Google Apps Script Web App handles CORS via redirects and JSON responses
   */
  async request<T = any>(action: string, data: any = {}): Promise<ApiResponse<T>> {
    let url = this.getApiUrl();
    
    // If not configured locally, try one quick sync from server
    if (!url) {
      url = await this.syncConfigFromServer();
    }

    if (!url) {
      return {
        success: false,
        error: 'Chưa cấu hình Google Apps Script Web App URL (/exec).'
      };
    }

    try {
      const payload = JSON.stringify({
        action,
        data,
        clientTimestamp: new Date().toISOString()
      });

      // Google Apps Script doPost receives text/plain to avoid CORS preflight OPTIONS block
      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: payload
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const resJson: ApiResponse<T> = await response.json();
      return resJson;
    } catch (err: any) {
      console.error(`API call failed for action [${action}]:`, err);
      return {
        success: false,
        error: err.message || 'Không thể kết nối đến Google Sheet API. Vui lòng kiểm tra lại URL Web App.'
      };
    }
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
  }
};

