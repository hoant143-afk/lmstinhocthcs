import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  UserRole,
  Teacher,
  Student,
  StudentSession,
  ClassEntity,
  TeacherLoginDto,
  TeacherRegisterDto,
  StudentLoginDto,
  StudentRegisterDto
} from '../types';
import { teacherRepo, classRepo } from '../repositories';
import { studentService } from '../services/studentService';
import { studentAuthService } from '../services/studentAuthService';
import { authService } from '../services/authService';
import { syncService } from '../services/syncService';

interface AuthContextType {
  role: UserRole;
  teacher: Teacher | null;
  isAuthenticatedTeacher: boolean;
  student: Student | null;
  studentSession: StudentSession | null;
  isAuthenticatedStudent: boolean;
  currentClass: ClassEntity | null;
  isLoading: boolean;
  setRole: (role: UserRole) => void;
  loginTeacher: (dto: TeacherLoginDto) => Promise<Teacher>;
  registerTeacher: (dto: TeacherRegisterDto) => Promise<Teacher>;
  logoutTeacher: () => Promise<void>;
  loginAsTeacherQuick: (teacherId?: string) => Promise<Teacher>;
  loginTeacherWithGoogle: (credential: string) => Promise<Teacher>;
  loginStudent: (dto: StudentLoginDto) => Promise<StudentSession>;
  registerStudent: (dto: StudentRegisterDto) => Promise<StudentSession>;
  loginStudentWithGoogle: (credential: string) => Promise<StudentSession>;
  loginAsStudent: (session: StudentSession) => Promise<void>;
  logoutStudent: () => Promise<void>;
  logout: () => void;
  updateTeacherProfile: (data: Partial<Teacher>) => Promise<Teacher | null>;
  updateStudentProfile: (data: { fullName?: string; avatarUrl?: string; oldPassword?: string; newPassword?: string }) => Promise<Student | null>;
  refreshUserData: () => Promise<void>;
  setCurrentClass: (cls: ClassEntity | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_STORAGE_KEY = 'sb_lms_active_role_v1';
const TEACHER_TOKEN_KEY = 'sblms_teacher_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>('ROLE_TEACHER');
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [studentSession, setStudentSession] = useState<StudentSession | null>(null);
  const [currentClass, setCurrentClass] = useState<ClassEntity | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      // 0. Auto-sync with server configuration & shared database
      await syncService.syncWithServer();

      // 1. Check saved role or default
      const savedRole = (localStorage.getItem(ROLE_STORAGE_KEY) as UserRole) || 'ROLE_TEACHER';
      setRoleState(savedRole);

      // 2. Load and verify student session if token is present
      const studentToken = studentAuthService.getToken();
      if (studentToken) {
        const verifyRes = await studentAuthService.verifySession(studentToken);
        if (verifyRes.success && verifyRes.student) {
          setStudent(verifyRes.student);
          const cachedSession = studentService.getCurrentSession() || {
            token: studentToken,
            studentId: verifyRes.student.id,
            fullName: verifyRes.student.fullName,
            email: verifyRes.student.email,
            avatarUrl: verifyRes.student.avatarUrl
          };
          setStudentSession(cachedSession);

          if (cachedSession.classId) {
            const cls = await classRepo.getById(cachedSession.classId);
            if (cls) {
              setCurrentClass(cls);
            }
          }

          // If on student path or student role chosen, prioritize student role
          if (savedRole === 'ROLE_STUDENT' || window.location.pathname.startsWith('/app')) {
            setRoleState('ROLE_STUDENT');
          }
        } else {
          studentAuthService.clearSession();
          setStudent(null);
          setStudentSession(null);
        }
      } else {
        const cached = studentService.getCurrentSession();
        if (cached) {
          setStudentSession(cached);
        }
      }

      // 3. Load teacher from storage/API
      const currentTeacher = await teacherRepo.getCurrentTeacher();
      setTeacher(currentTeacher);
    } catch (err) {
      console.error('Error initializing Auth:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem(ROLE_STORAGE_KEY, newRole);
  };

  const loginTeacher = async (dto: TeacherLoginDto): Promise<Teacher> => {
    const loggedTeacher = await authService.loginTeacher(dto);
    localStorage.setItem(TEACHER_TOKEN_KEY, `sblms_tch_${loggedTeacher.id}_${Date.now()}`);
    setTeacher(loggedTeacher);
    setRole('ROLE_TEACHER');
    return loggedTeacher;
  };

  const registerTeacher = async (dto: TeacherRegisterDto): Promise<Teacher> => {
    const newTeacher = await authService.registerTeacher(dto);
    localStorage.setItem(TEACHER_TOKEN_KEY, `sblms_tch_${newTeacher.id}_${Date.now()}`);
    setTeacher(newTeacher);
    setRole('ROLE_TEACHER');
    return newTeacher;
  };

  const logoutTeacher = async () => {
    await authService.logoutTeacher();
    localStorage.removeItem(TEACHER_TOKEN_KEY);
    setTeacher(null);
  };

  const loginAsTeacherQuick = async (teacherId?: string): Promise<Teacher> => {
    const all = await teacherRepo.getAll();
    const target = (teacherId ? all.find(t => t.id === teacherId) : all[0]) || all[0];
    if (target) {
      await teacherRepo.setCurrentTeacher(target);
      localStorage.setItem(TEACHER_TOKEN_KEY, `sblms_tch_${target.id}_${Date.now()}`);
      setTeacher(target);
      setRole('ROLE_TEACHER');
      return target;
    }
    throw new Error('Không tìm thấy tài khoản giáo viên demo.');
  };

  const loginTeacherWithGoogle = async (credential: string): Promise<Teacher> => {
    const loggedTeacher = await authService.loginTeacherWithGoogle(credential);
    localStorage.setItem(TEACHER_TOKEN_KEY, `sblms_tch_${loggedTeacher.id}_${Date.now()}`);
    setTeacher(loggedTeacher);
    setRole('ROLE_TEACHER');
    return loggedTeacher;
  };

  const loginStudent = async (dto: StudentLoginDto): Promise<StudentSession> => {
    const res = await studentAuthService.login(dto);
    if (!res.success || !res.student || !res.token) {
      throw new Error(res.error || 'Đăng nhập không thành công.');
    }

    const session: StudentSession = {
      token: res.token,
      studentId: res.student.id,
      fullName: res.student.fullName,
      email: res.student.email,
      avatarUrl: res.student.avatarUrl,
      joinedAt: res.student.createdAt
    };

    setStudent(res.student);
    setStudentSession(session);
    studentService.setSession(session);
    setRole('ROLE_STUDENT');
    return session;
  };

  const registerStudent = async (dto: StudentRegisterDto): Promise<StudentSession> => {
    const res = await studentAuthService.register(dto);
    if (!res.success || !res.student || !res.token) {
      throw new Error(res.error || 'Đăng ký không thành công.');
    }

    const session: StudentSession = {
      token: res.token,
      studentId: res.student.id,
      fullName: res.student.fullName,
      email: res.student.email,
      avatarUrl: res.student.avatarUrl,
      joinedAt: res.student.createdAt
    };

    setStudent(res.student);
    setStudentSession(session);
    studentService.setSession(session);
    setRole('ROLE_STUDENT');
    return session;
  };

  const loginStudentWithGoogle = async (credential: string): Promise<StudentSession> => {
    const res = await studentAuthService.loginWithGoogle(credential);
    if (!res.success || !res.student || !res.token) {
      throw new Error(res.error || 'Đăng nhập Google thất bại.');
    }

    const session: StudentSession = {
      token: res.token,
      studentId: res.student.id,
      fullName: res.student.fullName,
      email: res.student.email,
      avatarUrl: res.student.avatarUrl,
      joinedAt: res.student.createdAt
    };

    setStudent(res.student);
    setStudentSession(session);
    studentService.setSession(session);
    setRole('ROLE_STUDENT');
    return session;
  };

  const loginAsStudent = async (session: StudentSession) => {
    studentService.setSession(session);
    setStudentSession(session);
    setRole('ROLE_STUDENT');
    if (session.classId) {
      const cls = await classRepo.getById(session.classId);
      setCurrentClass(cls);
    }
  };

  const logoutStudent = async () => {
    await studentAuthService.logout();
    setStudent(null);
    setStudentSession(null);
    setCurrentClass(null);
  };

  const logout = () => {
    if (role === 'ROLE_TEACHER') {
      logoutTeacher();
    } else {
      logoutStudent();
    }
  };

  const updateTeacherProfile = async (data: Partial<Teacher>): Promise<Teacher | null> => {
    if (!teacher) return null;
    const updated = await teacherRepo.updateTeacher(teacher.id, data);
    if (updated) {
      setTeacher(updated);
    }
    return updated;
  };

  const updateStudentProfile = async (data: {
    fullName?: string;
    avatarUrl?: string;
    oldPassword?: string;
    newPassword?: string;
  }): Promise<Student | null> => {
    const res = await studentAuthService.updateProfile(data);
    if (res.success && res.student) {
      setStudent(res.student);
      if (studentSession) {
        const updatedSession = {
          ...studentSession,
          fullName: res.student.fullName,
          avatarUrl: res.student.avatarUrl
        };
        setStudentSession(updatedSession);
        studentService.setSession(updatedSession);
      }
      return res.student;
    }
    throw new Error(res.error || 'Không thể cập nhật thông tin học sinh.');
  };

  const refreshUserData = async () => {
    await initAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        teacher,
        isAuthenticatedTeacher: !!teacher,
        student,
        studentSession,
        isAuthenticatedStudent: !!studentSession,
        currentClass,
        isLoading,
        setRole,
        loginTeacher,
        registerTeacher,
        logoutTeacher,
        loginAsTeacherQuick,
        loginTeacherWithGoogle,
        loginStudent,
        registerStudent,
        loginStudentWithGoogle,
        loginAsStudent,
        logoutStudent,
        logout,
        updateTeacherProfile,
        updateStudentProfile,
        refreshUserData,
        setCurrentClass
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

