import { studentRepo, classRepo } from '../repositories';
import { Student, StudentSession, ClassEntity } from '../types';

const STUDENT_SESSION_KEY = 'sb_lms_student_session_v1';

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
  ): Promise<{ success: boolean; student?: Student; class?: ClassEntity; session?: StudentSession; error?: string }> {
    const cleanName = (fullName || '').trim();
    const cleanCode = (classCode || '').trim();

    if (!cleanName) {
      return { success: false, error: 'Vui lòng nhập đầy đủ Họ và tên của bạn.' };
    }
    if (!cleanCode) {
      return { success: false, error: 'Vui lòng nhập Mã lớp học (Class Code).' };
    }

    // 1. Try server API join first for instant cross-device synchronization
    try {
      const res = await fetch('/api/students/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: cleanName, classCode: cleanCode })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.session) {
          this.setSession(data.session);
          return {
            success: true,
            student: data.student,
            class: data.class,
            session: data.session
          };
        } else if (data.error) {
          return { success: false, error: data.error };
        }
      }
    } catch (apiErr) {
      console.warn('[studentService] Server join request failed, trying repository fallback:', apiErr);
    }

    // 2. Fallback via classRepo & studentRepo
    const cls = await classRepo.getByCode(cleanCode);
    if (!cls) {
      return {
        success: false,
        error: `Không tìm thấy lớp học với mã "${cleanCode}". Vui lòng kiểm tra lại chữ hoa/thường hoặc hỏi giáo viên bộ môn.`
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

    this.setSession(session);

    return {
      success: true,
      student,
      class: cls,
      session
    };
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
    } catch (e) {
      console.error('Failed to clear student session', e);
    }
  }
};
