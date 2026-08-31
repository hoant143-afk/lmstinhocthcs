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

// Local storage instances
const localTeacherRepo = new LocalStorageTeacherRepository();
const localClassRepo = new LocalStorageClassRepository();
const localStudentRepo = new LocalStorageStudentRepository();
const localLessonRepo = new LocalStorageLessonRepository();
const localTaskRepo = new LocalStorageTaskRepository();
const localProgressRepo = new LocalStorageProgressRepository();
const localAssignmentRepo = new LocalStorageAssignmentRepository();
const localSubmissionRepo = new LocalStorageSubmissionRepository();
const localAnnouncementRepo = new LocalStorageAnnouncementRepository();
const localCertificateRepo = new LocalStorageCertificateRepository();

// AppsScript instances
const appsScriptTeacherRepo = new AppsScriptTeacherRepository();
const appsScriptClassRepo = new AppsScriptClassRepository();
const appsScriptStudentRepo = new AppsScriptStudentRepository();
const appsScriptLessonRepo = new AppsScriptLessonRepository();
const appsScriptTaskRepo = new AppsScriptTaskRepository();
const appsScriptProgressRepo = new AppsScriptProgressRepository();
const appsScriptAssignmentRepo = new AppsScriptAssignmentRepository();
const appsScriptSubmissionRepo = new AppsScriptSubmissionRepository();
const appsScriptAnnouncementRepo = new AppsScriptAnnouncementRepository();
const appsScriptCertificateRepo = new AppsScriptCertificateRepository();

// Dynamic proxy dispatcher that routes to AppsScript if configured, else LocalStorage
function createRepoProxy<T extends object>(getLocal: () => T, getAppsScript: () => T): T {
  return new Proxy({} as T, {
    get(_, prop: string | symbol) {
      const isCloud = apiClient.isAppsScriptConfigured() && apiClient.getDataProvider() === 'appsScript';
      const target = isCloud ? getAppsScript() : getLocal();
      const val = (target as any)[prop];
      if (typeof val === 'function') {
        return val.bind(target);
      }
      return val;
    }
  });
}

export const teacherRepo: ITeacherRepository = createRepoProxy(
  () => localTeacherRepo,
  () => appsScriptTeacherRepo
);

export const classRepo: IClassRepository = createRepoProxy(
  () => localClassRepo,
  () => appsScriptClassRepo
);

export const studentRepo: IStudentRepository = createRepoProxy(
  () => localStudentRepo,
  () => appsScriptStudentRepo
);

export const lessonRepo: ILessonRepository = createRepoProxy(
  () => localLessonRepo,
  () => appsScriptLessonRepo
);

export const taskRepo: ITaskRepository = createRepoProxy(
  () => localTaskRepo,
  () => appsScriptTaskRepo
);

export const progressRepo: IProgressRepository = createRepoProxy(
  () => localProgressRepo,
  () => appsScriptProgressRepo
);

export const assignmentRepo: IAssignmentRepository = createRepoProxy(
  () => localAssignmentRepo,
  () => appsScriptAssignmentRepo
);

export const submissionRepo: ISubmissionRepository = createRepoProxy(
  () => localSubmissionRepo,
  () => appsScriptSubmissionRepo
);

export const announcementRepo: IAnnouncementRepository = createRepoProxy(
  () => localAnnouncementRepo,
  () => appsScriptAnnouncementRepo
);

export const certificateRepo: ICertificateRepository = createRepoProxy(
  () => localCertificateRepo,
  () => appsScriptCertificateRepo
);

export * from './interfaces';
export { resetAllDataToSeed } from './LocalStorageRepository';
