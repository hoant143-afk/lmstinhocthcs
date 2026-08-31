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
  LocalStorageTeacherRepository,
  LocalStorageClassRepository,
  LocalStorageStudentRepository,
  LocalStorageLessonRepository,
  LocalStorageTaskRepository,
  LocalStorageProgressRepository,
  LocalStorageAssignmentRepository,
  LocalStorageSubmissionRepository,
  LocalStorageAnnouncementRepository,
  LocalStorageCertificateRepository
} from './LocalStorageRepository';

// Fallback local instances for offline resilience
const fallbackTeacher = new LocalStorageTeacherRepository();
const fallbackClass = new LocalStorageClassRepository();
const fallbackStudent = new LocalStorageStudentRepository();
const fallbackLesson = new LocalStorageLessonRepository();
const fallbackTask = new LocalStorageTaskRepository();
const fallbackProgress = new LocalStorageProgressRepository();
const fallbackAssignment = new LocalStorageAssignmentRepository();
const fallbackSubmission = new LocalStorageSubmissionRepository();
const fallbackAnnouncement = new LocalStorageAnnouncementRepository();
const fallbackCertificate = new LocalStorageCertificateRepository();

// 1. AppsScript Teacher Repository
export class AppsScriptTeacherRepository implements ITeacherRepository {
  async getAll(): Promise<Teacher[]> {
    const res = await apiClient.request<Teacher[]>('teachers.getAll');
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return fallbackTeacher.getAll();
  }

  async getById(id: string): Promise<Teacher | null> {
    const res = await apiClient.request<Teacher>('teachers.getById', { id });
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackTeacher.getById(id);
  }

  async getByEmail(email: string): Promise<Teacher | null> {
    const res = await apiClient.request<Teacher>('teachers.getByEmail', { email });
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackTeacher.getByEmail(email);
  }

  async create(data: Omit<Teacher, 'id' | 'createdAt'>): Promise<Teacher> {
    const res = await apiClient.request<Teacher>('teachers.create', data);
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackTeacher.create(data);
  }

  async getCurrentTeacher(): Promise<Teacher | null> {
    const res = await apiClient.request<Teacher>('auth.getCurrentTeacher');
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackTeacher.getCurrentTeacher();
  }

  async setCurrentTeacher(teacher: Teacher | null): Promise<void> {
    await fallbackTeacher.setCurrentTeacher(teacher);
    if (teacher) {
      await apiClient.request('auth.setCurrentTeacher', { teacherId: teacher.id });
    }
  }

  async updateTeacher(id: string, data: Partial<Teacher>): Promise<Teacher | null> {
    const res = await apiClient.request<Teacher>('teachers.update', { id, ...data });
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackTeacher.updateTeacher(id, data);
  }
}

// 2. AppsScript Class Repository
export class AppsScriptClassRepository implements IClassRepository {
  async getAll(): Promise<ClassEntity[]> {
    const res = await apiClient.request<ClassEntity[]>('classes.getAll');
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return fallbackClass.getAll();
  }

  async getAllByTeacher(teacherId: string): Promise<ClassEntity[]> {
    const res = await apiClient.request<ClassEntity[]>('classes.getByTeacher', { teacherId });
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return fallbackClass.getAllByTeacher(teacherId);
  }

  async getById(id: string): Promise<ClassEntity | null> {
    const res = await apiClient.request<ClassEntity>('classes.getById', { id });
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackClass.getById(id);
  }

  async getByCode(classCode: string): Promise<ClassEntity | null> {
    const res = await apiClient.request<ClassEntity>('classes.getByCode', { classCode });
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackClass.getByCode(classCode);
  }

  async create(classData: Omit<ClassEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClassEntity> {
    const res = await apiClient.request<ClassEntity>('classes.create', classData);
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackClass.create(classData);
  }

  async update(id: string, classData: Partial<ClassEntity>): Promise<ClassEntity | null> {
    const res = await apiClient.request<ClassEntity>('classes.update', { id, ...classData });
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackClass.update(id, classData);
  }

  async delete(id: string): Promise<boolean> {
    const res = await apiClient.request<{ deleted: boolean }>('classes.delete', { id });
    if (res.success) {
      return true;
    }
    return fallbackClass.delete(id);
  }
}

// 3. AppsScript Student Repository
export class AppsScriptStudentRepository implements IStudentRepository {
  async getByClassId(classId: string): Promise<Student[]> {
    const res = await apiClient.request<Student[]>('students.getByClass', { classId });
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return fallbackStudent.getByClassId(classId);
  }

  async getById(id: string): Promise<Student | null> {
    const res = await apiClient.request<Student>('students.getById', { id });
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackStudent.getById(id);
  }

  async getByNameAndClass(fullName: string, classId: string): Promise<Student | null> {
    const res = await apiClient.request<Student>('students.getByNameAndClass', { fullName, classId });
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackStudent.getByNameAndClass(fullName, classId);
  }

  async create(studentData: Omit<Student, 'id' | 'joinedAt'>): Promise<Student> {
    const res = await apiClient.request<Student>('students.create', studentData);
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackStudent.create(studentData);
  }

  async update(id: string, data: Partial<Student>): Promise<Student | null> {
    const res = await apiClient.request<Student>('students.update', { id, ...data });
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackStudent.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    const res = await apiClient.request<{ deleted: boolean }>('students.delete', { id });
    if (res.success) {
      return true;
    }
    return fallbackStudent.delete(id);
  }
}

// 4. AppsScript Lesson Repository
export class AppsScriptLessonRepository implements ILessonRepository {
  async getAll(): Promise<Lesson[]> {
    const res = await apiClient.request<Lesson[]>('lessons.getAll');
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return fallbackLesson.getAll();
  }

  async getByClassId(classId: string): Promise<Lesson[]> {
    const res = await apiClient.request<Lesson[]>('lessons.getByClass', { classId });
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return fallbackLesson.getByClassId(classId);
  }

  async getById(id: string): Promise<Lesson | null> {
    const res = await apiClient.request<Lesson>('lessons.getById', { id });
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackLesson.getById(id);
  }

  async getTemplatesByTeacher(teacherId: string): Promise<Lesson[]> {
    const res = await apiClient.request<Lesson[]>('lessons.getTemplates', { teacherId });
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return fallbackLesson.getTemplatesByTeacher(teacherId);
  }

  async create(lessonData: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lesson> {
    const res = await apiClient.request<Lesson>('lessons.create', lessonData);
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackLesson.create(lessonData);
  }

  async update(id: string, data: Partial<Lesson>): Promise<Lesson | null> {
    const res = await apiClient.request<Lesson>('lessons.update', { id, ...data });
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackLesson.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    const res = await apiClient.request<{ deleted: boolean }>('lessons.delete', { id });
    if (res.success) {
      return true;
    }
    return fallbackLesson.delete(id);
  }

  async duplicate(lessonId: string, targetClassId?: string): Promise<Lesson | null> {
    const res = await apiClient.request<Lesson>('lessons.duplicate', { lessonId, targetClassId });
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackLesson.duplicate(lessonId, targetClassId);
  }
}

// 5. AppsScript Task Repository
export class AppsScriptTaskRepository implements ITaskRepository {
  async getByLessonId(lessonId: string): Promise<Task[]> {
    const res = await apiClient.request<Task[]>('tasks.getByLesson', { lessonId });
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return fallbackTask.getByLessonId(lessonId);
  }

  async getById(id: string): Promise<Task | null> {
    const res = await apiClient.request<Task>('tasks.getById', { id });
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackTask.getById(id);
  }

  async create(taskData: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
    const res = await apiClient.request<Task>('tasks.create', taskData);
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackTask.create(taskData);
  }

  async update(id: string, data: Partial<Task>): Promise<Task | null> {
    const res = await apiClient.request<Task>('tasks.update', { id, ...data });
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackTask.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    const res = await apiClient.request<{ deleted: boolean }>('tasks.delete', { id });
    if (res.success) {
      return true;
    }
    return fallbackTask.delete(id);
  }

  async reorder(lessonId: string, taskIds: string[]): Promise<boolean> {
    const res = await apiClient.request<{ updated: boolean }>('tasks.reorder', { lessonId, taskIds });
    if (res.success) {
      return true;
    }
    return fallbackTask.reorder(lessonId, taskIds);
  }
}

// 6. AppsScript Progress Repository
export class AppsScriptProgressRepository implements IProgressRepository {
  async getByStudentAndLesson(studentId: string, lessonId: string): Promise<TaskProgress[]> {
    const res = await apiClient.request<TaskProgress[]>('progress.getByStudentAndLesson', { studentId, lessonId });
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return fallbackProgress.getByStudentAndLesson(studentId, lessonId);
  }

  async getByStudentAndTask(studentId: string, taskId: string): Promise<TaskProgress | null> {
    const res = await apiClient.request<TaskProgress>('progress.getByStudentAndTask', { studentId, taskId });
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackProgress.getByStudentAndTask(studentId, taskId);
  }

  async getAllByStudent(studentId: string): Promise<TaskProgress[]> {
    const res = await apiClient.request<TaskProgress[]>('progress.getAllByStudent', { studentId });
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return fallbackProgress.getAllByStudent(studentId);
  }

  async getAllByClass(classId: string): Promise<TaskProgress[]> {
    const res = await apiClient.request<TaskProgress[]>('progress.getAllByClass', { classId });
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return fallbackProgress.getAllByClass(classId);
  }

  async upsert(progress: Omit<TaskProgress, 'id'> & { id?: string }): Promise<TaskProgress> {
    const res = await apiClient.request<TaskProgress>('progress.upsert', progress);
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackProgress.upsert(progress);
  }

  async batchUpsert(progressList: (Omit<TaskProgress, 'id'> & { id?: string })[]): Promise<boolean> {
    const res = await apiClient.request<{ updated: boolean }>('progress.batchUpsert', { progressList });
    if (res.success) {
      return true;
    }
    return fallbackProgress.batchUpsert(progressList);
  }
}

// 7. AppsScript Assignment Repository
export class AppsScriptAssignmentRepository implements IAssignmentRepository {
  async getByLessonId(lessonId: string): Promise<Assignment[]> {
    const res = await apiClient.request<Assignment[]>('assignments.getByLesson', { lessonId });
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return fallbackAssignment.getByLessonId(lessonId);
  }

  async getByTaskId(taskId: string): Promise<Assignment | null> {
    const res = await apiClient.request<Assignment>('assignments.getByTask', { taskId });
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackAssignment.getByTaskId(taskId);
  }

  async getById(id: string): Promise<Assignment | null> {
    const res = await apiClient.request<Assignment>('assignments.getById', { id });
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackAssignment.getById(id);
  }

  async create(assignmentData: Omit<Assignment, 'id'>): Promise<Assignment> {
    const res = await apiClient.request<Assignment>('assignments.create', assignmentData);
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackAssignment.create(assignmentData);
  }

  async update(id: string, data: Partial<Assignment>): Promise<Assignment | null> {
    const res = await apiClient.request<Assignment>('assignments.update', { id, ...data });
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackAssignment.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    const res = await apiClient.request<{ deleted: boolean }>('assignments.delete', { id });
    if (res.success) {
      return true;
    }
    return fallbackAssignment.delete(id);
  }
}

// 8. AppsScript Submission Repository
export class AppsScriptSubmissionRepository implements ISubmissionRepository {
  async getByAssignmentId(assignmentId: string): Promise<Submission[]> {
    const res = await apiClient.request<Submission[]>('submissions.getByAssignment', { assignmentId });
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return fallbackSubmission.getByAssignmentId(assignmentId);
  }

  async getByLessonId(lessonId: string): Promise<Submission[]> {
    const res = await apiClient.request<Submission[]>('submissions.getByLesson', { lessonId });
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return fallbackSubmission.getByLessonId(lessonId);
  }

  async getByClassId(classId: string): Promise<Submission[]> {
    const res = await apiClient.request<Submission[]>('submissions.getByClass', { classId });
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return fallbackSubmission.getByClassId(classId);
  }

  async getByStudentId(studentId: string): Promise<Submission[]> {
    const res = await apiClient.request<Submission[]>('submissions.getByStudent', { studentId });
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return fallbackSubmission.getByStudentId(studentId);
  }

  async getByStudentAndTask(studentId: string, taskId: string): Promise<Submission | null> {
    const res = await apiClient.request<Submission>('submissions.getByStudentAndTask', { studentId, taskId });
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackSubmission.getByStudentAndTask(studentId, taskId);
  }

  async getById(id: string): Promise<Submission | null> {
    const res = await apiClient.request<Submission>('submissions.getById', { id });
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackSubmission.getById(id);
  }

  async create(subData: Omit<Submission, 'id' | 'submittedAt'>): Promise<Submission> {
    const res = await apiClient.request<Submission>('submissions.create', subData);
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackSubmission.create(subData);
  }

  async grade(submissionId: string, score: number, feedback: string, teacherId: string): Promise<Submission | null> {
    const res = await apiClient.request<Submission>('submissions.grade', {
      submissionId,
      score,
      feedback,
      teacherId
    });
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackSubmission.grade(submissionId, score, feedback, teacherId);
  }
}

// 9. AppsScript Announcement Repository
export class AppsScriptAnnouncementRepository implements IAnnouncementRepository {
  async getByClassId(classId: string): Promise<Announcement[]> {
    const res = await apiClient.request<Announcement[]>('announcements.getByClass', { classId });
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return fallbackAnnouncement.getByClassId(classId);
  }

  async getByTeacherId(teacherId: string): Promise<Announcement[]> {
    const res = await apiClient.request<Announcement[]>('announcements.getByTeacher', { teacherId });
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return fallbackAnnouncement.getByTeacherId(teacherId);
  }

  async getForStudent(classId: string): Promise<Announcement[]> {
    const res = await apiClient.request<Announcement[]>('announcements.getForStudent', { classId });
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return fallbackAnnouncement.getForStudent(classId);
  }

  async create(data: Omit<Announcement, 'id' | 'createdAt'>): Promise<Announcement> {
    const res = await apiClient.request<Announcement>('announcements.create', data);
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackAnnouncement.create(data);
  }

  async delete(id: string): Promise<boolean> {
    const res = await apiClient.request<{ deleted: boolean }>('announcements.delete', { id });
    if (res.success) {
      return true;
    }
    return fallbackAnnouncement.delete(id);
  }
}

// 10. AppsScript Certificate Repository
export class AppsScriptCertificateRepository implements ICertificateRepository {
  async getByStudentId(studentId: string): Promise<Certificate[]> {
    const res = await apiClient.request<Certificate[]>('certificates.getByStudent', { studentId });
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return fallbackCertificate.getByStudentId(studentId);
  }

  async getByClassId(classId: string): Promise<Certificate[]> {
    const res = await apiClient.request<Certificate[]>('certificates.getByClass', { classId });
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return fallbackCertificate.getByClassId(classId);
  }

  async getById(id: string): Promise<Certificate | null> {
    const res = await apiClient.request<Certificate>('certificates.getById', { id });
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackCertificate.getById(id);
  }

  async create(certData: Omit<Certificate, 'id' | 'issuedAt'>): Promise<Certificate> {
    const res = await apiClient.request<Certificate>('certificates.create', certData);
    if (res.success && res.data) {
      return res.data;
    }
    return fallbackCertificate.create(certData);
  }
}
