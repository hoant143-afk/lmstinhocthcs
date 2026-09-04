import { studentRepo, classRepo } from '../repositories';
import { Student, StudentSession, ClassEntity, Enrollment, EnrolledClassInfo } from '../types';
import { apiClient, mapErrorCodeToMessage } from './apiClient';
import { studentAuthService } from './studentAuthService';

const STUDENT_SESSION_KEY = 'sb_lms_student_session_v1';
const STUDENT_TOKEN_KEY = 'sblms_student_token';

export const studentService = {
  async getStudentsByClass(classId: string): Promise<Student[]> {
    return studentRepo.getByClassId(classId);
  },

  async getStudentById(id: string): Promise<Student | null> {
    return studentRepo.getById(id);
  },

  /**
   * New authenticated join class flow:
   * Student is already logged in (has session token).
   * Backend retrieves studentId strictly from session token.
   */
  async joinClassWithCode(classCode: string): Promise<{
    success: boolean;
    class?: ClassEntity;
    enrollment?: Enrollment;
    alreadyEnrolled?: boolean;
    error?: string;
    errorCode?: string;
  }> {
    const cleanCode = (classCode || '').trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, error: 'Vui lòng nhập Mã lớp học (Class Code).' };
    }

    const token = this.getStudentToken();
    if (!token) {
      return {
        success: false,
        errorCode: 'SESSION_EXPIRED',
        error: 'Vui lòng đăng nhập tài khoản học sinh trước khi tham gia lớp.'
      };
    }

    try {
      // 1. Call server API
      const res = await fetch('/api/student/classes/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-student-token': token
        },
        body: JSON.stringify({ classCode: cleanCode })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errCode = data.errorCode || 'JOIN_FAILED';
        return {
          success: false,
          errorCode: errCode,
          error: mapErrorCodeToMessage(errCode, data.error || 'Không thể tham gia lớp học.')
        };
      }

      // Update current session's active classId
      const currentSession = this.getCurrentSession();
      if (currentSession && data.class) {
        currentSession.classId = data.class.id;
        this.setSession(currentSession);
      }

      return {
        success: true,
        class: data.class,
        enrollment: data.enrollment,
        alreadyEnrolled: !!data.alreadyEnrolled
      };
    } catch (netErr: any) {
      // Apps Script fallback via apiClient
      try {
        const gasRes = await apiClient.post<{
          success: boolean;
          class?: ClassEntity;
          enrollment?: Enrollment;
          alreadyEnrolled?: boolean;
          errorCode?: string;
          error?: string;
        }>('student.classes.join', { classCode: cleanCode, token });

        if (gasRes.success && gasRes.class) {
          const currentSession = this.getCurrentSession();
          if (currentSession && gasRes.class) {
            currentSession.classId = gasRes.class.id;
            this.setSession(currentSession);
          }
          return {
            success: true,
            class: gasRes.class,
            enrollment: gasRes.enrollment,
            alreadyEnrolled: !!gasRes.alreadyEnrolled
          };
        }

        return {
          success: false,
          errorCode: gasRes.errorCode || 'JOIN_FAILED',
          error: mapErrorCodeToMessage(gasRes.errorCode, gasRes.error || 'Không thể tham gia lớp học.')
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

  /**
   * Get all classes the current student is enrolled in, with real progress and nearest deadline
   */
  async getMyEnrolledClasses(): Promise<EnrolledClassInfo[]> {
    const token = this.getStudentToken();
    if (!token) return [];

    try {
      const res = await fetch('/api/student/classes', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-student-token': token
        }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.classes)) {
        return data.classes;
      }
      return [];
    } catch (err) {
      // Apps Script fallback
      try {
        const gasRes = await apiClient.post<{ success: boolean; classes: EnrolledClassInfo[] }>(
          'student.classes.getMyClasses',
          { token }
        );
        if (gasRes.success && Array.isArray(gasRes.classes)) {
          return gasRes.classes;
        }
      } catch {
        // Ignore fallback error
      }
      return [];
    }
  },

  /**
   * Backward-compatible joinClass:
   * If called with (fullName, classCode), or just (classCode)
   */
  async joinClass(
    fullNameOrCode: string,
    maybeCode?: string
  ): Promise<{
    success: boolean;
    student?: Student;
    class?: ClassEntity;
    session?: StudentSession;
    token?: string;
    alreadyEnrolled?: boolean;
    error?: string;
    errorCode?: string;
  }> {
    const cleanCode = (maybeCode || fullNameOrCode || '').trim().toUpperCase();

    // If student is logged in, use the new secure join flow
    const token = this.getStudentToken();
    if (token) {
      const joinRes = await this.joinClassWithCode(cleanCode);
      if (joinRes.success && joinRes.class) {
        const currentSession = this.getCurrentSession();
        return {
          success: true,
          class: joinRes.class,
          session: currentSession || undefined,
          token,
          alreadyEnrolled: joinRes.alreadyEnrolled
        };
      }
      return {
        success: false,
        errorCode: joinRes.errorCode,
        error: joinRes.error
      };
    }

    // If student is not logged in:
    return {
      success: false,
      errorCode: 'SESSION_EXPIRED',
      error: 'Vui lòng đăng nhập hoặc đăng ký tài khoản học sinh trước khi tham gia lớp học.'
    };
  },

  getStudentToken(): string | null {
    return localStorage.getItem(STUDENT_TOKEN_KEY) || studentAuthService.getToken();
  },

  setStudentToken(token: string): void {
    localStorage.setItem(STUDENT_TOKEN_KEY, token);
    studentAuthService.setToken(token);
  },

  getCurrentSession(): StudentSession | null {
    try {
      const raw = localStorage.getItem(STUDENT_SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as StudentSession;
    } catch {
      return null;
    }
  },

  setSession(session: StudentSession): void {
    try {
      localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      console.error('Failed to set student session', e);
    }
  },

  clearSession(): void {
    try {
      localStorage.removeItem(STUDENT_SESSION_KEY);
      localStorage.removeItem(STUDENT_TOKEN_KEY);
    } catch (e) {
      console.error('Failed to clear student session', e);
    }
  }
};


