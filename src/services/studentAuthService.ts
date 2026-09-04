import { Student, StudentSession, StudentRegisterDto, StudentLoginDto, StudentAuthResponse } from '../types';
import { apiClient, mapErrorCodeToMessage } from './apiClient';

const STUDENT_TOKEN_KEY = 'sblms_student_token';
const STUDENT_SESSION_KEY = 'sb_lms_student_session_v1';

export const studentAuthService = {
  getToken(): string | null {
    return localStorage.getItem(STUDENT_TOKEN_KEY) || null;
  },

  setToken(token: string): void {
    if (token) {
      localStorage.setItem(STUDENT_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(STUDENT_TOKEN_KEY);
    }
  },

  clearSession(): void {
    localStorage.removeItem(STUDENT_TOKEN_KEY);
    localStorage.removeItem(STUDENT_SESSION_KEY);
  },

  getLocalSession(): StudentSession | null {
    try {
      const raw = localStorage.getItem(STUDENT_SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setLocalSession(session: StudentSession): void {
    localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(session));
  },

  async register(dto: StudentRegisterDto): Promise<{
    success: boolean;
    student?: Student;
    token?: string;
    error?: string;
    errorCode?: string;
  }> {
    const fullName = (dto.fullName || '').trim();
    const email = (dto.email || '').trim().toLowerCase();
    const password = dto.password || '';

    if (!fullName) {
      return { success: false, error: 'Vui lòng nhập đầy đủ Họ và tên học sinh.' };
    }
    if (!email) {
      return { success: false, error: 'Vui lòng nhập địa chỉ Email.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Mật khẩu phải có độ dài từ 6 ký tự trở lên.' };
    }

    try {
      // 1. Try local express backend
      const res = await fetch('/api/student-auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errCode = data.errorCode || 'REGISTER_FAILED';
        return {
          success: false,
          errorCode: errCode,
          error: mapErrorCodeToMessage(errCode, data.error || 'Đăng ký tài khoản không thành công.')
        };
      }

      this.setToken(data.token);
      const studentSession: StudentSession = {
        token: data.token,
        studentId: data.student.id,
        fullName: data.student.fullName,
        email: data.student.email,
        avatarUrl: data.student.avatarUrl,
        joinedAt: data.student.createdAt
      };
      this.setLocalSession(studentSession);

      return {
        success: true,
        student: data.student,
        token: data.token
      };
    } catch (netErr: any) {
      // Try Apps Script fallback via apiClient if configured
      try {
        const gasRes = await apiClient.post<{
          success: boolean;
          token: string;
          student: Student;
          errorCode?: string;
          error?: string;
        }>('studentAuth.register', { fullName, email, password });

        if (gasRes.success && gasRes.token) {
          this.setToken(gasRes.token);
          const studentSession: StudentSession = {
            token: gasRes.token,
            studentId: gasRes.student.id,
            fullName: gasRes.student.fullName,
            email: gasRes.student.email,
            avatarUrl: gasRes.student.avatarUrl,
            joinedAt: gasRes.student.createdAt
          };
          this.setLocalSession(studentSession);
          return { success: true, student: gasRes.student, token: gasRes.token };
        }

        return {
          success: false,
          errorCode: gasRes.errorCode || 'REGISTER_FAILED',
          error: mapErrorCodeToMessage(gasRes.errorCode, gasRes.error || 'Không thể đăng ký tài khoản.')
        };
      } catch (err: any) {
        return {
          success: false,
          errorCode: 'NETWORK_ERROR',
          error: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng.'
        };
      }
    }
  },

  async login(dto: StudentLoginDto): Promise<{
    success: boolean;
    student?: Student;
    token?: string;
    error?: string;
    errorCode?: string;
  }> {
    const email = (dto.email || '').trim().toLowerCase();
    const password = dto.password || '';

    if (!email || !password) {
      return {
        success: false,
        errorCode: 'INVALID_CREDENTIALS',
        error: 'Email hoặc mật khẩu không chính xác.'
      };
    }

    try {
      const res = await fetch('/api/student-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errCode = data.errorCode || 'INVALID_CREDENTIALS';
        return {
          success: false,
          errorCode: errCode,
          error: mapErrorCodeToMessage(errCode, data.error || 'Email hoặc mật khẩu không chính xác.')
        };
      }

      this.setToken(data.token);
      const studentSession: StudentSession = {
        token: data.token,
        studentId: data.student.id,
        fullName: data.student.fullName,
        email: data.student.email,
        avatarUrl: data.student.avatarUrl,
        joinedAt: data.student.createdAt
      };
      this.setLocalSession(studentSession);

      return {
        success: true,
        student: data.student,
        token: data.token
      };
    } catch (netErr: any) {
      // Apps Script fallback
      try {
        const gasRes = await apiClient.post<{
          success: boolean;
          token: string;
          student: Student;
          errorCode?: string;
          error?: string;
        }>('studentAuth.login', { email, password });

        if (gasRes.success && gasRes.token) {
          this.setToken(gasRes.token);
          const studentSession: StudentSession = {
            token: gasRes.token,
            studentId: gasRes.student.id,
            fullName: gasRes.student.fullName,
            email: gasRes.student.email,
            avatarUrl: gasRes.student.avatarUrl,
            joinedAt: gasRes.student.createdAt
          };
          this.setLocalSession(studentSession);
          return { success: true, student: gasRes.student, token: gasRes.token };
        }

        return {
          success: false,
          errorCode: gasRes.errorCode || 'INVALID_CREDENTIALS',
          error: mapErrorCodeToMessage(gasRes.errorCode, gasRes.error || 'Email hoặc mật khẩu không chính xác.')
        };
      } catch (err: any) {
        return {
          success: false,
          errorCode: 'NETWORK_ERROR',
          error: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng.'
        };
      }
    }
  },

  async loginWithGoogle(credential: string): Promise<{
    success: boolean;
    student?: Student;
    token?: string;
    error?: string;
    errorCode?: string;
  }> {
    if (!credential) {
      return {
        success: false,
        errorCode: 'MISSING_CREDENTIAL',
        error: 'Thiếu Google credential token.'
      };
    }

    try {
      // 1. Try local Express backend
      const res = await fetch('/api/student-auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          errorCode: data.errorCode || 'GOOGLE_AUTH_FAILED',
          error: data.error || 'Đăng nhập Google không thành công.'
        };
      }

      const token = data.token || data.data?.token;
      const student = data.student || data.data?.user;

      if (!token || !student) {
        return {
          success: false,
          errorCode: 'INVALID_RESPONSE',
          error: 'Phản hồi từ máy chủ không hợp lệ.'
        };
      }

      this.setToken(token);
      const studentSession: StudentSession = {
        token,
        studentId: student.id,
        fullName: student.fullName,
        email: student.email,
        avatarUrl: student.avatarUrl,
        joinedAt: student.createdAt || new Date().toISOString()
      };
      this.setLocalSession(studentSession);

      return {
        success: true,
        student,
        token
      };
    } catch (netErr: any) {
      // 2. Apps Script fallback
      try {
        const gasRes = await apiClient.post<{
          success: boolean;
          token: string;
          user?: Student;
          student?: Student;
          error?: string;
        }>('auth.google', { credential, role: 'student' });

        if (gasRes.success && (gasRes.token || (gasRes as any).data?.token)) {
          const token = gasRes.token || (gasRes as any).data?.token;
          const student = gasRes.student || gasRes.user || (gasRes as any).data?.user;
          this.setToken(token);
          const studentSession: StudentSession = {
            token,
            studentId: student.id,
            fullName: student.fullName,
            email: student.email,
            avatarUrl: student.avatarUrl,
            joinedAt: student.createdAt || new Date().toISOString()
          };
          this.setLocalSession(studentSession);
          return { success: true, student, token };
        }

        return {
          success: false,
          errorCode: 'GOOGLE_AUTH_FAILED',
          error: gasRes.error || 'Xác thực Google qua Apps Script thất bại.'
        };
      } catch (gasErr: any) {
        return {
          success: false,
          errorCode: 'NETWORK_ERROR',
          error: 'Không thể kết nối đến máy chủ xác thực Google. Vui lòng thử lại.'
        };
      }
    }
  },

  async logout(): Promise<void> {
    const token = this.getToken();
    if (token) {
      try {
        await fetch('/api/student-auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ token })
        });
      } catch {
        // Ignore network errors on logout
      }
    }
    this.clearSession();
  },

  async verifySession(tokenOverride?: string): Promise<{
    success: boolean;
    student?: Student;
    error?: string;
    errorCode?: string;
  }> {
    const token = tokenOverride || this.getToken();
    if (!token) {
      return { success: false, errorCode: 'NO_TOKEN', error: 'Chưa đăng nhập' };
    }

    try {
      const res = await fetch('/api/student-auth/verify-session', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-student-token': token
        }
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        this.clearSession();
        return {
          success: false,
          errorCode: data.errorCode || 'SESSION_EXPIRED',
          error: mapErrorCodeToMessage(data.errorCode, data.error || 'Phiên đăng nhập đã hết hạn.')
        };
      }

      // Update cached session
      const prev = this.getLocalSession();
      if (prev) {
        this.setLocalSession({
          ...prev,
          fullName: data.student.fullName,
          email: data.student.email,
          avatarUrl: data.student.avatarUrl
        });
      }

      return {
        success: true,
        student: data.student
      };
    } catch {
      // If offline, trust existing local session if token matches
      const local = this.getLocalSession();
      if (local && local.token === token) {
        return {
          success: true,
          student: {
            id: local.studentId,
            fullName: local.fullName,
            email: local.email,
            avatarUrl: local.avatarUrl,
            status: 'active',
            createdAt: local.joinedAt || new Date().toISOString()
          }
        };
      }
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        error: 'Không thể xác thực phiên làm việc.'
      };
    }
  },

  async getMe(): Promise<{ success: boolean; student?: any; error?: string }> {
    const token = this.getToken();
    if (!token) return { success: false, error: 'Chưa đăng nhập' };

    try {
      const res = await fetch('/api/student-auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi tải thông tin học sinh' };
    }
  },

  async updateProfile(params: {
    fullName?: string;
    avatarUrl?: string;
    oldPassword?: string;
    newPassword?: string;
  }): Promise<{ success: boolean; student?: Student; error?: string }> {
    const token = this.getToken();
    if (!token) return { success: false, error: 'Chưa đăng nhập' };

    try {
      const res = await fetch('/api/student-auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(params)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Không thể cập nhật thông tin' };
      }

      // Update local session
      const prev = this.getLocalSession();
      if (prev) {
        this.setLocalSession({
          ...prev,
          fullName: data.student.fullName,
          avatarUrl: data.student.avatarUrl
        });
      }

      return { success: true, student: data.student };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi cập nhật thông tin' };
    }
  }
};
