import { studentRepo, classRepo, lessonRepo, progressRepo, teacherRepo } from '../repositories';
import { Student, StudentSession, ClassEntity, Enrollment, EnrolledClassInfo } from '../types';
import { apiClient, mapErrorCodeToMessage } from './apiClient';
import { studentAuthService } from './studentAuthService';
import { db, ensureFirebaseAuth, safeSetDoc } from '../lib/firebase';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';

const STUDENT_SESSION_KEY = 'sb_lms_student_session_v1';
const STUDENT_TOKEN_KEY = 'sblms_student_token';
const ENROLLED_CLASSES_PREFIX = 'sblms_enrolled_classes_';

function getLocalEnrolledClasses(studentId: string): ClassEntity[] {
  if (!studentId) return [];
  try {
    const raw = localStorage.getItem(`${ENROLLED_CLASSES_PREFIX}${studentId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalEnrolledClass(studentId: string, cls: ClassEntity): void {
  if (!studentId || !cls || !cls.id) return;
  try {
    const existing = getLocalEnrolledClasses(studentId);
    if (!existing.some(c => c.id === cls.id || (c.classCode && c.classCode === cls.classCode))) {
      existing.push(cls);
      localStorage.setItem(`${ENROLLED_CLASSES_PREFIX}${studentId}`, JSON.stringify(existing));
    }
  } catch (e) {
    console.warn('[studentService] Failed to save local enrolled class:', e);
  }
}

export const studentService = {
  async getStudentsByClass(classId: string): Promise<Student[]> {
    return studentRepo.getByClassId(classId);
  },

  async getStudentById(id: string): Promise<Student | null> {
    return studentRepo.getById(id);
  },

  /**
   * Resilient join class flow:
   * 1. Attempts Local Express API (/api/student/classes/join)
   * 2. If unavailable (Vercel SPA, offline, network failure), seamlessly resolves class
   *    via Cloud Firestore & Repositories and persists enrollment directly to Cloud Firestore & Local Cache.
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

    const currentSession = this.getCurrentSession();
    const token = this.getStudentToken();
    const studentId = currentSession?.studentId || (token ? `std_${token.slice(-8)}` : '');
    const studentName = currentSession?.fullName || 'Học sinh';
    const studentEmail = currentSession?.email || '';

    // Step 1: Call server API if server is reachable
    let serverReturnedDisabled = false;
    try {
      const res = await fetch('/api/student/classes/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
          'x-student-token': token || '',
          'x-student-id': studentId,
          'x-student-name': encodeURIComponent(studentName),
          'x-student-email': studentEmail
        },
        body: JSON.stringify({
          classCode: cleanCode,
          token: token || '',
          studentId,
          studentName,
          studentEmail
        })
      });

      const text = await res.text();
      if (text && text.trim().startsWith('{')) {
        const data = JSON.parse(text);
        if (res.ok && data.success && data.class) {
          if (currentSession) {
            currentSession.classId = data.class.id;
            this.setSession(currentSession);
          }
          saveLocalEnrolledClass(studentId, data.class);
          return {
            success: true,
            class: data.class,
            enrollment: data.enrollment,
            alreadyEnrolled: !!data.alreadyEnrolled
          };
        }

        if (data.errorCode === 'CLASS_JOIN_DISABLED') {
          serverReturnedDisabled = true;
        }
      }
    } catch {
      // Server API unreachable or returned non-JSON (e.g. static hosting on Vercel)
    }

    if (serverReturnedDisabled) {
      return {
        success: false,
        errorCode: 'CLASS_JOIN_DISABLED',
        error: 'Lớp học hiện chưa cho phép tham gia.'
      };
    }

    // Step 2: Resilient Cloud Firestore & Class Repository Resolution
    let targetClass: ClassEntity | null = null;

    try {
      targetClass = await classRepo.getByCode(cleanCode);
    } catch (e) {
      console.warn('[studentService] classRepo.getByCode warning:', e);
    }

    if (!targetClass) {
      try {
        const allClasses = await classRepo.getAll();
        const normTarget = cleanCode.replace(/[\s\-_]/g, '');
        targetClass = allClasses.find(c => {
          const code = (c.classCode || c.id || '').toUpperCase().trim();
          return code === cleanCode || code.replace(/[\s\-_]/g, '') === normTarget;
        }) || null;
      } catch (e) {
        console.warn('[studentService] classRepo.getAll warning:', e);
      }
    }

    if (!targetClass) {
      // Direct Firestore check
      try {
        await ensureFirebaseAuth();
        const directSnap = await getDoc(doc(db, 'classes', cleanCode));
        if (directSnap.exists()) {
          targetClass = { id: directSnap.id, ...directSnap.data() } as ClassEntity;
        } else {
          const q = query(collection(db, 'classes'), where('classCode', '==', cleanCode));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            const first = qSnap.docs[0];
            targetClass = { id: first.id, ...first.data() } as ClassEntity;
          }
        }
      } catch (e) {
        console.warn('[studentService] Direct Firestore lookup warning:', e);
      }
    }

    // Step 3: Try Google Apps Script if configured
    if (!targetClass && apiClient.isAppsScriptConfigured()) {
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
          if (currentSession) {
            currentSession.classId = gasRes.class.id;
            this.setSession(currentSession);
          }
          saveLocalEnrolledClass(studentId, gasRes.class);
          return {
            success: true,
            class: gasRes.class,
            enrollment: gasRes.enrollment,
            alreadyEnrolled: !!gasRes.alreadyEnrolled
          };
        }

        if (gasRes.errorCode === 'CLASS_JOIN_DISABLED') {
          return {
            success: false,
            errorCode: 'CLASS_JOIN_DISABLED',
            error: 'Lớp học hiện chưa cho phép tham gia.'
          };
        }
      } catch (gasErr) {
        console.warn('[studentService] Apps Script fallback warning:', gasErr);
      }
    }

    // If still not found after checking all sources
    if (!targetClass) {
      return {
        success: false,
        errorCode: 'CLASS_NOT_FOUND',
        error: `Không tìm thấy lớp học với mã "${cleanCode}". Vui lòng kiểm tra lại mã do Thầy/Cô cung cấp.`
      };
    }

    if (targetClass.status === 'inactive' || targetClass.joinEnabled === false) {
      return {
        success: false,
        errorCode: 'CLASS_JOIN_DISABLED',
        error: 'Lớp học hiện chưa cho phép tham gia.'
      };
    }

    const localList = getLocalEnrolledClasses(studentId);
    const isAlready = (currentSession?.classId === targetClass.id) ||
      localList.some(c => c.id === targetClass!.id);

    const enrollmentId = `enr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();
    const effectiveStudentId = studentId || `std_${Date.now()}`;

    const newEnrollment: Enrollment = {
      id: enrollmentId,
      studentId: effectiveStudentId,
      classId: targetClass.id,
      status: 'active',
      enrolledAt: now
    };

    // Persist into Cloud Firestore: classes/{code}/members/{studentId}, students, enrollments
    try {
      await ensureFirebaseAuth();
      const classKey = (targetClass.classCode || targetClass.id).toUpperCase().trim();
      const memberData = {
        studentId: effectiveStudentId,
        name: studentName,
        fullName: studentName,
        email: studentEmail,
        classCode: targetClass.classCode || targetClass.id,
        classId: targetClass.id,
        joinedAt: now,
        status: 'active',
        progress: 0
      };

      await safeSetDoc(doc(db, 'classes', classKey, 'members', effectiveStudentId), memberData, { merge: true });
      if (targetClass.id !== classKey) {
        await safeSetDoc(doc(db, 'classes', targetClass.id, 'members', effectiveStudentId), memberData, { merge: true });
      }

      await safeSetDoc(doc(db, 'students', effectiveStudentId), {
        id: effectiveStudentId,
        fullName: studentName,
        email: studentEmail,
        classId: targetClass.id,
        status: 'active',
        joinedAt: now
      }, { merge: true });

      await safeSetDoc(doc(db, 'enrollments', enrollmentId), newEnrollment);
    } catch (fsErr) {
      console.warn('[studentService] Firestore enrollment write warning:', fsErr);
    }

    // Persist to local session and local storage
    if (currentSession) {
      currentSession.classId = targetClass.id;
      this.setSession(currentSession);
    }
    saveLocalEnrolledClass(effectiveStudentId, targetClass);

    return {
      success: true,
      class: targetClass,
      enrollment: newEnrollment,
      alreadyEnrolled: isAlready
    };
  },

  /**
   * Get all classes the current student is enrolled in, with real progress and nearest deadline
   */
  async getMyEnrolledClasses(): Promise<EnrolledClassInfo[]> {
    const token = this.getStudentToken();
    const session = this.getCurrentSession();
    const studentId = session?.studentId || '';

    // 1. Try local server API
    if (token) {
      try {
        const res = await fetch('/api/student/classes', {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-student-token': token,
            'x-student-id': studentId,
            'x-student-email': session?.email || ''
          }
        });
        const text = await res.text();
        if (text && text.trim().startsWith('{')) {
          const data = JSON.parse(text);
          if (res.ok && data.success && Array.isArray(data.classes) && data.classes.length > 0) {
            data.classes.forEach((item: EnrolledClassInfo) => {
              if (item.classEntity) saveLocalEnrolledClass(studentId, item.classEntity);
            });
            return data.classes;
          }
        }
      } catch {
        // Offline / Vercel SPA mode
      }
    }

    // 2. Apps Script fallback
    if (apiClient.isAppsScriptConfigured() && token) {
      try {
        const gasRes = await apiClient.post<{ success: boolean; classes: EnrolledClassInfo[] }>(
          'student.classes.getMyClasses',
          { token }
        );
        if (gasRes.success && Array.isArray(gasRes.classes) && gasRes.classes.length > 0) {
          gasRes.classes.forEach((item: EnrolledClassInfo) => {
            if (item.classEntity) saveLocalEnrolledClass(studentId, item.classEntity);
          });
          return gasRes.classes;
        }
      } catch {
        // Ignore fallback error
      }
    }

    // 3. Resilient Direct Firestore & Local Repository Fallback
    return this.resolveEnrolledClassesFallback(studentId, session?.classId);
  },

  async resolveEnrolledClassesFallback(studentId: string, sessionClassId?: string): Promise<EnrolledClassInfo[]> {
    const classIdSet = new Set<string>();

    if (sessionClassId) {
      classIdSet.add(sessionClassId);
    }

    if (studentId) {
      const localClasses = getLocalEnrolledClasses(studentId);
      localClasses.forEach(c => {
        if (c.id) classIdSet.add(c.id);
        if (c.classCode) classIdSet.add(c.classCode);
      });

      try {
        await ensureFirebaseAuth();
        const q = query(collection(db, 'enrollments'), where('studentId', '==', studentId));
        const snap = await getDocs(q);
        snap.forEach(d => {
          const data = d.data();
          if (data.classId && data.status !== 'inactive') {
            classIdSet.add(data.classId);
          }
        });
      } catch (e) {
        console.warn('[studentService] Firestore enrollments query warning:', e);
      }
    }

    const result: EnrolledClassInfo[] = [];

    for (const cId of classIdSet) {
      try {
        const cls = await classRepo.getById(cId) || await classRepo.getByCode(cId);
        if (!cls) continue;
        if (result.some(r => r.classEntity.id === cls.id)) continue;

        const [teacher, lessons] = await Promise.all([
          cls.teacherId ? teacherRepo.getById(cls.teacherId).catch(() => null) : Promise.resolve(null),
          lessonRepo.getByClassId(cls.id).catch(() => [])
        ]);

        let completedCount = 0;
        if (studentId && lessons.length > 0) {
          try {
            const summaries = await Promise.all(
              lessons.map(l => progressRepo.getByStudentAndLesson(studentId, l.id).catch(() => null))
            );
            completedCount = summaries.filter(p => p && p.progressPercentage >= 100).length;
          } catch {}
        }

        const progressPercent = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

        result.push({
          enrollment: {
            id: `enr_${cls.id}_${studentId || 'std'}`,
            studentId: studentId || '',
            classId: cls.id,
            status: 'active',
            enrolledAt: new Date().toISOString()
          },
          classEntity: cls,
          teacher: teacher || null,
          lessonCount: lessons.length,
          completedLessonCount: completedCount,
          progressPercent,
          nearestDeadline: null
        });
      } catch (err) {
        console.warn(`[studentService] Failed to load enrolled class info for ${cId}:`, err);
      }
    }

    return result;
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


