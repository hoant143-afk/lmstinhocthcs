import { studentRepo, classRepo } from '../repositories';
import { Student, StudentSession, ClassEntity } from '../types';
import { apiClient, mapErrorCodeToMessage } from './apiClient';

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
  ): Promise<{
    success: boolean;
    student?: Student;
    class?: ClassEntity;
    session?: StudentSession;
    token?: string;
    error?: string;
    errorCode?: string;
  }> {
    const cleanName = (fullName || '').trim();
    const cleanCode = (classCode || '').trim().toUpperCase();

    if (!cleanName) {
      return { success: false, error: 'Vui lòng nhập đầy đủ Họ và tên của bạn.' };
    }
    if (!cleanCode) {
      return { success: false, error: 'Vui lòng nhập Mã lớp học (Class Code).' };
    }

    // 1. Direct Cloud Firestore query for class by code
    try {
      const cls = await classRepo.getByCode(cleanCode);
      if (!cls) {
        return {
          success: false,
          errorCode: 'CLASS_NOT_FOUND',
          error: mapErrorCodeToMessage('CLASS_NOT_FOUND', `Không tìm thấy lớp học với mã "${cleanCode}". Vui lòng kiểm tra lại chính xác mã lớp từ Thầy/Cô.`)
        };
      }

      if (cls.status === 'inactive' || cls.joinEnabled === false) {
        return {
          success: false,
          errorCode: 'CLASS_JOIN_DISABLED',
          error: mapErrorCodeToMessage('CLASS_JOIN_DISABLED', `Lớp học "${cls.name}" hiện đang tạm khóa tham gia mới.`)
        };
      }

      // Check if student already joined this class in Firestore
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

      const token = `sblms_std_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      this.setStudentToken(token);
      this.setSession(session);

      return {
        success: true,
        student,
        class: cls,
        session,
        token
      };
    } catch (dbError: any) {
      console.error('[studentService] Firestore joinClass error:', dbError);
      return {
        success: false,
        errorCode: 'DATABASE_ERROR',
        error: `Lỗi kết nối cơ sở dữ liệu Cloud Firestore: ${dbError.message || dbError}`
      };
    }
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

