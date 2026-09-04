import {
  AppsScriptTeacherRepository,
  AppsScriptClassRepository,
  AppsScriptStudentRepository,
  AppsScriptLessonRepository,
  AppsScriptTaskRepository,
  AppsScriptProgressRepository,
  AppsScriptAssignmentRepository,
  AppsScriptSubmissionRepository,
  AppsScriptAnnouncementRepository,
  AppsScriptCertificateRepository
} from './AppsScriptRepository';
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
import { ensureFirestoreDatabaseSeeded, purgeFirestoreDemoData } from './FirestoreRepository';

// Initialize Repositories: Google Apps Script + Cloud Firestore hybrid (cross-device source of truth, zero localStorage)
export const teacherRepo: ITeacherRepository = new AppsScriptTeacherRepository();
export const classRepo: IClassRepository = new AppsScriptClassRepository();
export const studentRepo: IStudentRepository = new AppsScriptStudentRepository();
export const lessonRepo: ILessonRepository = new AppsScriptLessonRepository();
export const taskRepo: ITaskRepository = new AppsScriptTaskRepository();
export const progressRepo: IProgressRepository = new AppsScriptProgressRepository();
export const assignmentRepo: IAssignmentRepository = new AppsScriptAssignmentRepository();
export const submissionRepo: ISubmissionRepository = new AppsScriptSubmissionRepository();
export const announcementRepo: IAnnouncementRepository = new AppsScriptAnnouncementRepository();
export const certificateRepo: ICertificateRepository = new AppsScriptCertificateRepository();

// Authenticate Firestore session and clean any legacy demo records
ensureFirestoreDatabaseSeeded().then(() => {
  purgeFirestoreDemoData().catch(() => {});
}).catch(err => {
  console.warn('[Firestore] Initialization notice:', err);
});

export * from './interfaces';
export { ensureFirestoreDatabaseSeeded, purgeFirestoreDemoData } from './FirestoreRepository';
export { resetAllDataToSeed } from './LocalStorageRepository';

