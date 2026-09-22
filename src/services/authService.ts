import { teacherRepo } from '../repositories';
import { Teacher, TeacherLoginDto, TeacherRegisterDto } from '../types';
import { apiClient } from './apiClient';
import { decodeGoogleCredential } from '../utils/jwt';

const TEACHER_TOKEN_KEY = 'sblms_teacher_token';

export const authService = {
  getTeacherToken(): string | null {
    return localStorage.getItem(TEACHER_TOKEN_KEY) || null;
  },

  setTeacherToken(token: string): void {
    if (token) {
      localStorage.setItem(TEACHER_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TEACHER_TOKEN_KEY);
    }
  },

  async getAllTeachers(): Promise<Teacher[]> {
    return teacherRepo.getAll();
  },

  async getCurrentTeacher(): Promise<Teacher | null> {
    const token = this.getTeacherToken();
    if (token) {
      try {
        const res = await fetch('/api/teacher-auth/verify-session', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.success && data.teacher) {
            return data.teacher;
          }
        }
      } catch {}
    }
    return teacherRepo.getCurrentTeacher();
  },

  async loginTeacher(dto: TeacherLoginDto): Promise<Teacher> {
    const emailInput = dto.email.trim().toLowerCase();

    // 1. Try local server endpoint first
    try {
      const res = await fetch('/api/teacher-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: dto.password })
      });

      const data = await res.json();
      if (res.ok && data.success && data.teacher) {
        if (data.token) {
          this.setTeacherToken(data.token);
        }
        await teacherRepo.setCurrentTeacher(data.teacher);
        return data.teacher;
      }
    } catch {}

    // 2. Fallback to repository
    const teachers = await teacherRepo.getAll();
    const teacher = teachers.find(
      t => t.email.toLowerCase() === emailInput || t.email.toLowerCase().startsWith(emailInput)
    );

    if (!teacher) {
      throw new Error('Không tìm thấy tài khoản Giáo viên với Email/Tên đăng nhập này.');
    }

    if (dto.password && teacher.password && teacher.password !== dto.password) {
      throw new Error('Mật khẩu không chính xác. Vui lòng kiểm tra lại.');
    }

    await teacherRepo.setCurrentTeacher(teacher);
    return teacher;
  },

  async verifyGoogleToken(credential: string): Promise<{
    sub: string;
    email: string;
    name: string;
    picture: string;
    emailVerified: boolean;
  }> {
    if (!credential) {
      throw new Error('Vui lòng chọn tài khoản Google.');
    }

    // 1. Try server backend endpoint first
    try {
      const res = await fetch('/api/auth/verify-google-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential })
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok && data.success && data.googleUser) {
          return data.googleUser;
        }
        if (data.error) {
          throw new Error(data.error);
        }
      }
    } catch (err: any) {
      if (err.message && (err.message.includes('đã được đăng ký') || err.message.includes('đã được sử dụng') || err.message.includes('chưa được xác minh'))) {
        throw err;
      }
    }

    // 2. Client-side JWT Decode & Firestore Fallback (for static Vercel hosting)
    const payload = decodeGoogleCredential(credential);
    if (!payload || !payload.email) {
      throw new Error('Không thể giải mã Google ID Token.');
    }
    if (!payload.email_verified) {
      throw new Error('Email tài khoản Google chưa được xác minh bởi Google.');
    }

    const cleanEmail = payload.email.toLowerCase().trim();

    // Check teacher repository / local cache
    const existingTeacher = await teacherRepo.getByEmail(cleanEmail);
    if (existingTeacher) {
      throw new Error('Email này đã được đăng ký. Vui lòng đăng nhập hoặc sử dụng email khác.');
    }

    return {
      sub: String(payload.sub),
      email: cleanEmail,
      name: String(payload.name || payload.email.split('@')[0]),
      picture: String(payload.picture || ''),
      emailVerified: true
    };
  },

  async registerTeacher(dto: TeacherRegisterDto): Promise<Teacher> {
    const fullName = dto.fullName.trim();
    const email = dto.email.trim().toLowerCase();
    const password = dto.password?.trim() || '';

    if (!fullName) {
      throw new Error('Vui lòng nhập Họ và tên giáo viên.');
    }

    if (!email) {
      throw new Error('Vui lòng nhập địa chỉ Email.');
    }

    if (!password || password.length < 6) {
      throw new Error('Mật khẩu phải có độ dài từ 6 ký tự trở lên.');
    }

    // 1. Try local server endpoint first
    try {
      const res = await fetch('/api/teacher-auth/register', {
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
          photoURL: dto.photoURL || dto.avatarUrl,
          schoolName: dto.schoolName?.trim() || 'Trường THPT & THCS',
          subject: dto.subject?.trim() || 'Bộ môn',
          title: dto.title?.trim() || 'Giáo viên',
          avatarUrl: dto.photoURL || dto.avatarUrl
        })
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok && data.success && data.teacher) {
          // NOTE: Do NOT auto-login as per Requirement 5!
          return data.teacher;
        } else if (data.error) {
          throw new Error(data.error);
        }
      }
    } catch (err: any) {
      if (err.message && (err.message.includes('đã được đăng ký') || err.message.includes('đã được sử dụng'))) {
        throw err;
      }
    }

    // 2. Fallback to repository check
    const existing = await teacherRepo.getByEmail(email);
    if (existing) {
      throw new Error('Email này đã được đăng ký. Vui lòng đăng nhập hoặc sử dụng email khác.');
    }

    // Create teacher without auto-login
    const newTeacher = await teacherRepo.create({
      fullName,
      email,
      password,
      schoolName: dto.schoolName?.trim() || 'Trường THPT & THCS',
      subject: dto.subject?.trim() || 'Bộ môn',
      title: dto.title?.trim() || 'Giáo viên',
      avatarUrl: dto.photoURL || dto.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      googleSub: dto.googleSub,
      authProvider: 'local_google'
    });

    return newTeacher;
  },

  async loginTeacherWithGoogle(credential: string): Promise<Teacher> {
    if (!credential) {
      throw new Error('Thiếu Google credential token.');
    }

    // 1. Try local server API
    try {
      const res = await fetch('/api/teacher-auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential })
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok && data.success) {
          const teacher = data.teacher || data.data?.user;
          const token = data.token || data.data?.token;
          if (token) {
            this.setTeacherToken(token);
          }
          await teacherRepo.setCurrentTeacher(teacher);
          return teacher;
        } else if (data.error) {
          throw new Error(data.error);
        }
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch') && !err.message.includes('token') && !err.message.includes('JSON')) {
        throw err;
      }
    }

    // 2. Try Apps Script fallback if configured
    if (apiClient.isAppsScriptConfigured()) {
      try {
        const gasRes = await apiClient.post<{
          success: boolean;
          token: string;
          user?: Teacher;
          teacher?: Teacher;
          error?: string;
        }>('auth.google', { credential, role: 'teacher' });

        if (gasRes.success && (gasRes.token || (gasRes as any).data?.token)) {
          const token = gasRes.token || (gasRes as any).data?.token;
          const teacher = gasRes.teacher || gasRes.user || (gasRes as any).data?.user;
          if (token) {
            this.setTeacherToken(token);
          }
          await teacherRepo.setCurrentTeacher(teacher);
          return teacher;
        }
        if (gasRes.error) {
          throw new Error(gasRes.error);
        }
      } catch (err: any) {
        console.warn('Apps Script Google Auth error:', err);
      }
    }

    // 3. Fallback for Static Hostings (e.g. Vercel SPA without backend)
    const payload = decodeGoogleCredential(credential);
    if (payload && payload.email) {
      const email = payload.email.toLowerCase().trim();
      let teacher = await teacherRepo.getByEmail(email);

      if (!teacher) {
        // Automatically create or register teacher from verified Google account
        teacher = await teacherRepo.create({
          fullName: payload.name || email.split('@')[0],
          email,
          avatarUrl: payload.picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          authProvider: 'google',
          schoolName: 'Trường THPT & THCS',
          subject: 'Tin học & STEM',
          title: 'Giáo viên bộ môn'
        });
      }

      const clientToken = `gtoken_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      this.setTeacherToken(clientToken);
      await teacherRepo.setCurrentTeacher(teacher);
      return teacher;
    }

    throw new Error('Không thể xác thực thông tin tài khoản Google.');
  },

  async logoutTeacher(): Promise<void> {
    const token = this.getTeacherToken();
    if (token) {
      try {
        await fetch('/api/teacher-auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
      } catch {}
    }
    this.setTeacherToken('');
    await teacherRepo.setCurrentTeacher(null);
  }
};
