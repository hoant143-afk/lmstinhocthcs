import { teacherRepo } from '../repositories';
import { Teacher, TeacherLoginDto, TeacherRegisterDto } from '../types';
import { apiClient } from './apiClient';

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
        if (res.ok) {
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

  async registerTeacher(dto: TeacherRegisterDto): Promise<Teacher> {
    const fullName = dto.fullName.trim();
    const email = dto.email.trim().toLowerCase();
    const password = dto.password?.trim() || 'password123';

    if (!fullName) {
      throw new Error('Vui lòng nhập Họ và tên giáo viên.');
    }

    if (!email) {
      throw new Error('Vui lòng nhập địa chỉ Email.');
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
          schoolName: dto.schoolName?.trim() || 'Trường THPT & THCS',
          subject: dto.subject?.trim() || 'Tin học & STEM',
          title: dto.title?.trim() || 'Giáo viên bộ môn',
          avatarUrl: dto.avatarUrl
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.teacher) {
        if (data.token) {
          this.setTeacherToken(data.token);
        }
        await teacherRepo.setCurrentTeacher(data.teacher);
        return data.teacher;
      } else if (!res.ok && data.error) {
        throw new Error(data.error);
      }
    } catch (err: any) {
      if (err.message && err.message.includes('đã được đăng ký')) {
        throw err;
      }
    }

    // 2. Fallback to repository check
    const existing = await teacherRepo.getByEmail(email);
    if (existing) {
      throw new Error('Email này đã được sử dụng. Vui lòng đăng nhập hoặc chọn email khác.');
    }

    // Create teacher
    const newTeacher = await teacherRepo.create({
      fullName,
      email,
      password,
      schoolName: dto.schoolName?.trim() || 'Trường THPT & THCS',
      subject: dto.subject?.trim() || 'Tin học & STEM',
      title: dto.title?.trim() || 'Giáo viên bộ môn',
      avatarUrl: dto.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      authProvider: 'local'
    });

    await teacherRepo.setCurrentTeacher(newTeacher);
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
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch')) {
        throw err;
      }
    }

    // 2. Try Apps Script fallback if configured
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
      throw new Error(err.message || 'Xác thực Google cho giáo viên không thành công.');
    }

    throw new Error('Không thể kết nối đến máy chủ xác thực Google.');
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
