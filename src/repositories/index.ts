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
  FirestoreCertificateRepository,
  ensureFirestoreDatabaseSeeded
} from './FirestoreRepository';
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

// Initialize Cloud Firestore repositories as primary cloud database
export const teacherRepo: ITeacherRepository = new FirestoreTeacherRepository();
export const classRepo: IClassRepository = new FirestoreClassRepository();
export const studentRepo: IStudentRepository = new FirestoreStudentRepository();
export const lessonRepo: ILessonRepository = new FirestoreLessonRepository();
export const taskRepo: ITaskRepository = new FirestoreTaskRepository();
export const progressRepo: IProgressRepository = new FirestoreProgressRepository();
export const assignmentRepo: IAssignmentRepository = new FirestoreAssignmentRepository();
export const submissionRepo: ISubmissionRepository = new FirestoreSubmissionRepository();
export const announcementRepo: IAnnouncementRepository = new FirestoreAnnouncementRepository();
export const certificateRepo: ICertificateRepository = new FirestoreCertificateRepository();

// Trigger background seeding if empty
ensureFirestoreDatabaseSeeded().catch(err => {
  console.warn('[Firestore] Background initialization notice:', err);
});

export * from './interfaces';
export { ensureFirestoreDatabaseSeeded } from './FirestoreRepository';
export { resetAllDataToSeed } from './LocalStorageRepository';

