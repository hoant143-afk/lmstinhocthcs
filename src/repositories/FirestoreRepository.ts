import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db, ensureFirebaseAuth } from '../lib/firebase';
import {
  Teacher,
  ClassEntity,
  Student,
  Lesson,
  Task,
  TaskProgress,
  Assignment,
  Submission,
  Announcement,
  Certificate
} from '../types';
import {
  ITeacherRepository,
  IClassRepository,
  IStudentRepository,
  ILessonRepository,
  ITaskRepository,
  IProgressRepository,
  IAssignmentRepository,
  ISubmissionRepository,
  IAnnouncementRepository,
  ICertificateRepository
} from './interfaces';
import {
  SEED_TEACHERS,
  SEED_CLASSES,
  SEED_STUDENTS,
  SEED_LESSONS,
  SEED_TASKS,
  SEED_ASSIGNMENTS,
  SEED_ANNOUNCEMENTS
} from '../data/seedData';

// Track initialization state
let isDatabaseSeeded = false;
let seedingPromise: Promise<void> | null = null;

export async function ensureFirestoreDatabaseSeeded(): Promise<void> {
  if (isDatabaseSeeded) return;
  if (seedingPromise) return seedingPromise;

  seedingPromise = (async () => {
    try {
      await ensureFirebaseAuth();
      // Check if classes collection has data
      const classesSnap = await getDocs(collection(db, 'classes'));
      if (classesSnap.empty) {
        console.log('[Firestore] Database is empty. Seeding initial data to Cloud Firestore...');
        
        // 1. Seed Teachers
        for (const t of SEED_TEACHERS) {
          await setDoc(doc(db, 'teachers', t.id), t);
        }

        // 2. Seed Classes
        for (const c of SEED_CLASSES) {
          const code = c.classCode.toUpperCase().trim();
          const classData = {
            ...c,
            classCode: code,
            active: true,
            createdAt: c.createdAt || new Date().toISOString(),
            updatedAt: c.updatedAt || new Date().toISOString()
          };
          // Save by classCode as document ID
          await setDoc(doc(db, 'classes', code), classData);
          // Also save by id if different
          if (c.id && c.id !== code) {
            await setDoc(doc(db, 'classes', c.id), classData);
          }
        }

        // 3. Seed Students
        for (const s of SEED_STUDENTS) {
          await setDoc(doc(db, 'students', s.id), s);
          // Find class
          const cls = SEED_CLASSES.find(c => c.id === s.classId);
          if (cls) {
            const classCode = cls.classCode.toUpperCase().trim();
            await setDoc(doc(db, 'classes', classCode, 'members', s.id), {
              studentId: s.id,
              name: s.fullName,
              fullName: s.fullName,
              classCode,
              classId: s.classId,
              joinedAt: s.joinedAt || new Date().toISOString(),
              progress: 0
            });
          }
        }

        // 4. Seed Lessons
        for (const l of SEED_LESSONS) {
          await setDoc(doc(db, 'lessons', l.id), l);
          const cls = SEED_CLASSES.find(c => c.id === l.classId);
          if (cls) {
            const classCode = cls.classCode.toUpperCase().trim();
            await setDoc(doc(db, 'classes', classCode, 'lessons', l.id), l);
          }
        }

        // 5. Seed Tasks
        for (const t of SEED_TASKS) {
          await setDoc(doc(db, 'tasks', t.id), t);
        }

        // 6. Seed Assignments
        for (const a of SEED_ASSIGNMENTS) {
          await setDoc(doc(db, 'assignments', a.id), a);
        }

        // 7. Seed Announcements
        for (const ann of SEED_ANNOUNCEMENTS) {
          await setDoc(doc(db, 'announcements', ann.id), ann);
        }

        console.log('[Firestore] Seed data populated successfully to Cloud Firestore!');
      }
      isDatabaseSeeded = true;
    } catch (err) {
      console.warn('[Firestore] Auto-seed check warning (will proceed normally):', err);
    }
  })();

  return seedingPromise;
}

// ----------------------------------------------------
// 1. TEACHER REPOSITORY
// ----------------------------------------------------
export class FirestoreTeacherRepository implements ITeacherRepository {
  private currentTeacherId: string | null = 'teacher_01';

  async getAll(): Promise<Teacher[]> {
    await ensureFirestoreDatabaseSeeded();
    try {
      const snap = await getDocs(collection(db, 'teachers'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Teacher));
    } catch (e) {
      console.error('[Firestore] getAll teachers error:', e);
      throw e;
    }
  }

  async getById(id: string): Promise<Teacher | null> {
    await ensureFirestoreDatabaseSeeded();
    try {
      const snap = await getDoc(doc(db, 'teachers', id));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as Teacher;
    } catch (e) {
      console.error('[Firestore] getById teacher error:', e);
      throw e;
    }
  }

  async getByEmail(email: string): Promise<Teacher | null> {
    await ensureFirestoreDatabaseSeeded();
    try {
      const q = query(collection(db, 'teachers'), where('email', '==', email.trim().toLowerCase()));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const first = snap.docs[0];
      return { id: first.id, ...first.data() } as Teacher;
    } catch (e) {
      console.error('[Firestore] getByEmail teacher error:', e);
      throw e;
    }
  }

  async create(data: Omit<Teacher, 'id' | 'createdAt'>): Promise<Teacher> {
    await ensureFirestoreDatabaseSeeded();
    const id = `teacher_${Date.now()}`;
    const newTeacher: Teacher = {
      ...data,
      id,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'teachers', id), newTeacher);
    return newTeacher;
  }

  async getCurrentTeacher(): Promise<Teacher | null> {
    const id = localStorage.getItem('sblms_current_teacher_id') || this.currentTeacherId || 'teacher_01';
    return this.getById(id);
  }

  async setCurrentTeacher(teacher: Teacher | null): Promise<void> {
    if (teacher) {
      this.currentTeacherId = teacher.id;
      localStorage.setItem('sblms_current_teacher_id', teacher.id);
    } else {
      this.currentTeacherId = null;
      localStorage.removeItem('sblms_current_teacher_id');
    }
  }

  async updateTeacher(id: string, data: Partial<Teacher>): Promise<Teacher | null> {
    await ensureFirestoreDatabaseSeeded();
    await updateDoc(doc(db, 'teachers', id), data);
    return this.getById(id);
  }
}

// ----------------------------------------------------
// 2. CLASS REPOSITORY (Cloud Firestore: classes/{CLASS_CODE})
// ----------------------------------------------------
export class FirestoreClassRepository implements IClassRepository {
  async getAll(): Promise<ClassEntity[]> {
    await ensureFirestoreDatabaseSeeded();
    try {
      const snap = await getDocs(collection(db, 'classes'));
      const list: ClassEntity[] = [];
      const seen = new Set<string>();

      for (const d of snap.docs) {
        const item = { id: d.id, ...d.data() } as ClassEntity;
        const key = (item.classCode || d.id).toUpperCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          list.push(item);
        }
      }
      return list;
    } catch (e) {
      console.error('[Firestore] getAll classes error:', e);
      throw e;
    }
  }

  async getAllByTeacher(teacherId: string): Promise<ClassEntity[]> {
    const all = await this.getAll();
    return all.filter(c => c.teacherId === teacherId);
  }

  async getById(id: string): Promise<ClassEntity | null> {
    await ensureFirestoreDatabaseSeeded();
    try {
      const snap = await getDoc(doc(db, 'classes', id));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as ClassEntity;
      }
      // If not found by doc id, search by classCode or id field
      const all = await this.getAll();
      return all.find(c => c.id === id || c.classCode === id) || null;
    } catch (e) {
      console.error('[Firestore] getById class error:', e);
      throw e;
    }
  }

  async getByCode(classCode: string): Promise<ClassEntity | null> {
    await ensureFirestoreDatabaseSeeded();
    const cleanCode = (classCode || '').trim().toUpperCase();
    if (!cleanCode) return null;

    try {
      // 1. Direct document lookup at classes/{CLASS_CODE}
      const directSnap = await getDoc(doc(db, 'classes', cleanCode));
      if (directSnap.exists()) {
        return { id: directSnap.id, ...directSnap.data() } as ClassEntity;
      }

      // 2. Query where classCode == cleanCode
      const q = query(collection(db, 'classes'), where('classCode', '==', cleanCode));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        const first = qSnap.docs[0];
        return { id: first.id, ...first.data() } as ClassEntity;
      }

      // 3. Normalized comparison (handling dashes, spaces, case)
      const all = await this.getAll();
      const cleanNorm = cleanCode.replace(/[\s\-_]/g, '');
      const found = all.find(c => {
        const cCode = (c.classCode || '').toUpperCase().trim();
        return cCode === cleanCode || cCode.replace(/[\s\-_]/g, '') === cleanNorm;
      });

      return found || null;
    } catch (e) {
      console.error('[Firestore] getByCode error:', e);
      throw e;
    }
  }

  async create(classData: Omit<ClassEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClassEntity> {
    await ensureFirebaseAuth();
    await ensureFirestoreDatabaseSeeded();
    
    const code = classData.classCode.trim().toUpperCase();
    const id = code;
    const now = new Date().toISOString();

    const newClass: ClassEntity = {
      ...classData,
      id,
      classCode: code,
      createdAt: now,
      updatedAt: now
    };

    // Save directly to Cloud Firestore at path: classes/{CLASS_CODE}
    const firestoreData = {
      ...newClass,
      active: true,
      createdAt: now,
      updatedAt: now
    };

    await setDoc(doc(db, 'classes', code), firestoreData);
    console.log(`[Firestore] Class created successfully on Cloud Firestore at classes/${code}`);

    return newClass;
  }

  async update(id: string, classData: Partial<ClassEntity>): Promise<ClassEntity | null> {
    await ensureFirebaseAuth();
    await ensureFirestoreDatabaseSeeded();
    
    const now = new Date().toISOString();
    const updatePayload = {
      ...classData,
      updatedAt: now
    };

    // Update in classes collection
    const target = await this.getById(id);
    if (!target) return null;

    const code = (target.classCode || id).toUpperCase().trim();
    await setDoc(doc(db, 'classes', code), updatePayload, { merge: true });
    if (id !== code) {
      await setDoc(doc(db, 'classes', id), updatePayload, { merge: true });
    }

    return this.getById(id);
  }

  async delete(id: string): Promise<boolean> {
    await ensureFirebaseAuth();
    try {
      const target = await this.getById(id);
      if (!target) return false;
      const code = (target.classCode || id).toUpperCase().trim();
      await deleteDoc(doc(db, 'classes', code));
      if (id !== code) {
        await deleteDoc(doc(db, 'classes', id));
      }
      return true;
    } catch (e) {
      console.error('[Firestore] delete class error:', e);
      throw e;
    }
  }
}

// ----------------------------------------------------
// 3. STUDENT REPOSITORY (Cloud Firestore: classes/{CLASS_CODE}/members/{STUDENT_ID} & students)
// ----------------------------------------------------
export class FirestoreStudentRepository implements IStudentRepository {
  async getByClassId(classId: string): Promise<Student[]> {
    await ensureFirestoreDatabaseSeeded();
    try {
      const cleanId = classId.trim();
      const code = cleanId.toUpperCase();

      // Check subcollection classes/{classCode}/members
      const membersSnap = await getDocs(collection(db, 'classes', code, 'members'));
      if (!membersSnap.empty) {
        return membersSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            classId: data.classId || classId,
            fullName: data.name || data.fullName,
            email: data.email,
            avatarUrl: data.avatarUrl,
            joinedAt: data.joinedAt || new Date().toISOString(),
            status: data.status || 'active'
          } as Student;
        });
      }

      // Check root students collection
      const q = query(collection(db, 'students'), where('classId', '==', classId));
      const rootSnap = await getDocs(q);
      return rootSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
    } catch (e) {
      console.error('[Firestore] getByClassId students error:', e);
      throw e;
    }
  }

  async getById(id: string): Promise<Student | null> {
    await ensureFirestoreDatabaseSeeded();
    try {
      const snap = await getDoc(doc(db, 'students', id));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Student;
      }
      return null;
    } catch (e) {
      console.error('[Firestore] getById student error:', e);
      throw e;
    }
  }

  async getByNameAndClass(fullName: string, classId: string): Promise<Student | null> {
    const list = await this.getByClassId(classId);
    const clean = fullName.toLowerCase().trim();
    return list.find(s => s.fullName.toLowerCase().trim() === clean) || null;
  }

  async create(studentData: Omit<Student, 'id' | 'joinedAt'>): Promise<Student> {
    await ensureFirebaseAuth();
    const id = `std_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const joinedAt = new Date().toISOString();

    const student: Student = {
      ...studentData,
      id,
      joinedAt
    };

    // 1. Save to root students collection
    await setDoc(doc(db, 'students', id), student);

    // 2. Save to classes/{classCode}/members/{studentId}
    const classCode = studentData.classId.toUpperCase().trim();
    await setDoc(doc(db, 'classes', classCode, 'members', id), {
      studentId: id,
      name: studentData.fullName,
      fullName: studentData.fullName,
      classCode,
      classId: studentData.classId,
      joinedAt,
      status: studentData.status || 'active',
      progress: 0
    });

    console.log(`[Firestore] Student saved to Firestore at classes/${classCode}/members/${id}`);
    return student;
  }

  async update(id: string, data: Partial<Student>): Promise<Student | null> {
    await ensureFirebaseAuth();
    await updateDoc(doc(db, 'students', id), data);
    return this.getById(id);
  }

  async delete(id: string): Promise<boolean> {
    await ensureFirebaseAuth();
    try {
      await deleteDoc(doc(db, 'students', id));
      return true;
    } catch (e) {
      console.error('[Firestore] delete student error:', e);
      throw e;
    }
  }
}

// ----------------------------------------------------
// 4. LESSON REPOSITORY (Cloud Firestore: classes/{CLASS_CODE}/lessons/{LESSON_ID} & lessons)
// ----------------------------------------------------
export class FirestoreLessonRepository implements ILessonRepository {
  async getAll(): Promise<Lesson[]> {
    await ensureFirestoreDatabaseSeeded();
    try {
      const snap = await getDocs(collection(db, 'lessons'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Lesson));
    } catch (e) {
      console.error('[Firestore] getAll lessons error:', e);
      throw e;
    }
  }

  async getByClassId(classId: string): Promise<Lesson[]> {
    await ensureFirestoreDatabaseSeeded();
    try {
      const code = classId.toUpperCase().trim();
      // Check subcollection classes/{classCode}/lessons
      const subSnap = await getDocs(collection(db, 'classes', code, 'lessons'));
      if (!subSnap.empty) {
        return subSnap.docs.map(d => ({ id: d.id, ...d.data() } as Lesson));
      }

      // Check root lessons collection
      const q = query(collection(db, 'lessons'), where('classId', '==', classId));
      const rootSnap = await getDocs(q);
      return rootSnap.docs.map(d => ({ id: d.id, ...d.data() } as Lesson));
    } catch (e) {
      console.error('[Firestore] getByClassId lessons error:', e);
      throw e;
    }
  }

  async getById(id: string): Promise<Lesson | null> {
    await ensureFirestoreDatabaseSeeded();
    try {
      const snap = await getDoc(doc(db, 'lessons', id));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Lesson;
      }
      return null;
    } catch (e) {
      console.error('[Firestore] getById lesson error:', e);
      throw e;
    }
  }

  async getTemplatesByTeacher(teacherId: string): Promise<Lesson[]> {
    const all = await this.getAll();
    return all.filter(l => l.isTemplate && l.authorTeacherId === teacherId);
  }

  async create(lessonData: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lesson> {
    await ensureFirebaseAuth();
    const id = `lesson_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const now = new Date().toISOString();

    const newLesson: Lesson = {
      ...lessonData,
      id,
      createdAt: now,
      updatedAt: now
    };

    // Save to root lessons collection
    await setDoc(doc(db, 'lessons', id), newLesson);

    // Also save to classes/{classCode}/lessons/{lessonId}
    if (lessonData.classId) {
      const code = lessonData.classId.toUpperCase().trim();
      await setDoc(doc(db, 'classes', code, 'lessons', id), newLesson);
    }

    console.log(`[Firestore] Lesson created on Cloud Firestore: ${id}`);
    return newLesson;
  }

  async update(id: string, data: Partial<Lesson>): Promise<Lesson | null> {
    await ensureFirebaseAuth();
    const now = new Date().toISOString();
    const payload = { ...data, updatedAt: now };

    await setDoc(doc(db, 'lessons', id), payload, { merge: true });

    const current = await this.getById(id);
    if (current && current.classId) {
      const code = current.classId.toUpperCase().trim();
      await setDoc(doc(db, 'classes', code, 'lessons', id), payload, { merge: true });
    }

    return this.getById(id);
  }

  async delete(id: string): Promise<boolean> {
    await ensureFirebaseAuth();
    try {
      const current = await this.getById(id);
      await deleteDoc(doc(db, 'lessons', id));
      if (current && current.classId) {
        const code = current.classId.toUpperCase().trim();
        await deleteDoc(doc(db, 'classes', code, 'lessons', id));
      }
      return true;
    } catch (e) {
      console.error('[Firestore] delete lesson error:', e);
      throw e;
    }
  }

  async duplicate(lessonId: string, targetClassId?: string): Promise<Lesson | null> {
    const orig = await this.getById(lessonId);
    if (!orig) return null;

    return this.create({
      ...orig,
      title: `${orig.title} (Bản sao)`,
      classId: targetClassId || orig.classId,
      status: 'draft',
      isTemplate: false
    });
  }
}

// ----------------------------------------------------
// 5. TASK REPOSITORY (Cloud Firestore: tasks)
// ----------------------------------------------------
export class FirestoreTaskRepository implements ITaskRepository {
  async getByLessonId(lessonId: string): Promise<Task[]> {
    await ensureFirestoreDatabaseSeeded();
    try {
      const q = query(collection(db, 'tasks'), where('lessonId', '==', lessonId));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
      return list.sort((a, b) => a.order - b.order);
    } catch (e) {
      console.error('[Firestore] getByLessonId tasks error:', e);
      throw e;
    }
  }

  async getById(id: string): Promise<Task | null> {
    await ensureFirestoreDatabaseSeeded();
    try {
      const snap = await getDoc(doc(db, 'tasks', id));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Task;
      }
      return null;
    } catch (e) {
      console.error('[Firestore] getById task error:', e);
      throw e;
    }
  }

  async create(taskData: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
    await ensureFirebaseAuth();
    const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newTask: Task = {
      ...taskData,
      id,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'tasks', id), newTask);
    return newTask;
  }

  async update(id: string, data: Partial<Task>): Promise<Task | null> {
    await ensureFirebaseAuth();
    await setDoc(doc(db, 'tasks', id), data, { merge: true });
    return this.getById(id);
  }

  async delete(id: string): Promise<boolean> {
    await ensureFirebaseAuth();
    try {
      await deleteDoc(doc(db, 'tasks', id));
      return true;
    } catch (e) {
      console.error('[Firestore] delete task error:', e);
      throw e;
    }
  }

  async reorder(lessonId: string, taskIds: string[]): Promise<boolean> {
    await ensureFirebaseAuth();
    for (let i = 0; i < taskIds.length; i++) {
      await updateDoc(doc(db, 'tasks', taskIds[i]), { order: i + 1 });
    }
    return true;
  }
}

// ----------------------------------------------------
// 6. PROGRESS REPOSITORY (Cloud Firestore: progress)
// ----------------------------------------------------
export class FirestoreProgressRepository implements IProgressRepository {
  async getByStudentAndLesson(studentId: string, lessonId: string): Promise<TaskProgress[]> {
    await ensureFirestoreDatabaseSeeded();
    try {
      const q = query(
        collection(db, 'progress'),
        where('studentId', '==', studentId),
        where('lessonId', '==', lessonId)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskProgress));
    } catch (e) {
      console.error('[Firestore] getByStudentAndLesson progress error:', e);
      throw e;
    }
  }

  async getByStudentAndTask(studentId: string, taskId: string): Promise<TaskProgress | null> {
    await ensureFirestoreDatabaseSeeded();
    try {
      const q = query(
        collection(db, 'progress'),
        where('studentId', '==', studentId),
        where('taskId', '==', taskId)
      );
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const d = snap.docs[0];
      return { id: d.id, ...d.data() } as TaskProgress;
    } catch (e) {
      console.error('[Firestore] getByStudentAndTask progress error:', e);
      throw e;
    }
  }

  async getAllByStudent(studentId: string): Promise<TaskProgress[]> {
    await ensureFirestoreDatabaseSeeded();
    try {
      const q = query(collection(db, 'progress'), where('studentId', '==', studentId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskProgress));
    } catch (e) {
      console.error('[Firestore] getAllByStudent progress error:', e);
      throw e;
    }
  }

  async getAllByClass(classId: string): Promise<TaskProgress[]> {
    await ensureFirestoreDatabaseSeeded();
    try {
      const snap = await getDocs(collection(db, 'progress'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskProgress));
    } catch (e) {
      console.error('[Firestore] getAllByClass progress error:', e);
      throw e;
    }
  }

  async upsert(progress: Omit<TaskProgress, 'id'> & { id?: string }): Promise<TaskProgress> {
    await ensureFirebaseAuth();
    const id = progress.id || `prog_${progress.studentId}_${progress.taskId}`;
    const item: TaskProgress = {
      ...progress,
      id,
      lastUpdatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'progress', id), item, { merge: true });
    return item;
  }

  async batchUpsert(progressList: (Omit<TaskProgress, 'id'> & { id?: string })[]): Promise<boolean> {
    for (const p of progressList) {
      await this.upsert(p);
    }
    return true;
  }
}

// ----------------------------------------------------
// 7. ASSIGNMENT REPOSITORY (Cloud Firestore: assignments)
// ----------------------------------------------------
export class FirestoreAssignmentRepository implements IAssignmentRepository {
  async getByLessonId(lessonId: string): Promise<Assignment[]> {
    await ensureFirestoreDatabaseSeeded();
    try {
      const q = query(collection(db, 'assignments'), where('lessonId', '==', lessonId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Assignment));
    } catch (e) {
      console.error('[Firestore] getByLessonId assignments error:', e);
      throw e;
    }
  }

  async getByTaskId(taskId: string): Promise<Assignment | null> {
    await ensureFirestoreDatabaseSeeded();
    try {
      const q = query(collection(db, 'assignments'), where('taskId', '==', taskId));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const d = snap.docs[0];
      return { id: d.id, ...d.data() } as Assignment;
    } catch (e) {
      console.error('[Firestore] getByTaskId assignment error:', e);
      throw e;
    }
  }

  async getById(id: string): Promise<Assignment | null> {
    await ensureFirestoreDatabaseSeeded();
    try {
      const snap = await getDoc(doc(db, 'assignments', id));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Assignment;
      }
      return null;
    } catch (e) {
      console.error('[Firestore] getById assignment error:', e);
      throw e;
    }
  }

  async create(assignmentData: Omit<Assignment, 'id'>): Promise<Assignment> {
    await ensureFirebaseAuth();
    const id = `asgn_${Date.now()}`;
    const newAsgn: Assignment = {
      ...assignmentData,
      id
    };
    await setDoc(doc(db, 'assignments', id), newAsgn);
    return newAsgn;
  }

  async update(id: string, data: Partial<Assignment>): Promise<Assignment | null> {
    await ensureFirebaseAuth();
    await setDoc(doc(db, 'assignments', id), data, { merge: true });
    return this.getById(id);
  }

  async delete(id: string): Promise<boolean> {
    await ensureFirebaseAuth();
    try {
      await deleteDoc(doc(db, 'assignments', id));
      return true;
    } catch (e) {
      console.error('[Firestore] delete assignment error:', e);
      throw e;
    }
  }
}

// ----------------------------------------------------
// 8. SUBMISSION REPOSITORY (Cloud Firestore: submissions)
// ----------------------------------------------------
export class FirestoreSubmissionRepository implements ISubmissionRepository {
  async getByAssignmentId(assignmentId: string): Promise<Submission[]> {
    await ensureFirestoreDatabaseSeeded();
    try {
      const q = query(collection(db, 'submissions'), where('assignmentId', '==', assignmentId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Submission));
    } catch (e) {
      console.error('[Firestore] getByAssignmentId submissions error:', e);
      throw e;
    }
  }

  async getByLessonId(lessonId: string): Promise<Submission[]> {
    await ensureFirestoreDatabaseSeeded();
    try {
      const q = query(collection(db, 'submissions'), where('lessonId', '==', lessonId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Submission));
    } catch (e) {
      console.error('[Firestore] getByLessonId submissions error:', e);
      throw e;
    }
  }

  async getByClassId(classId: string): Promise<Submission[]> {
    await ensureFirestoreDatabaseSeeded();
    try {
      const snap = await getDocs(collection(db, 'submissions'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Submission));
    } catch (e) {
      console.error('[Firestore] getByClassId submissions error:', e);
      throw e;
    }
  }

  async getByStudentId(studentId: string): Promise<Submission[]> {
    await ensureFirestoreDatabaseSeeded();
    try {
      const q = query(collection(db, 'submissions'), where('studentId', '==', studentId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Submission));
    } catch (e) {
      console.error('[Firestore] getByStudentId submissions error:', e);
      throw e;
    }
  }

  async getByStudentAndTask(studentId: string, taskId: string): Promise<Submission | null> {
    await ensureFirestoreDatabaseSeeded();
    try {
      const q = query(
        collection(db, 'submissions'),
        where('studentId', '==', studentId),
        where('taskId', '==', taskId)
      );
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const d = snap.docs[0];
      return { id: d.id, ...d.data() } as Submission;
    } catch (e) {
      console.error('[Firestore] getByStudentAndTask submission error:', e);
      throw e;
    }
  }

  async getById(id: string): Promise<Submission | null> {
    await ensureFirestoreDatabaseSeeded();
    try {
      const snap = await getDoc(doc(db, 'submissions', id));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Submission;
      }
      return null;
    } catch (e) {
      console.error('[Firestore] getById submission error:', e);
      throw e;
    }
  }

  async create(subData: Omit<Submission, 'id' | 'submittedAt'>): Promise<Submission> {
    await ensureFirebaseAuth();
    const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newSub: Submission = {
      ...subData,
      id,
      submittedAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'submissions', id), newSub);
    return newSub;
  }

  async grade(submissionId: string, score: number, feedback: string, teacherId: string): Promise<Submission | null> {
    await ensureFirebaseAuth();
    const payload = {
      score,
      feedback,
      gradedByTeacherId: teacherId,
      gradedAt: new Date().toISOString(),
      status: 'graded' as const
    };
    await setDoc(doc(db, 'submissions', submissionId), payload, { merge: true });
    return this.getById(submissionId);
  }
}

// ----------------------------------------------------
// 9. ANNOUNCEMENT REPOSITORY (Cloud Firestore: announcements)
// ----------------------------------------------------
export class FirestoreAnnouncementRepository implements IAnnouncementRepository {
  async getByClassId(classId: string): Promise<Announcement[]> {
    await ensureFirestoreDatabaseSeeded();
    try {
      const q = query(collection(db, 'announcements'), where('classId', '==', classId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
    } catch (e) {
      console.error('[Firestore] getByClassId announcements error:', e);
      throw e;
    }
  }

  async getByTeacherId(teacherId: string): Promise<Announcement[]> {
    await ensureFirestoreDatabaseSeeded();
    try {
      const q = query(collection(db, 'announcements'), where('teacherId', '==', teacherId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
    } catch (e) {
      console.error('[Firestore] getByTeacherId announcements error:', e);
      throw e;
    }
  }

  async getForStudent(classId: string): Promise<Announcement[]> {
    return this.getByClassId(classId);
  }

  async create(data: Omit<Announcement, 'id' | 'createdAt'>): Promise<Announcement> {
    await ensureFirebaseAuth();
    const id = `ann_${Date.now()}`;
    const newAnn: Announcement = {
      ...data,
      id,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'announcements', id), newAnn);
    return newAnn;
  }

  async delete(id: string): Promise<boolean> {
    await ensureFirebaseAuth();
    try {
      await deleteDoc(doc(db, 'announcements', id));
      return true;
    } catch (e) {
      console.error('[Firestore] delete announcement error:', e);
      throw e;
    }
  }
}

// ----------------------------------------------------
// 10. CERTIFICATE REPOSITORY (Cloud Firestore: certificates)
// ----------------------------------------------------
export class FirestoreCertificateRepository implements ICertificateRepository {
  async getByStudentId(studentId: string): Promise<Certificate[]> {
    await ensureFirestoreDatabaseSeeded();
    try {
      const q = query(collection(db, 'certificates'), where('studentId', '==', studentId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Certificate));
    } catch (e) {
      console.error('[Firestore] getByStudentId certificates error:', e);
      throw e;
    }
  }

  async getByClassId(classId: string): Promise<Certificate[]> {
    await ensureFirestoreDatabaseSeeded();
    try {
      const q = query(collection(db, 'certificates'), where('classId', '==', classId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Certificate));
    } catch (e) {
      console.error('[Firestore] getByClassId certificates error:', e);
      throw e;
    }
  }

  async getById(id: string): Promise<Certificate | null> {
    await ensureFirestoreDatabaseSeeded();
    try {
      const snap = await getDoc(doc(db, 'certificates', id));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Certificate;
      }
      return null;
    } catch (e) {
      console.error('[Firestore] getById certificate error:', e);
      throw e;
    }
  }

  async create(certData: Omit<Certificate, 'id' | 'issuedAt'>): Promise<Certificate> {
    await ensureFirebaseAuth();
    const id = `cert_${Date.now()}`;
    const newCert: Certificate = {
      ...certData,
      id,
      issuedAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'certificates', id), newCert);
    return newCert;
  }
}
