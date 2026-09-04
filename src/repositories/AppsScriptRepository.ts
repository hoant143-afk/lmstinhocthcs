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
import { apiClient } from '../services/apiClient';
import {
  FirestoreTeacherRepository,
  FirestoreClassRepository,
  FirestoreStudentRepository,
  FirestoreLessonRepository,
  FirestoreTaskRepository,
  FirestoreProgressRepository,
  FirestoreAssignmentRepository,
  FirestoreSubmissionRepository,
  FirestoreAnnouncementRepository,
  FirestoreCertificateRepository
} from './FirestoreRepository';

// Shared Cloud Firestore instances for durable multi-device persistence (Zero LocalStorage dependency for classes/students)
const cloudTeacher = new FirestoreTeacherRepository();
const cloudClass = new FirestoreClassRepository();
const cloudStudent = new FirestoreStudentRepository();
const cloudLesson = new FirestoreLessonRepository();
const cloudTask = new FirestoreTaskRepository();
const cloudProgress = new FirestoreProgressRepository();
const cloudAssignment = new FirestoreAssignmentRepository();
const cloudSubmission = new FirestoreSubmissionRepository();
const cloudAnnouncement = new FirestoreAnnouncementRepository();
const cloudCertificate = new FirestoreCertificateRepository();

// 1. AppsScript Teacher Repository
export class AppsScriptTeacherRepository implements ITeacherRepository {
  async getAll(): Promise<Teacher[]> {
    const res = await apiClient.request<Teacher[]>('teachers.getAll');
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return cloudTeacher.getAll();
  }

  async getById(id: string): Promise<Teacher | null> {
    const res = await apiClient.request<Teacher>('teachers.getById', { id });
    if (res.success && res.data) {
      return res.data;
    }
    return cloudTeacher.getById(id);
  }

  async getByEmail(email: string): Promise<Teacher | null> {
    const res = await apiClient.request<Teacher>('teachers.getByEmail', { email });
    if (res.success && res.data) {
      return res.data;
    }
    return cloudTeacher.getByEmail(email);
  }

  async create(data: Omit<Teacher, 'id' | 'createdAt'>): Promise<Teacher> {
    const res = await apiClient.request<Teacher>('teachers.create', data);
    if (res.success && res.data) {
      cloudTeacher.create(data).catch(() => {});
      return res.data;
    }
    return cloudTeacher.create(data);
  }

  async getCurrentTeacher(): Promise<Teacher | null> {
    const res = await apiClient.request<Teacher>('auth.getCurrentTeacher');
    if (res.success && res.data) {
      return res.data;
    }
    return cloudTeacher.getCurrentTeacher();
  }

  async setCurrentTeacher(teacher: Teacher | null): Promise<void> {
    await cloudTeacher.setCurrentTeacher(teacher);
    if (teacher) {
      await apiClient.request('auth.setCurrentTeacher', { teacherId: teacher.id });
    }
  }

  async updateTeacher(id: string, data: Partial<Teacher>): Promise<Teacher | null> {
    const res = await apiClient.request<Teacher>('teachers.update', { id, ...data });
    if (res.success && res.data) {
      cloudTeacher.updateTeacher(id, data).catch(() => {});
      return res.data;
    }
    return cloudTeacher.updateTeacher(id, data);
  }
}

// 2. AppsScript Class Repository
export class AppsScriptClassRepository implements IClassRepository {
  async getAll(): Promise<ClassEntity[]> {
    // 1. Check local server API first (ultra-fast < 10ms)
    try {
      const serverRes = await fetch('/api/classes');
      if (serverRes.ok) {
        const list = await serverRes.json();
        if (Array.isArray(list) && list.length > 0) {
          return list;
        }
      }
    } catch {}

    // 2. Query Cloud Firestore
    try {
      const fsClasses = await cloudClass.getAll();
      if (Array.isArray(fsClasses) && fsClasses.length > 0) {
        return fsClasses;
      }
    } catch {}

    // 3. Fallback to Google Apps Script only if empty/not found
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<ClassEntity[]>('classes.getAll');
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    }
    return [];
  }

  async getAllByTeacher(teacherId: string): Promise<ClassEntity[]> {
    // 1. Check local server API first
    try {
      const serverRes = await fetch(`/api/classes?teacherId=${encodeURIComponent(teacherId)}`);
      if (serverRes.ok) {
        const list = await serverRes.json();
        if (Array.isArray(list) && list.length > 0) {
          return list;
        }
      }
    } catch {}

    // 2. Query Cloud Firestore
    try {
      const fsClasses = await cloudClass.getAllByTeacher(teacherId);
      if (Array.isArray(fsClasses) && fsClasses.length > 0) {
        return fsClasses;
      }
    } catch {}

    // 3. Fallback to Google Apps Script
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<ClassEntity[]>('classes.getByTeacher', { teacherId });
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    }
    return [];
  }

  async getById(id: string): Promise<ClassEntity | null> {
    // 1. Check local server API (< 10ms)
    try {
      const serverRes = await fetch(`/api/classes/${encodeURIComponent(id)}`);
      if (serverRes.ok) {
        const cls = await serverRes.json();
        if (cls && cls.id) return cls;
      }
    } catch {}

    // 2. Query Cloud Firestore
    try {
      const fsCls = await cloudClass.getById(id);
      if (fsCls) return fsCls;
    } catch {}

    // 3. Fallback to Google Apps Script
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<ClassEntity>('classes.getById', { id });
      if (res.success && res.data) {
        return res.data;
      }
    }
    return null;
  }

  async getByCode(classCode: string): Promise<ClassEntity | null> {
    const clean = (classCode || '').trim().toUpperCase();
    if (!clean) return null;

    // Fast parallel lookup: Local Server API (<10ms) and Cloud Firestore (<150ms)
    try {
      const [serverCls, fsCls] = await Promise.all([
        fetch(`/api/classes/by-code/${encodeURIComponent(clean)}`)
          .then(res => (res.ok ? res.json() : null))
          .catch(() => null),
        cloudClass.getByCode(clean).catch(() => null)
      ]);

      if (serverCls && serverCls.id) return serverCls;
      if (fsCls && fsCls.id) return fsCls;
    } catch {}

    // Fallback to Apps Script only if not in server or Firestore
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<ClassEntity>('classes.getByCode', { classCode: clean });
      if (res.success && res.data && res.data.id) {
        return res.data;
      }
    }

    return null;
  }

  async create(classData: Omit<ClassEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClassEntity> {
    const cleanCode = (classData.classCode || '').trim().toUpperCase();
    let created: ClassEntity | null = null;

    // 1. If Google Apps Script is configured, write directly to Google Sheet CLASSES
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<ClassEntity>('classes.create', {
        ...classData,
        classCode: cleanCode
      });
      if (res.success && res.data) {
        created = res.data;
      } else {
        console.error('[AppsScriptClassRepository] Failed to write class to Google Sheet CLASSES:', res.error);
        throw new Error(res.error || 'Lỗi khi tạo lớp học trên Google Apps Script (Google Sheet CLASSES)');
      }
    }

    // 2. Also write to Cloud Firestore so all devices have shared real-time access
    try {
      const fsCreated = await cloudClass.create({
        ...classData,
        classCode: cleanCode
      });
      if (!created) {
        created = fsCreated;
      }
    } catch (fsErr) {
      console.warn('[AppsScriptClassRepository] Firestore write note:', fsErr);
    }

    if (created) return created;
    throw new Error('Không thể tạo lớp học trên cơ sở dữ liệu đám mây.');
  }

  async update(id: string, classData: Partial<ClassEntity>): Promise<ClassEntity | null> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<ClassEntity>('classes.update', { id, ...classData });
      cloudClass.update(id, classData).catch(() => {});
      if (res.success && res.data) {
        return res.data;
      }
    }
    return cloudClass.update(id, classData);
  }

  async delete(id: string): Promise<boolean> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<{ deleted: boolean }>('classes.delete', { id });
      cloudClass.delete(id).catch(() => {});
      if (res.success) {
        return true;
      }
    }
    return cloudClass.delete(id);
  }
}

// 3. AppsScript Student Repository
export class AppsScriptStudentRepository implements IStudentRepository {
  async getByClassId(classId: string): Promise<Student[]> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Student[]>('students.getByClass', { classId });
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    }
    return cloudStudent.getByClassId(classId);
  }

  async getById(id: string): Promise<Student | null> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Student>('students.getById', { id });
      if (res.success && res.data) {
        return res.data;
      }
    }
    return cloudStudent.getById(id);
  }

  async getByNameAndClass(fullName: string, classId: string): Promise<Student | null> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Student>('students.getByNameAndClass', { fullName, classId });
      if (res.success && res.data) {
        return res.data;
      }
    }
    return cloudStudent.getByNameAndClass(fullName, classId);
  }

  async create(studentData: Omit<Student, 'id' | 'joinedAt'>): Promise<Student> {
    let created: Student | null = null;
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Student>('students.create', studentData);
      if (res.success && res.data) {
        created = res.data;
      }
    }
    const fsCreated = await cloudStudent.create(studentData);
    return created || fsCreated;
  }

  async update(id: string, data: Partial<Student>): Promise<Student | null> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Student>('students.update', { id, ...data });
      cloudStudent.update(id, data).catch(() => {});
      if (res.success && res.data) {
        return res.data;
      }
    }
    return cloudStudent.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<{ deleted: boolean }>('students.delete', { id });
      cloudStudent.delete(id).catch(() => {});
      if (res.success) {
        return true;
      }
    }
    return cloudStudent.delete(id);
  }
}

// 4. AppsScript Lesson Repository
export class AppsScriptLessonRepository implements ILessonRepository {
  async getAll(): Promise<Lesson[]> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Lesson[]>('lessons.getAll');
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    }
    return cloudLesson.getAll();
  }

  async getByClassId(classId: string): Promise<Lesson[]> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Lesson[]>('lessons.getByClass', { classId });
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    }
    return cloudLesson.getByClassId(classId);
  }

  async getById(id: string): Promise<Lesson | null> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Lesson>('lessons.getById', { id });
      if (res.success && res.data) {
        return res.data;
      }
    }
    return cloudLesson.getById(id);
  }

  async getTemplatesByTeacher(teacherId: string): Promise<Lesson[]> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Lesson[]>('lessons.getTemplates', { teacherId });
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    }
    return cloudLesson.getTemplatesByTeacher(teacherId);
  }

  async create(lessonData: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lesson> {
    let created: Lesson | null = null;
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Lesson>('lessons.create', lessonData);
      if (res.success && res.data) {
        created = res.data;
      }
    }
    const fsCreated = await cloudLesson.create(lessonData);
    return created || fsCreated;
  }

  async update(id: string, data: Partial<Lesson>): Promise<Lesson | null> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Lesson>('lessons.update', { id, ...data });
      cloudLesson.update(id, data).catch(() => {});
      if (res.success && res.data) {
        return res.data;
      }
    }
    return cloudLesson.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<{ deleted: boolean }>('lessons.delete', { id });
      cloudLesson.delete(id).catch(() => {});
      if (res.success) {
        return true;
      }
    }
    return cloudLesson.delete(id);
  }

  async duplicate(lessonId: string, targetClassId?: string): Promise<Lesson | null> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Lesson>('lessons.duplicate', { lessonId, targetClassId });
      if (res.success && res.data) {
        return res.data;
      }
    }
    return cloudLesson.duplicate(lessonId, targetClassId);
  }
}

// 5. AppsScript Task Repository
export class AppsScriptTaskRepository implements ITaskRepository {
  async getByLessonId(lessonId: string): Promise<Task[]> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Task[]>('tasks.getByLesson', { lessonId });
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    }
    return cloudTask.getByLessonId(lessonId);
  }

  async getById(id: string): Promise<Task | null> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Task>('tasks.getById', { id });
      if (res.success && res.data) {
        return res.data;
      }
    }
    return cloudTask.getById(id);
  }

  async create(taskData: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
    let created: Task | null = null;
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Task>('tasks.create', taskData);
      if (res.success && res.data) {
        created = res.data;
      }
    }
    const fsCreated = await cloudTask.create(taskData);
    return created || fsCreated;
  }

  async update(id: string, data: Partial<Task>): Promise<Task | null> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Task>('tasks.update', { id, ...data });
      cloudTask.update(id, data).catch(() => {});
      if (res.success && res.data) {
        return res.data;
      }
    }
    return cloudTask.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<{ deleted: boolean }>('tasks.delete', { id });
      cloudTask.delete(id).catch(() => {});
      if (res.success) {
        return true;
      }
    }
    return cloudTask.delete(id);
  }

  async reorder(lessonId: string, taskIds: string[]): Promise<boolean> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<{ updated: boolean }>('tasks.reorder', { lessonId, taskIds });
      cloudTask.reorder(lessonId, taskIds).catch(() => {});
      if (res.success) {
        return true;
      }
    }
    return cloudTask.reorder(lessonId, taskIds);
  }
}

// 6. AppsScript Progress Repository
export class AppsScriptProgressRepository implements IProgressRepository {
  async getByStudentAndLesson(studentId: string, lessonId: string): Promise<TaskProgress[]> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<TaskProgress[]>('progress.getByStudentAndLesson', { studentId, lessonId });
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    }
    return cloudProgress.getByStudentAndLesson(studentId, lessonId);
  }

  async getByStudentAndTask(studentId: string, taskId: string): Promise<TaskProgress | null> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<TaskProgress>('progress.getByStudentAndTask', { studentId, taskId });
      if (res.success && res.data) {
        return res.data;
      }
    }
    return cloudProgress.getByStudentAndTask(studentId, taskId);
  }

  async getAllByStudent(studentId: string): Promise<TaskProgress[]> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<TaskProgress[]>('progress.getAllByStudent', { studentId });
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    }
    return cloudProgress.getAllByStudent(studentId);
  }

  async getAllByClass(classId: string): Promise<TaskProgress[]> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<TaskProgress[]>('progress.getAllByClass', { classId });
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    }
    return cloudProgress.getAllByClass(classId);
  }

  async upsert(progress: Omit<TaskProgress, 'id'> & { id?: string }): Promise<TaskProgress> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<TaskProgress>('progress.upsert', progress);
      cloudProgress.upsert(progress).catch(() => {});
      if (res.success && res.data) {
        return res.data;
      }
    }
    return cloudProgress.upsert(progress);
  }

  async batchUpsert(progressList: (Omit<TaskProgress, 'id'> & { id?: string })[]): Promise<boolean> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<{ updated: boolean }>('progress.batchUpsert', { progressList });
      cloudProgress.batchUpsert(progressList).catch(() => {});
      if (res.success) {
        return true;
      }
    }
    return cloudProgress.batchUpsert(progressList);
  }
}

// 7. AppsScript Assignment Repository
export class AppsScriptAssignmentRepository implements IAssignmentRepository {
  async getByLessonId(lessonId: string): Promise<Assignment[]> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Assignment[]>('assignments.getByLesson', { lessonId });
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    }
    return cloudAssignment.getByLessonId(lessonId);
  }

  async getByTaskId(taskId: string): Promise<Assignment | null> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Assignment>('assignments.getByTask', { taskId });
      if (res.success && res.data) {
        return res.data;
      }
    }
    return cloudAssignment.getByTaskId(taskId);
  }

  async getById(id: string): Promise<Assignment | null> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Assignment>('assignments.getById', { id });
      if (res.success && res.data) {
        return res.data;
      }
    }
    return cloudAssignment.getById(id);
  }

  async create(assignmentData: Omit<Assignment, 'id'>): Promise<Assignment> {
    let created: Assignment | null = null;
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Assignment>('assignments.create', assignmentData);
      if (res.success && res.data) {
        created = res.data;
      }
    }
    const fsCreated = await cloudAssignment.create(assignmentData);
    return created || fsCreated;
  }

  async update(id: string, data: Partial<Assignment>): Promise<Assignment | null> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Assignment>('assignments.update', { id, ...data });
      cloudAssignment.update(id, data).catch(() => {});
      if (res.success && res.data) {
        return res.data;
      }
    }
    return cloudAssignment.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<{ deleted: boolean }>('assignments.delete', { id });
      cloudAssignment.delete(id).catch(() => {});
      if (res.success) {
        return true;
      }
    }
    return cloudAssignment.delete(id);
  }
}

// 8. AppsScript Submission Repository
export class AppsScriptSubmissionRepository implements ISubmissionRepository {
  async getByAssignmentId(assignmentId: string): Promise<Submission[]> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Submission[]>('submissions.getByAssignment', { assignmentId });
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    }
    return cloudSubmission.getByAssignmentId(assignmentId);
  }

  async getByLessonId(lessonId: string): Promise<Submission[]> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Submission[]>('submissions.getByLesson', { lessonId });
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    }
    return cloudSubmission.getByLessonId(lessonId);
  }

  async getByClassId(classId: string): Promise<Submission[]> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Submission[]>('submissions.getByClass', { classId });
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    }
    return cloudSubmission.getByClassId(classId);
  }

  async getByStudentId(studentId: string): Promise<Submission[]> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Submission[]>('submissions.getByStudent', { studentId });
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    }
    return cloudSubmission.getByStudentId(studentId);
  }

  async getByStudentAndTask(studentId: string, taskId: string): Promise<Submission | null> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Submission>('submissions.getByStudentAndTask', { studentId, taskId });
      if (res.success && res.data) {
        return res.data;
      }
    }
    return cloudSubmission.getByStudentAndTask(studentId, taskId);
  }

  async getById(id: string): Promise<Submission | null> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Submission>('submissions.getById', { id });
      if (res.success && res.data) {
        return res.data;
      }
    }
    return cloudSubmission.getById(id);
  }

  async create(subData: Omit<Submission, 'id' | 'submittedAt'>): Promise<Submission> {
    let created: Submission | null = null;
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Submission>('submissions.create', subData);
      if (res.success && res.data) {
        created = res.data;
      }
    }
    const fsCreated = await cloudSubmission.create(subData);
    return created || fsCreated;
  }

  async grade(submissionId: string, score: number, feedback: string, teacherId: string): Promise<Submission | null> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Submission>('submissions.grade', {
        submissionId,
        score,
        feedback,
        teacherId
      });
      cloudSubmission.grade(submissionId, score, feedback, teacherId).catch(() => {});
      if (res.success && res.data) {
        return res.data;
      }
    }
    return cloudSubmission.grade(submissionId, score, feedback, teacherId);
  }
}

// 9. AppsScript Announcement Repository
export class AppsScriptAnnouncementRepository implements IAnnouncementRepository {
  async getByClassId(classId: string): Promise<Announcement[]> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Announcement[]>('announcements.getByClass', { classId });
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    }
    return cloudAnnouncement.getByClassId(classId);
  }

  async getByTeacherId(teacherId: string): Promise<Announcement[]> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Announcement[]>('announcements.getByTeacher', { teacherId });
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    }
    return cloudAnnouncement.getByTeacherId(teacherId);
  }

  async getForStudent(classId: string): Promise<Announcement[]> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Announcement[]>('announcements.getForStudent', { classId });
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    }
    return cloudAnnouncement.getForStudent(classId);
  }

  async create(data: Omit<Announcement, 'id' | 'createdAt'>): Promise<Announcement> {
    let created: Announcement | null = null;
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Announcement>('announcements.create', data);
      if (res.success && res.data) {
        created = res.data;
      }
    }
    const fsCreated = await cloudAnnouncement.create(data);
    return created || fsCreated;
  }

  async delete(id: string): Promise<boolean> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<{ deleted: boolean }>('announcements.delete', { id });
      cloudAnnouncement.delete(id).catch(() => {});
      if (res.success) {
        return true;
      }
    }
    return cloudAnnouncement.delete(id);
  }
}

// 10. AppsScript Certificate Repository
export class AppsScriptCertificateRepository implements ICertificateRepository {
  async getByStudentId(studentId: string): Promise<Certificate[]> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Certificate[]>('certificates.getByStudent', { studentId });
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    }
    return cloudCertificate.getByStudentId(studentId);
  }

  async getByClassId(classId: string): Promise<Certificate[]> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Certificate[]>('certificates.getByClass', { classId });
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    }
    return cloudCertificate.getByClassId(classId);
  }

  async getById(id: string): Promise<Certificate | null> {
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Certificate>('certificates.getById', { id });
      if (res.success && res.data) {
        return res.data;
      }
    }
    return cloudCertificate.getById(id);
  }

  async create(certData: Omit<Certificate, 'id' | 'issuedAt'>): Promise<Certificate> {
    let created: Certificate | null = null;
    if (apiClient.isAppsScriptConfigured()) {
      const res = await apiClient.request<Certificate>('certificates.create', certData);
      if (res.success && res.data) {
        created = res.data;
      }
    }
    const fsCreated = await cloudCertificate.create(certData);
    return created || fsCreated;
  }
}
