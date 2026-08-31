import { studentRepo, classRepo } from '../repositories';
import { Student, StudentSession, ClassEntity } from '../types';
import { apiClient } from './apiClient';

const STUDENT_SESSION_KEY = 'sb_lms_student_session_v1';
const STUDENT_TOKEN_KEY = 'sblms_student_token';

export const studentService = {
  async getStudentsByClass(classId: string): Promise<Student[]> {
    return studentRepo.getByClassId(classId);
  },

  async getStudentById(id: string): Promise<Student | null> {
    return studentRepo.getById(id);
  },

  async joinClass(
    fullName: string,
    classCode: string
  ): Promise<{ success: boolean; student?: Student; class?: ClassEntity; session?: StudentSession; token?: string; error?: string }> {
    const cleanName = (fullName || '').trim();
    const cleanCode = (classCode || '').trim().toUpperCase();

    if (!cleanName) {
      return { success: false, error: 'Vui lòng nhập đầy đủ Họ và tên của bạn.' };
    }
    if (!cleanCode) {
      return { success: false, error: 'Vui lòng nhập Mã lớp học (Class Code).' };
    }

    // 1. If Google Apps Script Web App is configured, perform real cloud join via Sheet CLASSES & STUDENTS
    if (apiClient.isAppsScriptConfigured()) {
      try {
        const cloudRes = await apiClient.studentJoinClass(cleanName, cleanCode);
        if (cloudRes.success && cloudRes.data) {
          const payload = cloudRes.data;
          const student = payload.student;
          const cls = payload.class;
          const token = payload.token || `sblms_std_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
          const session: StudentSession = payload.session || {
            studentId: student.id,
            classId: cls.id,
            fullName: student.fullName || cleanName,
            joinedAt: student.joinedAt || new Date().toISOString()
          };

          this.setStudentToken(token);
          this.setSession(session);

          return {
            success: true,
            student,
            class: cls,
            session,
            token
          };
        } else if (cloudRes.error) {
          // If explicit error from Apps Script (e.g. class not found)
          console.warn('[studentService] Apps Script returned error:', cloudRes.error);
        }
      } catch (cloudErr) {
        console.warn('[studentService] Apps Script cloud join error:', cloudErr);
      }
    }

    // 2. Try server API join for full-stack multi-device persistence
    try {
      const res = await fetch('/api/students/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: cleanName, classCode: cleanCode })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.session) {
          const token = data.token || `sblms_std_${Date.now()}`;
          this.setStudentToken(token);
          this.setSession(data.session);
          return {
            success: true,
            student: data.student,
            class: data.class,
            session: data.session,
            token
          };
        } else if (data.error) {
          return { success: false, error: data.error };
        }
      }
    } catch (apiErr) {
      console.warn('[studentService] Server join request failed, trying repository fallback:', apiErr);
    }

    // 3. Fallback via classRepo & studentRepo
    const cls = await classRepo.getByCode(cleanCode);
    if (!cls) {
      return {
        success: false,
        error: `Không tìm thấy lớp học với mã "${cleanCode}". Vui lòng kiểm tra lại mã lớp hoặc hỏi giáo viên bộ môn.`
      };
    }

    // Check if student already joined this class
    let student = await studentRepo.getByNameAndClass(cleanName, cls.id);
    if (!student) {
      student = await studentRepo.create({
        classId: cls.id,
        fullName: cleanName,
        status: 'active'
      });
    }

    const session: StudentSession = {
      studentId: student.id,
      classId: cls.id,
      fullName: student.fullName,
      joinedAt: student.joinedAt
    };

    const token = `sblms_std_${Date.now()}`;
    this.setStudentToken(token);
    this.setSession(session);

    return {
      success: true,
      student,
      class: cls,
      session,
      token
    };
  },

  getStudentToken(): string | null {
    return localStorage.getItem(STUDENT_TOKEN_KEY);
  },

  setStudentToken(token: string): void {
    localStorage.setItem(STUDENT_TOKEN_KEY, token);
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

