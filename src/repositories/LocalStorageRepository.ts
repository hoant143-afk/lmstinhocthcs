import {
  ClassEntity,
  Student,
  Lesson,
  Task,
  TaskProgress,
  Assignment,
  Submission,
  Announcement,
  Certificate,
  Teacher
} from '../types';
import {
  IClassRepository,
  IStudentRepository,
  ILessonRepository,
  ITaskRepository,
  IProgressRepository,
  IAssignmentRepository,
  ISubmissionRepository,
  IAnnouncementRepository,
  ICertificateRepository,
  ITeacherRepository
} from './interfaces';
import {
  SEED_TEACHER,
  SEED_TEACHERS,
  SEED_CLASSES,
  SEED_STUDENTS,
  SEED_LESSONS,
  SEED_TASKS,
  SEED_ASSIGNMENTS,
  SEED_SUBMISSIONS,
  SEED_PROGRESS,
  SEED_ANNOUNCEMENTS,
  SEED_CERTIFICATES
} from '../data/seedData';

const STORAGE_KEYS = {
  TEACHER: 'sb_lms_teacher_v1',
  TEACHERS: 'sb_lms_teachers_list_v1',
  CURRENT_TEACHER_ID: 'sb_lms_current_teacher_id_v1',
  CLASSES: 'sb_lms_classes_v1',
  STUDENTS: 'sb_lms_students_v1',
  LESSONS: 'sb_lms_lessons_v1',
  TASKS: 'sb_lms_tasks_v1',
  ASSIGNMENTS: 'sb_lms_assignments_v1',
  SUBMISSIONS: 'sb_lms_submissions_v1',
  PROGRESS: 'sb_lms_progress_v1',
  ANNOUNCEMENTS: 'sb_lms_announcements_v1',
  CERTIFICATES: 'sb_lms_certificates_v1'
};

function getItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`Failed to read ${key} from localStorage`, error);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save ${key} to localStorage`, error);
  }
}

export function resetAllDataToSeed(): void {
  setItem(STORAGE_KEYS.TEACHER, SEED_TEACHER);
  setItem(STORAGE_KEYS.TEACHERS, SEED_TEACHERS);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_TEACHER_ID);
  setItem(STORAGE_KEYS.CLASSES, SEED_CLASSES);
  setItem(STORAGE_KEYS.STUDENTS, SEED_STUDENTS);
  setItem(STORAGE_KEYS.LESSONS, SEED_LESSONS);
  setItem(STORAGE_KEYS.TASKS, SEED_TASKS);
  setItem(STORAGE_KEYS.ASSIGNMENTS, SEED_ASSIGNMENTS);
  setItem(STORAGE_KEYS.SUBMISSIONS, SEED_SUBMISSIONS);
  setItem(STORAGE_KEYS.PROGRESS, SEED_PROGRESS);
  setItem(STORAGE_KEYS.ANNOUNCEMENTS, SEED_ANNOUNCEMENTS);
  setItem(STORAGE_KEYS.CERTIFICATES, SEED_CERTIFICATES);
}

// 1. Teacher Repository
export class LocalStorageTeacherRepository implements ITeacherRepository {
  async getAll(): Promise<Teacher[]> {
    return getItem<Teacher[]>(STORAGE_KEYS.TEACHERS, SEED_TEACHERS);
  }

  async getById(id: string): Promise<Teacher | null> {
    const teachers = await this.getAll();
    return teachers.find(t => t.id === id) || null;
  }

  async getByEmail(email: string): Promise<Teacher | null> {
    const teachers = await this.getAll();
    const normalized = email.trim().toLowerCase();
    return teachers.find(t => t.email.trim().toLowerCase() === normalized) || null;
  }

  async create(data: Omit<Teacher, 'id' | 'createdAt'>): Promise<Teacher> {
    const teachers = await this.getAll();
    const now = new Date().toISOString();
    const newTeacher: Teacher = {
      ...data,
      id: `teacher_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now
    };
    teachers.push(newTeacher);
    setItem(STORAGE_KEYS.TEACHERS, teachers);
    return newTeacher;
  }

  async getCurrentTeacher(): Promise<Teacher | null> {
    const rawId = localStorage.getItem(STORAGE_KEYS.CURRENT_TEACHER_ID);
    if (rawId) {
      const teacher = await this.getById(rawId);
      if (teacher) return teacher;
    }
    // If no explicit teacher ID stored yet in migration, return default seed or null
    // To allow seamless login flow, we check if teacher exists
    return null;
  }

  async setCurrentTeacher(teacher: Teacher | null): Promise<void> {
    if (teacher) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_TEACHER_ID, teacher.id);
      setItem(STORAGE_KEYS.TEACHER, teacher);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_TEACHER_ID);
    }
  }

  async updateTeacher(id: string, data: Partial<Teacher>): Promise<Teacher | null> {
    const teachers = await this.getAll();
    const index = teachers.findIndex(t => t.id === id);
    if (index === -1) return null;

    const updated: Teacher = {
      ...teachers[index],
      ...data
    };
    teachers[index] = updated;
    setItem(STORAGE_KEYS.TEACHERS, teachers);

    const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_TEACHER_ID);
    if (currentId === id) {
      setItem(STORAGE_KEYS.TEACHER, updated);
    }

    return updated;
  }
}

// 2. Class Repository
export class LocalStorageClassRepository implements IClassRepository {
  async getAll(): Promise<ClassEntity[]> {
    return getItem<ClassEntity[]>(STORAGE_KEYS.CLASSES, SEED_CLASSES);
  }

  async getAllByTeacher(teacherId: string): Promise<ClassEntity[]> {
    const classes = await this.getAll();
    return classes.filter(c => c.teacherId === teacherId);
  }

  async getById(id: string): Promise<ClassEntity | null> {
    const classes = getItem<ClassEntity[]>(STORAGE_KEYS.CLASSES, SEED_CLASSES);
    return classes.find(c => c.id === id) || null;
  }

  async getByCode(classCode: string): Promise<ClassEntity | null> {
    const classes = getItem<ClassEntity[]>(STORAGE_KEYS.CLASSES, SEED_CLASSES);
    const normalized = classCode.trim().toUpperCase();
    return classes.find(c => c.classCode.trim().toUpperCase() === normalized) || null;
  }

  async create(classData: Omit<ClassEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClassEntity> {
    const classes = getItem<ClassEntity[]>(STORAGE_KEYS.CLASSES, SEED_CLASSES);
    const now = new Date().toISOString();
    const newClass: ClassEntity = {
      ...classData,
      id: `class_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now
    };
    classes.unshift(newClass);
    setItem(STORAGE_KEYS.CLASSES, classes);
    return newClass;
  }

  async update(id: string, classData: Partial<ClassEntity>): Promise<ClassEntity | null> {
    const classes = getItem<ClassEntity[]>(STORAGE_KEYS.CLASSES, SEED_CLASSES);
    const index = classes.findIndex(c => c.id === id);
    if (index === -1) return null;

    const updated: ClassEntity = {
      ...classes[index],
      ...classData,
      updatedAt: new Date().toISOString()
    };
    classes[index] = updated;
    setItem(STORAGE_KEYS.CLASSES, classes);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const classes = getItem<ClassEntity[]>(STORAGE_KEYS.CLASSES, SEED_CLASSES);
    const filtered = classes.filter(c => c.id !== id);
    setItem(STORAGE_KEYS.CLASSES, filtered);
    return true;
  }
}

// 3. Student Repository
export class LocalStorageStudentRepository implements IStudentRepository {
  async getByClassId(classId: string): Promise<Student[]> {
    const students = getItem<Student[]>(STORAGE_KEYS.STUDENTS, SEED_STUDENTS);
    return students.filter(s => s.classId === classId);
  }

  async getById(id: string): Promise<Student | null> {
    const students = getItem<Student[]>(STORAGE_KEYS.STUDENTS, SEED_STUDENTS);
    return students.find(s => s.id === id) || null;
  }

  async getByNameAndClass(fullName: string, classId: string): Promise<Student | null> {
    const students = getItem<Student[]>(STORAGE_KEYS.STUDENTS, SEED_STUDENTS);
    const cleanName = fullName.trim().toLowerCase();
    return students.find(s => s.classId === classId && s.fullName.trim().toLowerCase() === cleanName) || null;
  }

  async create(studentData: Omit<Student, 'id' | 'joinedAt'>): Promise<Student> {
    const students = getItem<Student[]>(STORAGE_KEYS.STUDENTS, SEED_STUDENTS);
    const newStudent: Student = {
      ...studentData,
      id: `student_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      joinedAt: new Date().toISOString()
    };
    students.push(newStudent);
    setItem(STORAGE_KEYS.STUDENTS, students);
    return newStudent;
  }

  async update(id: string, data: Partial<Student>): Promise<Student | null> {
    const students = getItem<Student[]>(STORAGE_KEYS.STUDENTS, SEED_STUDENTS);
    const index = students.findIndex(s => s.id === id);
    if (index === -1) return null;
    students[index] = { ...students[index], ...data };
    setItem(STORAGE_KEYS.STUDENTS, students);
    return students[index];
  }

  async delete(id: string): Promise<boolean> {
    const students = getItem<Student[]>(STORAGE_KEYS.STUDENTS, SEED_STUDENTS);
    const filtered = students.filter(s => s.id !== id);
    setItem(STORAGE_KEYS.STUDENTS, filtered);
    return true;
  }
}

// 4. Lesson Repository
export class LocalStorageLessonRepository implements ILessonRepository {
  async getAll(): Promise<Lesson[]> {
    return getItem<Lesson[]>(STORAGE_KEYS.LESSONS, SEED_LESSONS);
  }

  async getByClassId(classId: string): Promise<Lesson[]> {
    const lessons = getItem<Lesson[]>(STORAGE_KEYS.LESSONS, SEED_LESSONS);
    return lessons
      .filter(l => l.classId === classId)
      .sort((a, b) => a.order - b.order);
  }

  async getById(id: string): Promise<Lesson | null> {
    const lessons = getItem<Lesson[]>(STORAGE_KEYS.LESSONS, SEED_LESSONS);
    return lessons.find(l => l.id === id) || null;
  }

  async getTemplatesByTeacher(teacherId: string): Promise<Lesson[]> {
    const lessons = getItem<Lesson[]>(STORAGE_KEYS.LESSONS, SEED_LESSONS);
    return lessons.filter(l => l.teacherId === teacherId && l.isTemplate);
  }

  async create(lessonData: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lesson> {
    const lessons = getItem<Lesson[]>(STORAGE_KEYS.LESSONS, SEED_LESSONS);
    const now = new Date().toISOString();
    const newLesson: Lesson = {
      ...lessonData,
      id: `lesson_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now
    };
    lessons.push(newLesson);
    setItem(STORAGE_KEYS.LESSONS, lessons);
    return newLesson;
  }

  async update(id: string, data: Partial<Lesson>): Promise<Lesson | null> {
    const lessons = getItem<Lesson[]>(STORAGE_KEYS.LESSONS, SEED_LESSONS);
    const index = lessons.findIndex(l => l.id === id);
    if (index === -1) return null;
    lessons[index] = {
      ...lessons[index],
      ...data,
      updatedAt: new Date().toISOString()
    };
    setItem(STORAGE_KEYS.LESSONS, lessons);
    return lessons[index];
  }

  async delete(id: string): Promise<boolean> {
    const lessons = getItem<Lesson[]>(STORAGE_KEYS.LESSONS, SEED_LESSONS);
    const filtered = lessons.filter(l => l.id !== id);
    setItem(STORAGE_KEYS.LESSONS, filtered);
    return true;
  }

  async duplicate(lessonId: string, targetClassId?: string): Promise<Lesson | null> {
    const original = await this.getById(lessonId);
    if (!original) return null;

    const taskRepo = new LocalStorageTaskRepository();
    const tasks = await taskRepo.getByLessonId(lessonId);

    const now = new Date().toISOString();
    const newLessonId = `lesson_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newLesson: Lesson = {
      ...original,
      id: newLessonId,
      classId: targetClassId || original.classId,
      title: `${original.title} (Bản sao)`,
      status: 'draft',
      createdAt: now,
      updatedAt: now
    };

    const lessons = getItem<Lesson[]>(STORAGE_KEYS.LESSONS, SEED_LESSONS);
    lessons.push(newLesson);
    setItem(STORAGE_KEYS.LESSONS, lessons);

    // Duplicate tasks for this lesson
    for (const t of tasks) {
      await taskRepo.create({
        lessonId: newLessonId,
        title: t.title,
        description: t.description,
        type: t.type,
        phase: t.phase,
        required: t.required,
        order: t.order,
        settings: { ...t.settings }
      });
    }

    return newLesson;
  }
}

// 5. Task Repository
export class LocalStorageTaskRepository implements ITaskRepository {
  async getByLessonId(lessonId: string): Promise<Task[]> {
    const tasks = getItem<Task[]>(STORAGE_KEYS.TASKS, SEED_TASKS);
    return tasks
      .filter(t => t.lessonId === lessonId)
      .sort((a, b) => a.order - b.order);
  }

  async getById(id: string): Promise<Task | null> {
    const tasks = getItem<Task[]>(STORAGE_KEYS.TASKS, SEED_TASKS);
    return tasks.find(t => t.id === id) || null;
  }

  async create(taskData: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
    const tasks = getItem<Task[]>(STORAGE_KEYS.TASKS, SEED_TASKS);
    const newTask: Task = {
      ...taskData,
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString()
    };
    tasks.push(newTask);
    setItem(STORAGE_KEYS.TASKS, tasks);
    return newTask;
  }

  async update(id: string, data: Partial<Task>): Promise<Task | null> {
    const tasks = getItem<Task[]>(STORAGE_KEYS.TASKS, SEED_TASKS);
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) return null;
    tasks[index] = { ...tasks[index], ...data };
    setItem(STORAGE_KEYS.TASKS, tasks);
    return tasks[index];
  }

  async delete(id: string): Promise<boolean> {
    const tasks = getItem<Task[]>(STORAGE_KEYS.TASKS, SEED_TASKS);
    const filtered = tasks.filter(t => t.id !== id);
    setItem(STORAGE_KEYS.TASKS, filtered);
    return true;
  }

  async reorder(lessonId: string, taskIds: string[]): Promise<boolean> {
    const tasks = getItem<Task[]>(STORAGE_KEYS.TASKS, SEED_TASKS);
    taskIds.forEach((id, index) => {
      const task = tasks.find(t => t.id === id && t.lessonId === lessonId);
      if (task) {
        task.order = index + 1;
      }
    });
    setItem(STORAGE_KEYS.TASKS, tasks);
    return true;
  }
}

// 6. Progress Repository
export class LocalStorageProgressRepository implements IProgressRepository {
  async getByStudentAndLesson(studentId: string, lessonId: string): Promise<TaskProgress[]> {
    const progressList = getItem<TaskProgress[]>(STORAGE_KEYS.PROGRESS, SEED_PROGRESS);
    return progressList.filter(p => p.studentId === studentId && p.lessonId === lessonId);
  }

  async getByStudentAndTask(studentId: string, taskId: string): Promise<TaskProgress | null> {
    const progressList = getItem<TaskProgress[]>(STORAGE_KEYS.PROGRESS, SEED_PROGRESS);
    return progressList.find(p => p.studentId === studentId && p.taskId === taskId) || null;
  }

  async getAllByStudent(studentId: string): Promise<TaskProgress[]> {
    const progressList = getItem<TaskProgress[]>(STORAGE_KEYS.PROGRESS, SEED_PROGRESS);
    return progressList.filter(p => p.studentId === studentId);
  }

  async getAllByClass(classId: string): Promise<TaskProgress[]> {
    const studentRepo = new LocalStorageStudentRepository();
    const students = await studentRepo.getByClassId(classId);
    const studentIds = new Set(students.map(s => s.id));

    const progressList = getItem<TaskProgress[]>(STORAGE_KEYS.PROGRESS, SEED_PROGRESS);
    return progressList.filter(p => studentIds.has(p.studentId));
  }

  async upsert(progress: Omit<TaskProgress, 'id'> & { id?: string }): Promise<TaskProgress> {
    const progressList = getItem<TaskProgress[]>(STORAGE_KEYS.PROGRESS, SEED_PROGRESS);
    const existingIndex = progressList.findIndex(
      p => p.studentId === progress.studentId && p.taskId === progress.taskId
    );

    if (existingIndex >= 0) {
      const updated: TaskProgress = {
        ...progressList[existingIndex],
        ...progress,
        id: progressList[existingIndex].id
      };
      progressList[existingIndex] = updated;
      setItem(STORAGE_KEYS.PROGRESS, progressList);
      return updated;
    } else {
      const newProgress: TaskProgress = {
        ...progress,
        id: progress.id || `prog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
      };
      progressList.push(newProgress);
      setItem(STORAGE_KEYS.PROGRESS, progressList);
      return newProgress;
    }
  }

  async batchUpsert(progressListInput: (Omit<TaskProgress, 'id'> & { id?: string })[]): Promise<boolean> {
    for (const p of progressListInput) {
      await this.upsert(p);
    }
    return true;
  }
}

// 7. Assignment Repository
export class LocalStorageAssignmentRepository implements IAssignmentRepository {
  async getByLessonId(lessonId: string): Promise<Assignment[]> {
    const assignments = getItem<Assignment[]>(STORAGE_KEYS.ASSIGNMENTS, SEED_ASSIGNMENTS);
    return assignments.filter(a => a.lessonId === lessonId);
  }

  async getByTaskId(taskId: string): Promise<Assignment | null> {
    const assignments = getItem<Assignment[]>(STORAGE_KEYS.ASSIGNMENTS, SEED_ASSIGNMENTS);
    return assignments.find(a => a.taskId === taskId) || null;
  }

  async getById(id: string): Promise<Assignment | null> {
    const assignments = getItem<Assignment[]>(STORAGE_KEYS.ASSIGNMENTS, SEED_ASSIGNMENTS);
    return assignments.find(a => a.id === id) || null;
  }

  async create(assignmentData: Omit<Assignment, 'id'>): Promise<Assignment> {
    const assignments = getItem<Assignment[]>(STORAGE_KEYS.ASSIGNMENTS, SEED_ASSIGNMENTS);
    const newAssignment: Assignment = {
      ...assignmentData,
      id: `assign_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    };
    assignments.push(newAssignment);
    setItem(STORAGE_KEYS.ASSIGNMENTS, assignments);
    return newAssignment;
  }

  async update(id: string, data: Partial<Assignment>): Promise<Assignment | null> {
    const assignments = getItem<Assignment[]>(STORAGE_KEYS.ASSIGNMENTS, SEED_ASSIGNMENTS);
    const index = assignments.findIndex(a => a.id === id);
    if (index === -1) return null;
    assignments[index] = { ...assignments[index], ...data };
    setItem(STORAGE_KEYS.ASSIGNMENTS, assignments);
    return assignments[index];
  }

  async delete(id: string): Promise<boolean> {
    const assignments = getItem<Assignment[]>(STORAGE_KEYS.ASSIGNMENTS, SEED_ASSIGNMENTS);
    const filtered = assignments.filter(a => a.id !== id);
    setItem(STORAGE_KEYS.ASSIGNMENTS, filtered);
    return true;
  }
}

// 8. Submission Repository
export class LocalStorageSubmissionRepository implements ISubmissionRepository {
  async getByAssignmentId(assignmentId: string): Promise<Submission[]> {
    const submissions = getItem<Submission[]>(STORAGE_KEYS.SUBMISSIONS, SEED_SUBMISSIONS);
    return submissions.filter(s => s.assignmentId === assignmentId);
  }

  async getByLessonId(lessonId: string): Promise<Submission[]> {
    const submissions = getItem<Submission[]>(STORAGE_KEYS.SUBMISSIONS, SEED_SUBMISSIONS);
    return submissions.filter(s => s.lessonId === lessonId);
  }

  async getByClassId(classId: string): Promise<Submission[]> {
    const submissions = getItem<Submission[]>(STORAGE_KEYS.SUBMISSIONS, SEED_SUBMISSIONS);
    return submissions.filter(s => s.classId === classId);
  }

  async getByStudentId(studentId: string): Promise<Submission[]> {
    const submissions = getItem<Submission[]>(STORAGE_KEYS.SUBMISSIONS, SEED_SUBMISSIONS);
    return submissions.filter(s => s.studentId === studentId);
  }

  async getByStudentAndTask(studentId: string, taskId: string): Promise<Submission | null> {
    const submissions = getItem<Submission[]>(STORAGE_KEYS.SUBMISSIONS, SEED_SUBMISSIONS);
    return submissions.find(s => s.studentId === studentId && s.taskId === taskId) || null;
  }

  async getById(id: string): Promise<Submission | null> {
    const submissions = getItem<Submission[]>(STORAGE_KEYS.SUBMISSIONS, SEED_SUBMISSIONS);
    return submissions.find(s => s.id === id) || null;
  }

  async create(subData: Omit<Submission, 'id' | 'submittedAt'>): Promise<Submission> {
    const submissions = getItem<Submission[]>(STORAGE_KEYS.SUBMISSIONS, SEED_SUBMISSIONS);
    const existingIndex = submissions.findIndex(
      s => s.studentId === subData.studentId && s.taskId === subData.taskId
    );

    const now = new Date().toISOString();
    if (existingIndex >= 0) {
      const updated: Submission = {
        ...submissions[existingIndex],
        ...subData,
        submittedAt: now
      };
      submissions[existingIndex] = updated;
      setItem(STORAGE_KEYS.SUBMISSIONS, submissions);
      return updated;
    } else {
      const newSub: Submission = {
        ...subData,
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        submittedAt: now
      };
      submissions.push(newSub);
      setItem(STORAGE_KEYS.SUBMISSIONS, submissions);
      return newSub;
    }
  }

  async grade(submissionId: string, score: number, feedback: string, teacherId: string): Promise<Submission | null> {
    const submissions = getItem<Submission[]>(STORAGE_KEYS.SUBMISSIONS, SEED_SUBMISSIONS);
    const index = submissions.findIndex(s => s.id === submissionId);
    if (index === -1) return null;

    submissions[index] = {
      ...submissions[index],
      score,
      feedback,
      status: 'graded',
      gradedAt: new Date().toISOString(),
      gradedByTeacherId: teacherId
    };
    setItem(STORAGE_KEYS.SUBMISSIONS, submissions);
    return submissions[index];
  }
}

// 9. Announcement Repository
export class LocalStorageAnnouncementRepository implements IAnnouncementRepository {
  async getByClassId(classId: string): Promise<Announcement[]> {
    const announcements = getItem<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, SEED_ANNOUNCEMENTS);
    return announcements.filter(a => a.classId === classId || a.classId === 'all');
  }

  async getByTeacherId(teacherId: string): Promise<Announcement[]> {
    const announcements = getItem<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, SEED_ANNOUNCEMENTS);
    return announcements.filter(a => a.teacherId === teacherId);
  }

  async getForStudent(classId: string): Promise<Announcement[]> {
    const announcements = getItem<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, SEED_ANNOUNCEMENTS);
    return announcements
      .filter(a => a.classId === classId || a.classId === 'all')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async create(data: Omit<Announcement, 'id' | 'createdAt'>): Promise<Announcement> {
    const announcements = getItem<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, SEED_ANNOUNCEMENTS);
    const newAnn: Announcement = {
      ...data,
      id: `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString()
    };
    announcements.unshift(newAnn);
    setItem(STORAGE_KEYS.ANNOUNCEMENTS, announcements);
    return newAnn;
  }

  async delete(id: string): Promise<boolean> {
    const announcements = getItem<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, SEED_ANNOUNCEMENTS);
    const filtered = announcements.filter(a => a.id !== id);
    setItem(STORAGE_KEYS.ANNOUNCEMENTS, filtered);
    return true;
  }
}

// 10. Certificate Repository
export class LocalStorageCertificateRepository implements ICertificateRepository {
  async getByStudentId(studentId: string): Promise<Certificate[]> {
    const certs = getItem<Certificate[]>(STORAGE_KEYS.CERTIFICATES, SEED_CERTIFICATES);
    return certs.filter(c => c.studentId === studentId);
  }

  async getByClassId(classId: string): Promise<Certificate[]> {
    const certs = getItem<Certificate[]>(STORAGE_KEYS.CERTIFICATES, SEED_CERTIFICATES);
    return certs.filter(c => c.classId === classId);
  }

  async getById(id: string): Promise<Certificate | null> {
    const certs = getItem<Certificate[]>(STORAGE_KEYS.CERTIFICATES, SEED_CERTIFICATES);
    return certs.find(c => c.id === id) || null;
  }

  async create(certData: Omit<Certificate, 'id' | 'issuedAt'>): Promise<Certificate> {
    const certs = getItem<Certificate[]>(STORAGE_KEYS.CERTIFICATES, SEED_CERTIFICATES);
    const newCert: Certificate = {
      ...certData,
      id: `cert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      issuedAt: new Date().toISOString()
    };
    certs.push(newCert);
    setItem(STORAGE_KEYS.CERTIFICATES, certs);
    return newCert;
  }
}

// Singleton instances for default service wiring
export const teacherRepo = new LocalStorageTeacherRepository();
export const classRepo = new LocalStorageClassRepository();
export const studentRepo = new LocalStorageStudentRepository();
export const lessonRepo = new LocalStorageLessonRepository();
export const taskRepo = new LocalStorageTaskRepository();
export const progressRepo = new LocalStorageProgressRepository();
export const assignmentRepo = new LocalStorageAssignmentRepository();
export const submissionRepo = new LocalStorageSubmissionRepository();
export const announcementRepo = new LocalStorageAnnouncementRepository();
export const certificateRepo = new LocalStorageCertificateRepository();
