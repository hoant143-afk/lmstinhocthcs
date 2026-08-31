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

// Local fallbacks
const localTeacher = new LocalStorageTeacherRepository();
const localClass = new LocalStorageClassRepository();
const localStudent = new LocalStorageStudentRepository();
const localLesson = new LocalStorageLessonRepository();
const localTask = new LocalStorageTaskRepository();
const localProgress = new LocalStorageProgressRepository();
const localAssignment = new LocalStorageAssignmentRepository();
const localSubmission = new LocalStorageSubmissionRepository();
const localAnnouncement = new LocalStorageAnnouncementRepository();
const localCertificate = new LocalStorageCertificateRepository();

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
  try {
    const res = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    if (!res.ok) {
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`[ServerAPI] Fetch error for ${endpoint}:`, err);
    return null;
  }
}

// 1. TEACHER REPOSITORY
export class ServerTeacherRepository implements ITeacherRepository {
  async getAll(): Promise<Teacher[]> {
    const data = await apiFetch<Teacher[]>('/api/teachers');
    if (data && Array.isArray(data)) return data;
    return localTeacher.getAll();
  }

  async getById(id: string): Promise<Teacher | null> {
    const data = await apiFetch<Teacher>(`/api/teachers/${id}`);
    if (data) return data;
    return localTeacher.getById(id);
  }

  async getByEmail(email: string): Promise<Teacher | null> {
    const all = await this.getAll();
    return all.find(t => t.email.toLowerCase() === email.toLowerCase()) || null;
  }

  async create(data: Omit<Teacher, 'id' | 'createdAt'>): Promise<Teacher> {
    const created = await apiFetch<Teacher>('/api/teachers', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (created) return created;
    return localTeacher.create(data);
  }

  async getCurrentTeacher(): Promise<Teacher | null> {
    const data = await apiFetch<Teacher>('/api/teachers/current');
    if (data) return data;
    return localTeacher.getCurrentTeacher();
  }

  async setCurrentTeacher(teacher: Teacher | null): Promise<void> {
    if (teacher) {
      await apiFetch('/api/teachers/current', {
        method: 'POST',
        body: JSON.stringify({ teacherId: teacher.id })
      });
    }
    await localTeacher.setCurrentTeacher(teacher);
  }

  async updateTeacher(id: string, data: Partial<Teacher>): Promise<Teacher | null> {
    const updated = await apiFetch<Teacher>(`/api/teachers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    if (updated) return updated;
    return localTeacher.updateTeacher(id, data);
  }
}

// 2. CLASS REPOSITORY
export class ServerClassRepository implements IClassRepository {
  async getAll(): Promise<ClassEntity[]> {
    const data = await apiFetch<ClassEntity[]>('/api/classes');
    if (data && Array.isArray(data)) return data;
    return localClass.getAll();
  }

  async getAllByTeacher(teacherId: string): Promise<ClassEntity[]> {
    const data = await apiFetch<ClassEntity[]>(`/api/classes?teacherId=${teacherId}`);
    if (data && Array.isArray(data)) return data;
    return localClass.getAllByTeacher(teacherId);
  }

  async getById(id: string): Promise<ClassEntity | null> {
    const data = await apiFetch<ClassEntity>(`/api/classes/${id}`);
    if (data) return data;
    return localClass.getById(id);
  }

  async getByCode(classCode: string): Promise<ClassEntity | null> {
    const clean = (classCode || '').trim();
    if (!clean) return null;

    // 1. Try direct API endpoint
    const data = await apiFetch<ClassEntity>(`/api/classes/by-code/${encodeURIComponent(clean)}`);
    if (data) return data;

    // 2. Try searching in getAll
    const all = await this.getAll();
    const normalizedInput = clean.toUpperCase().replace(/[\s\-_]/g, '');
    const found = all.find(c => {
      if (c.classCode.toUpperCase() === clean.toUpperCase()) return true;
      return c.classCode.toUpperCase().replace(/[\s\-_]/g, '') === normalizedInput;
    });
    if (found) return found;

    // 3. Fallback to local
    return localClass.getByCode(clean);
  }

  async create(classData: Omit<ClassEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClassEntity> {
    const created = await apiFetch<ClassEntity>('/api/classes', {
      method: 'POST',
      body: JSON.stringify(classData)
    });
    if (created) {
      await localClass.create(created);
      return created;
    }
    return localClass.create(classData);
  }

  async update(id: string, classData: Partial<ClassEntity>): Promise<ClassEntity | null> {
    const updated = await apiFetch<ClassEntity>(`/api/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(classData)
    });
    if (updated) {
      await localClass.update(id, classData);
      return updated;
    }
    return localClass.update(id, classData);
  }

  async delete(id: string): Promise<boolean> {
    const res = await apiFetch<{ success: boolean }>(`/api/classes/${id}`, {
      method: 'DELETE'
    });
    await localClass.delete(id);
    return res?.success ?? true;
  }
}

// 3. STUDENT REPOSITORY
export class ServerStudentRepository implements IStudentRepository {
  async getByClassId(classId: string): Promise<Student[]> {
    const data = await apiFetch<Student[]>(`/api/students?classId=${classId}`);
    if (data && Array.isArray(data)) return data;
    return localStudent.getByClassId(classId);
  }

  async getById(id: string): Promise<Student | null> {
    const data = await apiFetch<Student>(`/api/students/${id}`);
    if (data) return data;
    return localStudent.getById(id);
  }

  async getByNameAndClass(fullName: string, classId: string): Promise<Student | null> {
    const list = await this.getByClassId(classId);
    return list.find(s => s.fullName.toLowerCase().trim() === fullName.toLowerCase().trim()) || null;
  }

  async create(studentData: Omit<Student, 'id' | 'joinedAt'>): Promise<Student> {
    const created = await apiFetch<Student>('/api/students', {
      method: 'POST',
      body: JSON.stringify(studentData)
    });
    if (created) return created;
    return localStudent.create(studentData);
  }

  async update(id: string, data: Partial<Student>): Promise<Student | null> {
    return localStudent.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    return localStudent.delete(id);
  }
}

// 4. LESSON REPOSITORY
export class ServerLessonRepository implements ILessonRepository {
  async getAll(): Promise<Lesson[]> {
    const data = await apiFetch<Lesson[]>('/api/lessons');
    if (data && Array.isArray(data)) return data;
    return localLesson.getAll();
  }

  async getByClassId(classId: string): Promise<Lesson[]> {
    const data = await apiFetch<Lesson[]>(`/api/lessons?classId=${classId}`);
    if (data && Array.isArray(data)) return data;
    return localLesson.getByClassId(classId);
  }

  async getById(id: string): Promise<Lesson | null> {
    const data = await apiFetch<Lesson>(`/api/lessons/${id}`);
    if (data) return data;
    return localLesson.getById(id);
  }

  async getTemplatesByTeacher(teacherId: string): Promise<Lesson[]> {
    const all = await this.getAll();
    return all.filter(l => l.isTemplate && l.teacherId === teacherId);
  }

  async create(lessonData: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lesson> {
    const created = await apiFetch<Lesson>('/api/lessons', {
      method: 'POST',
      body: JSON.stringify(lessonData)
    });
    if (created) return created;
    return localLesson.create(lessonData);
  }

  async update(id: string, data: Partial<Lesson>): Promise<Lesson | null> {
    const updated = await apiFetch<Lesson>(`/api/lessons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    if (updated) return updated;
    return localLesson.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    const res = await apiFetch<{ success: boolean }>(`/api/lessons/${id}`, {
      method: 'DELETE'
    });
    await localLesson.delete(id);
    return res?.success ?? true;
  }

  async duplicate(lessonId: string, targetClassId?: string): Promise<Lesson | null> {
    const duplicated = await apiFetch<Lesson>(`/api/lessons/${lessonId}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ targetClassId })
    });
    if (duplicated) return duplicated;
    return localLesson.duplicate(lessonId, targetClassId);
  }
}

// 5. TASK REPOSITORY
export class ServerTaskRepository implements ITaskRepository {
  async getByLessonId(lessonId: string): Promise<Task[]> {
    const data = await apiFetch<Task[]>(`/api/tasks?lessonId=${lessonId}`);
    if (data && Array.isArray(data)) return data;
    return localTask.getByLessonId(lessonId);
  }

  async getById(id: string): Promise<Task | null> {
    const all = await localTask.getByLessonId('');
    return all.find(t => t.id === id) || null;
  }

  async create(taskData: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
    const created = await apiFetch<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
    if (created) return created;
    return localTask.create(taskData);
  }

  async update(id: string, data: Partial<Task>): Promise<Task | null> {
    const updated = await apiFetch<Task>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    if (updated) return updated;
    return localTask.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    const res = await apiFetch<{ success: boolean }>(`/api/tasks/${id}`, {
      method: 'DELETE'
    });
    await localTask.delete(id);
    return res?.success ?? true;
  }

  async reorder(lessonId: string, taskIds: string[]): Promise<boolean> {
    const res = await apiFetch<{ success: boolean }>('/api/tasks/reorder', {
      method: 'POST',
      body: JSON.stringify({ lessonId, taskIds })
    });
    if (res?.success) return true;
    return localTask.reorder(lessonId, taskIds);
  }
}

// 6. PROGRESS REPOSITORY
export class ServerProgressRepository implements IProgressRepository {
  async getByStudentAndLesson(studentId: string, lessonId: string): Promise<TaskProgress[]> {
    const data = await apiFetch<TaskProgress[]>(`/api/progress?studentId=${studentId}&lessonId=${lessonId}`);
    if (data && Array.isArray(data)) return data;
    return localProgress.getByStudentAndLesson(studentId, lessonId);
  }

  async getByStudentAndTask(studentId: string, taskId: string): Promise<TaskProgress | null> {
    const all = await apiFetch<TaskProgress[]>(`/api/progress?studentId=${studentId}`);
    if (all && Array.isArray(all)) {
      return all.find(p => p.taskId === taskId) || null;
    }
    return localProgress.getByStudentAndTask(studentId, taskId);
  }

  async getAllByStudent(studentId: string): Promise<TaskProgress[]> {
    const data = await apiFetch<TaskProgress[]>(`/api/progress?studentId=${studentId}`);
    if (data && Array.isArray(data)) return data;
    return localProgress.getAllByStudent(studentId);
  }

  async getAllByClass(classId: string): Promise<TaskProgress[]> {
    const data = await apiFetch<TaskProgress[]>(`/api/progress?classId=${classId}`);
    if (data && Array.isArray(data)) return data;
    return localProgress.getAllByClass(classId);
  }

  async upsert(progress: Omit<TaskProgress, 'id'> & { id?: string }): Promise<TaskProgress> {
    const res = await apiFetch<TaskProgress>('/api/progress/upsert', {
      method: 'POST',
      body: JSON.stringify(progress)
    });
    if (res) return res;
    return localProgress.upsert(progress);
  }

  async batchUpsert(progressList: (Omit<TaskProgress, 'id'> & { id?: string })[]): Promise<boolean> {
    for (const p of progressList) {
      await this.upsert(p);
    }
    return true;
  }
}

// 7. ASSIGNMENT REPOSITORY
export class ServerAssignmentRepository implements IAssignmentRepository {
  async getByLessonId(lessonId: string): Promise<Assignment[]> {
    const data = await apiFetch<Assignment[]>(`/api/assignments?lessonId=${lessonId}`);
    if (data && Array.isArray(data)) return data;
    return localAssignment.getByLessonId(lessonId);
  }

  async getByTaskId(taskId: string): Promise<Assignment | null> {
    const data = await apiFetch<Assignment[]>(`/api/assignments?taskId=${taskId}`);
    if (data && Array.isArray(data) && data.length > 0) return data[0];
    return localAssignment.getByTaskId(taskId);
  }

  async getById(id: string): Promise<Assignment | null> {
    return localAssignment.getById(id);
  }

  async create(assignmentData: Omit<Assignment, 'id'>): Promise<Assignment> {
    const created = await apiFetch<Assignment>('/api/assignments', {
      method: 'POST',
      body: JSON.stringify(assignmentData)
    });
    if (created) return created;
    return localAssignment.create(assignmentData);
  }

  async update(id: string, data: Partial<Assignment>): Promise<Assignment | null> {
    return localAssignment.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    return localAssignment.delete(id);
  }
}

// 8. SUBMISSION REPOSITORY
export class ServerSubmissionRepository implements ISubmissionRepository {
  async getByAssignmentId(assignmentId: string): Promise<Submission[]> {
    const data = await apiFetch<Submission[]>(`/api/submissions?assignmentId=${assignmentId}`);
    if (data && Array.isArray(data)) return data;
    return localSubmission.getByAssignmentId(assignmentId);
  }

  async getByLessonId(lessonId: string): Promise<Submission[]> {
    const data = await apiFetch<Submission[]>(`/api/submissions?lessonId=${lessonId}`);
    if (data && Array.isArray(data)) return data;
    return localSubmission.getByLessonId(lessonId);
  }

  async getByClassId(classId: string): Promise<Submission[]> {
    const data = await apiFetch<Submission[]>(`/api/submissions?classId=${classId}`);
    if (data && Array.isArray(data)) return data;
    return localSubmission.getByClassId(classId);
  }

  async getByStudentId(studentId: string): Promise<Submission[]> {
    const data = await apiFetch<Submission[]>(`/api/submissions?studentId=${studentId}`);
    if (data && Array.isArray(data)) return data;
    return localSubmission.getByStudentId(studentId);
  }

  async getByStudentAndTask(studentId: string, taskId: string): Promise<Submission | null> {
    const list = await this.getByStudentId(studentId);
    return list.find(s => s.taskId === taskId) || null;
  }

  async getById(id: string): Promise<Submission | null> {
    const all = await this.getByClassId('');
    return all.find(s => s.id === id) || null;
  }

  async create(subData: Omit<Submission, 'id' | 'submittedAt'>): Promise<Submission> {
    const created = await apiFetch<Submission>('/api/submissions', {
      method: 'POST',
      body: JSON.stringify(subData)
    });
    if (created) return created;
    return localSubmission.create(subData);
  }

  async grade(submissionId: string, score: number, feedback: string, teacherId: string): Promise<Submission | null> {
    const graded = await apiFetch<Submission>(`/api/submissions/${submissionId}/grade`, {
      method: 'POST',
      body: JSON.stringify({ score, feedback, teacherId })
    });
    if (graded) return graded;
    return localSubmission.grade(submissionId, score, feedback, teacherId);
  }
}

// 9. ANNOUNCEMENT REPOSITORY
export class ServerAnnouncementRepository implements IAnnouncementRepository {
  async getByClassId(classId: string): Promise<Announcement[]> {
    const data = await apiFetch<Announcement[]>(`/api/announcements?classId=${classId}`);
    if (data && Array.isArray(data)) return data;
    return localAnnouncement.getByClassId(classId);
  }

  async getByTeacherId(teacherId: string): Promise<Announcement[]> {
    const all = await apiFetch<Announcement[]>('/api/announcements');
    if (all && Array.isArray(all)) return all.filter(a => a.teacherId === teacherId);
    return localAnnouncement.getByTeacherId(teacherId);
  }

  async getForStudent(classId: string): Promise<Announcement[]> {
    return this.getByClassId(classId);
  }

  async create(data: Omit<Announcement, 'id' | 'createdAt'>): Promise<Announcement> {
    const created = await apiFetch<Announcement>('/api/announcements', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (created) return created;
    return localAnnouncement.create(data);
  }

  async delete(id: string): Promise<boolean> {
    return localAnnouncement.delete(id);
  }
}

// 10. CERTIFICATE REPOSITORY
export class ServerCertificateRepository implements ICertificateRepository {
  async getByStudentId(studentId: string): Promise<Certificate[]> {
    const data = await apiFetch<Certificate[]>(`/api/certificates?studentId=${studentId}`);
    if (data && Array.isArray(data)) return data;
    return localCertificate.getByStudentId(studentId);
  }

  async getByClassId(classId: string): Promise<Certificate[]> {
    const data = await apiFetch<Certificate[]>(`/api/certificates?classId=${classId}`);
    if (data && Array.isArray(data)) return data;
    return localCertificate.getByClassId(classId);
  }

  async getById(id: string): Promise<Certificate | null> {
    return localCertificate.getById(id);
  }

  async create(certData: Omit<Certificate, 'id' | 'issuedAt'>): Promise<Certificate> {
    const created = await apiFetch<Certificate>('/api/certificates', {
      method: 'POST',
      body: JSON.stringify(certData)
    });
    if (created) return created;
    return localCertificate.create(certData);
  }
}
