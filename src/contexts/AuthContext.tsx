import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserRole, Teacher, StudentSession, ClassEntity, TeacherLoginDto, TeacherRegisterDto } from '../types';
import { teacherRepo, classRepo } from '../repositories';
import { studentService } from '../services/studentService';
import { authService } from '../services/authService';

interface AuthContextType {
  role: UserRole;
  teacher: Teacher | null;
  isAuthenticatedTeacher: boolean;
  studentSession: StudentSession | null;
  currentClass: ClassEntity | null;
  isLoading: boolean;
  setRole: (role: UserRole) => void;
  loginTeacher: (dto: TeacherLoginDto) => Promise<Teacher>;
  registerTeacher: (dto: TeacherRegisterDto) => Promise<Teacher>;
  logoutTeacher: () => Promise<void>;
  loginAsTeacherQuick: (teacherId?: string) => Promise<Teacher>;
  loginAsStudent: (session: StudentSession) => Promise<void>;
  logoutStudent: () => void;
  logout: () => void;
  updateTeacherProfile: (data: Partial<Teacher>) => Promise<Teacher | null>;
  refreshUserData: () => Promise<void>;
  setCurrentClass: (cls: ClassEntity | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_STORAGE_KEY = 'sb_lms_active_role_v1';
const TEACHER_TOKEN_KEY = 'sblms_teacher_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>('ROLE_TEACHER');
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [studentSession, setStudentSession] = useState<StudentSession | null>(null);
  const [currentClass, setCurrentClass] = useState<ClassEntity | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Check saved role or default
      const savedRole = (localStorage.getItem(ROLE_STORAGE_KEY) as UserRole) || 'ROLE_TEACHER';
      setRoleState(savedRole);

      // 2. Load student session if present
      const session = studentService.getCurrentSession();
      setStudentSession(session);

      if (session?.classId) {
        const cls = await classRepo.getById(session.classId);
        if (cls) {
          setCurrentClass(cls);
        }
      }

      // 3. Load teacher from storage/API
      const currentTeacher = await teacherRepo.getCurrentTeacher();
      setTeacher(currentTeacher);

      // If student is logged in and no teacher token, set role to student
      if (session && !localStorage.getItem(TEACHER_TOKEN_KEY) && savedRole !== 'ROLE_TEACHER') {
        setRoleState('ROLE_STUDENT');
      }
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

  const loginAsStudent = async (session: StudentSession) => {
    studentService.setSession(session);
    setStudentSession(session);
    setRole('ROLE_STUDENT');
    if (session.classId) {
      const cls = await classRepo.getById(session.classId);
      setCurrentClass(cls);
    }
  };

  const logoutStudent = () => {
    studentService.clearSession();
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

  const refreshUserData = async () => {
    await initAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        teacher,
        isAuthenticatedTeacher: !!teacher,
        studentSession,
        currentClass,
        isLoading,
        setRole,
        loginTeacher,
        registerTeacher,
        logoutTeacher,
        loginAsTeacherQuick,
        loginAsStudent,
        logoutStudent,
        logout,
        updateTeacherProfile,
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
