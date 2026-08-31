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

export const apiClient = {
  getApiUrl(): string {
    const customUrl = localStorage.getItem(APPS_SCRIPT_URL_STORAGE_KEY);
    if (customUrl && customUrl.trim()) {
      return customUrl.trim();
    }
    // Fallback to env variable if set
    return ((import.meta as any).env?.VITE_APPS_SCRIPT_URL as string) || '';
  },

  setApiUrl(url: string): void {
    if (url && url.trim()) {
      localStorage.setItem(APPS_SCRIPT_URL_STORAGE_KEY, url.trim());
      localStorage.setItem(DATA_PROVIDER_STORAGE_KEY, 'appsScript');
    } else {
      localStorage.removeItem(APPS_SCRIPT_URL_STORAGE_KEY);
      localStorage.setItem(DATA_PROVIDER_STORAGE_KEY, 'localStorage');
    }
  },

  getDataProvider(): 'appsScript' | 'localStorage' {
    const url = this.getApiUrl();
    if (!url) return 'localStorage';
    const provider = localStorage.getItem(DATA_PROVIDER_STORAGE_KEY);
    return provider === 'appsScript' ? 'appsScript' : 'localStorage';
  },

  setDataProvider(provider: 'appsScript' | 'localStorage'): void {
    localStorage.setItem(DATA_PROVIDER_STORAGE_KEY, provider);
  },

  isAppsScriptConfigured(): boolean {
    const url = this.getApiUrl();
    return Boolean(url && url.startsWith('https://script.google.com/macros/s/'));
  },

  /**
   * Sends a POST request to Google Apps Script /exec
   * Google Apps Script Web App handles CORS via redirects and JSON responses
   */
  async request<T = any>(action: string, data: any = {}): Promise<ApiResponse<T>> {
    const url = this.getApiUrl();
    if (!url) {
      return {
        success: false,
        error: 'Chưa cấu hình Google Apps Script Web App URL.'
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
