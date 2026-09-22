import { Student, StudentSession, StudentRegisterDto, StudentLoginDto, StudentAuthResponse } from '../types';
import { apiClient, mapErrorCodeToMessage } from './apiClient';
import { studentRepo } from '../repositories';
import { decodeGoogleCredential } from '../utils/jwt';
import { db, ensureFirebaseAuth } from '../lib/firebase';
import { collection, doc, getDoc, getDocs, setDoc, query, where } from 'firebase/firestore';

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
        body: JSON.stringify({
          fullName,
          email,
          password,
          googleSub: dto.googleSub,
          googleVerified: dto.googleVerified ?? true,
          googleVerifiedAt: dto.googleVerifiedAt || new Date().toISOString(),
          emailVerified: dto.emailVerified ?? true,
          photoURL: dto.photoURL,
          schoolName: dto.schoolName?.trim() || '',
          grade: dto.grade?.trim() || ''
        })
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('SERVER_API_NOT_JSON');
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errCode = data.errorCode || 'REGISTER_FAILED';
        return {
          success: false,
          errorCode: errCode,
          error: mapErrorCodeToMessage(errCode, data.error || 'Đăng ký tài khoản không thành công.')
        };
      }

      // NOTE: Requirement 5 states no auto-login. The student must explicitly log in afterwards.
      return {
        success: true,
        student: data.student
      };
    } catch (netErr: any) {
      if (netErr.message && (netErr.message.includes('đã được đăng ký') || netErr.message.includes('đã được sử dụng'))) {
        return { success: false, errorCode: 'EMAIL_EXISTS', error: netErr.message };
      }

      // 2. Resilient Cloud Firestore fallback (for Vercel static SPA / cloud persistence)
      try {
        await ensureFirebaseAuth();
        const cleanEmail = email.toLowerCase().trim();
        const q = query(collection(db, 'students'), where('email', '==', cleanEmail));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          return {
            success: false,
            errorCode: 'EMAIL_ALREADY_EXISTS',
            error: 'Email này đã được đăng ký. Vui lòng đăng nhập hoặc sử dụng email khác.'
          };
        }

        const studentId = `student_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();
        const newStudent: Student = {
          id: studentId,
          role: 'student',
          fullName,
          email: cleanEmail,
          password,
          googleSub: dto.googleSub,
          googleVerified: true,
          googleVerifiedAt: dto.googleVerifiedAt || now,
          emailVerified: true,
          photoURL: dto.photoURL,
          avatarUrl: dto.photoURL || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
          schoolName: dto.schoolName?.trim() || '',
          grade: dto.grade?.trim() || '',
          authProvider: 'local_google',
          status: 'active',
          createdAt: now,
          updatedAt: now
        };

        await setDoc(doc(db, 'students', studentId), newStudent);

        return {
          success: true,
          student: newStudent
        };
      } catch (fsErr: any) {
        console.error('[studentAuthService] Firestore register fallback error:', fsErr);
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
      // 1. Try local Express backend
      const res = await fetch('/api/student-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('SERVER_API_NOT_JSON');
      }

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
      // 2. Apps Script fallback if configured
      if (apiClient.isAppsScriptConfigured()) {
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

          if (gasRes.errorCode || gasRes.error) {
            return {
              success: false,
              errorCode: gasRes.errorCode || 'INVALID_CREDENTIALS',
              error: mapErrorCodeToMessage(gasRes.errorCode, gasRes.error || 'Email hoặc mật khẩu không chính xác.')
            };
          }
        } catch (gasErr: any) {
          console.warn('[studentAuthService] Apps Script login fallback warning:', gasErr);
        }
      }

      // 3. Resilient Cloud Firestore fallback (for Vercel SPA without backend)
      try {
        await ensureFirebaseAuth();
        const cleanEmail = email.toLowerCase().trim();
        const q = query(collection(db, 'students'), where('email', '==', cleanEmail));
        const qSnap = await getDocs(q);

        if (!qSnap.empty) {
          const studentDoc = qSnap.docs[0];
          const student = { id: studentDoc.id, ...studentDoc.data() } as Student;

          if (student.status && student.status !== 'active') {
            return {
              success: false,
              errorCode: 'ACCOUNT_DISABLED',
              error: 'Tài khoản học sinh hiện đang bị khóa. Vui lòng liên hệ Thầy/Cô.'
            };
          }

          if (student.password && student.password !== password) {
            return {
              success: false,
              errorCode: 'INVALID_CREDENTIALS',
              error: 'Email hoặc mật khẩu không chính xác.'
            };
          }

          const token = `sblms_std_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          this.setToken(token);
          const studentSession: StudentSession = {
            token,
            studentId: student.id,
            fullName: student.fullName,
            email: student.email,
            avatarUrl: student.avatarUrl,
            joinedAt: student.joinedAt || student.createdAt || new Date().toISOString()
          };
          this.setLocalSession(studentSession);

          return {
            success: true,
            student,
            token
          };
        }
      } catch (fsErr: any) {
        console.warn('[studentAuthService] Firestore student lookup warning:', fsErr);
      }

      // 4. Local storage session fallback
      const local = this.getLocalSession();
      if (local && local.email.toLowerCase() === email.toLowerCase()) {
        return {
          success: true,
          student: {
            id: local.studentId,
            fullName: local.fullName,
            email: local.email,
            avatarUrl: local.avatarUrl,
            status: 'active',
            createdAt: local.joinedAt || new Date().toISOString()
          },
          token: local.token
        };
      }

      return {
        success: false,
        errorCode: 'INVALID_CREDENTIALS',
        error: 'Email hoặc mật khẩu không chính xác hoặc tài khoản chưa được đăng ký.'
      };
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

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok && data.success) {
          const token = data.token || data.data?.token;
          const student = data.student || data.data?.user;

          if (token && student) {
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
          }
        }
      }
    } catch {
      // ignore
    }

    // 2. Apps Script fallback if configured
    if (apiClient.isAppsScriptConfigured()) {
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
      } catch (gasErr: any) {
        console.warn('Apps Script student Google Auth fallback error:', gasErr);
      }
    }

    // 3. Fallback for Static Hostings (e.g. Vercel SPA)
    const payload = decodeGoogleCredential(credential);
    if (payload && payload.email) {
      const email = payload.email.toLowerCase().trim();
      const studentId = `std_g_${payload.sub || Math.random().toString(36).substring(2, 10)}`;
      const now = new Date().toISOString();
      const student: Student = {
        id: studentId,
        fullName: payload.name || email.split('@')[0],
        email,
        avatarUrl: payload.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        authProvider: 'google',
        status: 'active',
        createdAt: now,
        googleSub: payload.sub
      };

      // Also persist to Cloud Firestore
      try {
        await ensureFirebaseAuth();
        await setDoc(doc(db, 'students', studentId), student, { merge: true });
      } catch (e) {
        console.warn('[studentAuthService] Firestore Google student save warning:', e);
      }

      const token = `gtoken_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      this.setToken(token);
      const studentSession: StudentSession = {
        token,
        studentId: student.id,
        fullName: student.fullName,
        email: student.email,
        avatarUrl: student.avatarUrl,
        joinedAt: student.createdAt
      };
      this.setLocalSession(studentSession);
      return { success: true, student, token };
    }

    return {
      success: false,
      errorCode: 'GOOGLE_AUTH_FAILED',
      error: 'Không thể xác thực thông tin tài khoản Google. Vui lòng thử lại.'
    };
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

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok && data.success && data.student) {
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
        } else if (res.status === 401 || res.status === 403) {
          this.clearSession();
          return {
            success: false,
            errorCode: data.errorCode || 'SESSION_EXPIRED',
            error: mapErrorCodeToMessage(data.errorCode, data.error || 'Phiên đăng nhập đã hết hạn.')
          };
        }
      }
    } catch {
      // ignore
    }

    // If offline or on static hosting (Vercel SPA), verify via local session & Firestore
    const local = this.getLocalSession();
    if (local && (local.token === token || token.startsWith('sblms_std_') || token.startsWith('gtoken_') || token.startsWith('std_'))) {
      // Optionally sync fresh student doc from Cloud Firestore
      if (local.studentId) {
        try {
          await ensureFirebaseAuth();
          const sSnap = await getDoc(doc(db, 'students', local.studentId));
          if (sSnap.exists()) {
            const fsStudent = { id: sSnap.id, ...sSnap.data() } as Student;
            if (fsStudent.status && fsStudent.status !== 'active') {
              this.clearSession();
              return {
                success: false,
                errorCode: 'ACCOUNT_DISABLED',
                error: 'Tài khoản học sinh hiện đang bị khóa.'
              };
            }
            return {
              success: true,
              student: fsStudent
            };
          }
        } catch {
          // continue with local data
        }
      }

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
      errorCode: 'SESSION_EXPIRED',
      error: 'Phiên đăng nhập đã hết hạn.'
    };
  },

  async getMe(): Promise<{ success: boolean; student?: any; error?: string }> {
    const token = this.getToken();
    if (!token) return { success: false, error: 'Chưa đăng nhập' };

    try {
      const res = await fetch('/api/student-auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        return data;
      }
    } catch (err: any) {
      // ignore
    }

    const local = this.getLocalSession();
    if (local) {
      return {
        success: true,
        student: {
          id: local.studentId,
          fullName: local.fullName,
          email: local.email,
          avatarUrl: local.avatarUrl,
          status: 'active'
        }
      };
    }

    return { success: false, error: 'Không tìm thấy thông tin tài khoản' };
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
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok && data.success) {
          const prev = this.getLocalSession();
          if (prev) {
            this.setLocalSession({
              ...prev,
              fullName: data.student.fullName,
              avatarUrl: data.student.avatarUrl
            });
          }
          return { success: true, student: data.student };
        } else if (data.error) {
          return { success: false, error: data.error };
        }
      }
    } catch {
      // ignore
    }

    // Fallback: update local session & Cloud Firestore
    const local = this.getLocalSession();
    if (local && local.studentId) {
      const updateData: any = {};
      if (params.fullName) updateData.fullName = params.fullName;
      if (params.avatarUrl) updateData.avatarUrl = params.avatarUrl;
      if (params.newPassword) updateData.password = params.newPassword;

      try {
        await ensureFirebaseAuth();
        await setDoc(doc(db, 'students', local.studentId), updateData, { merge: true });
      } catch (err) {
        console.warn('[studentAuthService] Firestore updateProfile warning:', err);
      }

      const updatedStudent: Student = {
        id: local.studentId,
        fullName: params.fullName || local.fullName,
        email: local.email,
        avatarUrl: params.avatarUrl || local.avatarUrl,
        status: 'active',
        createdAt: local.joinedAt || new Date().toISOString()
      };

      this.setLocalSession({
        ...local,
        fullName: updatedStudent.fullName,
        avatarUrl: updatedStudent.avatarUrl
      });

      return { success: true, student: updatedStudent };
    }

    return { success: false, error: 'Không thể cập nhật thông tin' };
  }
};
