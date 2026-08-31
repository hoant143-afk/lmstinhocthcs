import { studentRepo, classRepo } from '../repositories';
import { Student, StudentSession } from '../types';

const STUDENT_SESSION_KEY = 'sb_lms_student_session_v1';

export const studentService = {
  async getStudentsByClass(classId: string): Promise<Student[]> {
    return studentRepo.getByClassId(classId);
  },

  async getStudentById(id: string): Promise<Student | null> {
    return studentRepo.getById(id);
  },

  async joinClass(fullName: string, classCode: string): Promise<{ success: boolean; student?: Student; session?: StudentSession; error?: string }> {
    const cleanName = fullName.trim();
    const cleanCode = classCode.trim().toUpperCase();

    if (!cleanName) {
      return { success: false, error: 'Vui lòng nhập Họ và tên của bạn.' };
    }
    if (!cleanCode) {
      return { success: false, error: 'Vui lòng nhập Mã lớp học.' };
    }

    const cls = await classRepo.getByCode(cleanCode);
    if (!cls) {
      return { success: false, error: `Không tìm thấy lớp học với mã "${cleanCode}". Vui lòng kiểm tra lại.` };
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

    localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(session));

    return {
      success: true,
      student,
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
    localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(session));
  },

  clearSession(): void {
    localStorage.removeItem(STUDENT_SESSION_KEY);
  }
};
