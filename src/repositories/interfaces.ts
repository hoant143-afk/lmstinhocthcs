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

export interface ITeacherRepository {
  getAll(): Promise<Teacher[]>;
  getById(id: string): Promise<Teacher | null>;
  getByEmail(email: string): Promise<Teacher | null>;
  create(data: Omit<Teacher, 'id' | 'createdAt'>): Promise<Teacher>;
  getCurrentTeacher(): Promise<Teacher | null>;
  setCurrentTeacher(teacher: Teacher | null): Promise<void>;
  updateTeacher(id: string, data: Partial<Teacher>): Promise<Teacher | null>;
}

export interface IClassRepository {
  getAll(): Promise<ClassEntity[]>;
  getAllByTeacher(teacherId: string): Promise<ClassEntity[]>;
  getById(id: string): Promise<ClassEntity | null>;
  getByCode(classCode: string): Promise<ClassEntity | null>;
  create(classData: Omit<ClassEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClassEntity>;
  update(id: string, classData: Partial<ClassEntity>): Promise<ClassEntity | null>;
  delete(id: string): Promise<boolean>;
}

export interface IStudentRepository {
  getByClassId(classId: string): Promise<Student[]>;
  getById(id: string): Promise<Student | null>;
  getByNameAndClass(fullName: string, classId: string): Promise<Student | null>;
  create(studentData: Omit<Student, 'id' | 'joinedAt'>): Promise<Student>;
  update(id: string, data: Partial<Student>): Promise<Student | null>;
  delete(id: string): Promise<boolean>;
}

export interface ILessonRepository {
  getAll(): Promise<Lesson[]>;
  getByClassId(classId: string): Promise<Lesson[]>;
  getById(id: string): Promise<Lesson | null>;
  getTemplatesByTeacher(teacherId: string): Promise<Lesson[]>;
  create(lessonData: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lesson>;
  update(id: string, data: Partial<Lesson>): Promise<Lesson | null>;
  delete(id: string): Promise<boolean>;
  duplicate(lessonId: string, targetClassId?: string): Promise<Lesson | null>;
}

export interface ITaskRepository {
  getByLessonId(lessonId: string): Promise<Task[]>;
  getById(id: string): Promise<Task | null>;
  create(taskData: Omit<Task, 'id' | 'createdAt'>): Promise<Task>;
  update(id: string, data: Partial<Task>): Promise<Task | null>;
  delete(id: string): Promise<boolean>;
  reorder(lessonId: string, taskIds: string[]): Promise<boolean>;
}

export interface IProgressRepository {
  getByStudentAndLesson(studentId: string, lessonId: string): Promise<TaskProgress[]>;
  getByStudentAndTask(studentId: string, taskId: string): Promise<TaskProgress | null>;
  getAllByStudent(studentId: string): Promise<TaskProgress[]>;
  getAllByClass(classId: string): Promise<TaskProgress[]>;
  upsert(progress: Omit<TaskProgress, 'id'> & { id?: string }): Promise<TaskProgress>;
  batchUpsert(progressList: (Omit<TaskProgress, 'id'> & { id?: string })[]): Promise<boolean>;
}

export interface IAssignmentRepository {
  getByLessonId(lessonId: string): Promise<Assignment[]>;
  getByTaskId(taskId: string): Promise<Assignment | null>;
  getById(id: string): Promise<Assignment | null>;
  create(assignmentData: Omit<Assignment, 'id'>): Promise<Assignment>;
  update(id: string, data: Partial<Assignment>): Promise<Assignment | null>;
  delete(id: string): Promise<boolean>;
}

export interface ISubmissionRepository {
  getByAssignmentId(assignmentId: string): Promise<Submission[]>;
  getByLessonId(lessonId: string): Promise<Submission[]>;
  getByClassId(classId: string): Promise<Submission[]>;
  getByStudentId(studentId: string): Promise<Submission[]>;
  getByStudentAndTask(studentId: string, taskId: string): Promise<Submission | null>;
  getById(id: string): Promise<Submission | null>;
  create(subData: Omit<Submission, 'id' | 'submittedAt'>): Promise<Submission>;
  grade(submissionId: string, score: number, feedback: string, teacherId: string): Promise<Submission | null>;
}

export interface IAnnouncementRepository {
  getByClassId(classId: string): Promise<Announcement[]>;
  getByTeacherId(teacherId: string): Promise<Announcement[]>;
  getForStudent(classId: string): Promise<Announcement[]>;
  create(data: Omit<Announcement, 'id' | 'createdAt'>): Promise<Announcement>;
  delete(id: string): Promise<boolean>;
}

export interface ICertificateRepository {
  getByStudentId(studentId: string): Promise<Certificate[]>;
  getByClassId(classId: string): Promise<Certificate[]>;
  getById(id: string): Promise<Certificate | null>;
  create(certData: Omit<Certificate, 'id' | 'issuedAt'>): Promise<Certificate>;
}
