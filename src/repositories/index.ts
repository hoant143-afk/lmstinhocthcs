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
  ServerTeacherRepository,
  ServerClassRepository,
  ServerStudentRepository,
  ServerLessonRepository,
  ServerTaskRepository,
  ServerProgressRepository,
  ServerAssignmentRepository,
  ServerSubmissionRepository,
  ServerAnnouncementRepository,
  ServerCertificateRepository
} from './ServerRepository';
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

// Server-backed instances (handles persistent shared database across all users/devices)
const serverTeacherRepo = new ServerTeacherRepository();
const serverClassRepo = new ServerClassRepository();
const serverStudentRepo = new ServerStudentRepository();
const serverLessonRepo = new ServerLessonRepository();
const serverTaskRepo = new ServerTaskRepository();
const serverProgressRepo = new ServerProgressRepository();
const serverAssignmentRepo = new ServerAssignmentRepository();
const serverSubmissionRepo = new ServerSubmissionRepository();
const serverAnnouncementRepo = new ServerAnnouncementRepository();
const serverCertificateRepo = new ServerCertificateRepository();

// AppsScript instances (if Google Sheet sync is enabled)
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

// Dynamic proxy dispatcher that routes to AppsScript if configured, else ServerRepository
function createRepoProxy<T extends object>(getServer: () => T, getAppsScript: () => T): T {
  return new Proxy({} as T, {
    get(_, prop: string | symbol) {
      const isGoogleCloud = apiClient.isAppsScriptConfigured() && apiClient.getDataProvider() === 'appsScript';
      const target = isGoogleCloud ? getAppsScript() : getServer();
      const val = (target as any)[prop];
      if (typeof val === 'function') {
        return val.bind(target);
      }
      return val;
    }
  });
}

export const teacherRepo: ITeacherRepository = createRepoProxy(
  () => serverTeacherRepo,
  () => appsScriptTeacherRepo
);

export const classRepo: IClassRepository = createRepoProxy(
  () => serverClassRepo,
  () => appsScriptClassRepo
);

export const studentRepo: IStudentRepository = createRepoProxy(
  () => serverStudentRepo,
  () => appsScriptStudentRepo
);

export const lessonRepo: ILessonRepository = createRepoProxy(
  () => serverLessonRepo,
  () => appsScriptLessonRepo
);

export const taskRepo: ITaskRepository = createRepoProxy(
  () => serverTaskRepo,
  () => appsScriptTaskRepo
);

export const progressRepo: IProgressRepository = createRepoProxy(
  () => serverProgressRepo,
  () => appsScriptProgressRepo
);

export const assignmentRepo: IAssignmentRepository = createRepoProxy(
  () => serverAssignmentRepo,
  () => appsScriptAssignmentRepo
);

export const submissionRepo: ISubmissionRepository = createRepoProxy(
  () => serverSubmissionRepo,
  () => appsScriptSubmissionRepo
);

export const announcementRepo: IAnnouncementRepository = createRepoProxy(
  () => serverAnnouncementRepo,
  () => appsScriptAnnouncementRepo
);

export const certificateRepo: ICertificateRepository = createRepoProxy(
  () => serverCertificateRepo,
  () => appsScriptCertificateRepo
);

export * from './interfaces';
export { resetAllDataToSeed } from './LocalStorageRepository';
