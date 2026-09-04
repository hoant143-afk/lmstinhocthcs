// Core Types for Smart Blended LMS

export type UserRole = 'ROLE_TEACHER' | 'ROLE_STUDENT';
export type AuthProviderType = 'local' | 'google' | 'local_google';

export interface Teacher {
  id: string;
  fullName: string;
  email: string;
  password?: string;
  avatarUrl?: string;
  title?: string;
  schoolName?: string;
  subject?: string;
  createdAt?: string;
  googleSub?: string;
  authProvider?: AuthProviderType;
}

export interface TeacherLoginDto {
  email: string;
  password?: string;
}

export interface TeacherRegisterDto {
  fullName: string;
  email: string;
  password?: string;
  schoolName?: string;
  subject?: string;
  title?: string;
  avatarUrl?: string;
  googleSub?: string;
  authProvider?: AuthProviderType;
}

export interface GoogleAuthDto {
  credential: string;
  role?: 'teacher' | 'student';
}

export interface GoogleAuthResponse {
  success: boolean;
  token?: string;
  data?: {
    token: string;
    user: {
      id: string;
      fullName: string;
      email: string;
      avatarUrl?: string;
      role: 'teacher' | 'student';
      authProvider?: AuthProviderType;
    };
  };
  error?: string;
  errorCode?: string;
}

export interface ClassEntity {
  id: string;
  teacherId: string;
  name: string;
  subject: string;
  grade: string; // e.g. "Lớp 10", "Lớp 11", "Lớp 12", "Lớp 8"
  schoolYear: string; // e.g. "2025 - 2026"
  description: string;
  classCode: string; // e.g. "BLN-7842"
  certificateEnabled: boolean;
  scoringEnabled: boolean;
  onlineRatio: number; // 30
  offlineRatio: number; // 70
  status?: 'active' | 'inactive';
  joinEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: string;
  fullName: string;
  email: string;
  passwordHash?: string;
  avatarUrl?: string;
  status: 'active' | 'inactive';
  emailVerified?: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  googleSub?: string;
  authProvider?: AuthProviderType;
  // Legacy / backwards compatibility fields
  classId?: string;
  joinedAt?: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  classId: string;
  status: 'active' | 'dropped';
  enrolledAt: string;
}

export interface SessionEntity {
  id: string;
  token: string;
  actorType: 'teacher' | 'student';
  actorId: string;
  expiresAt: string;
  createdAt: string;
  lastUsedAt: string;
  status: 'active' | 'revoked' | 'expired';
}

export type StudentSessionEntity = SessionEntity;

export interface StudentSession {
  token: string;
  studentId: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  classId?: string;
  joinedAt?: string;
}

export interface StudentRegisterDto {
  fullName: string;
  email: string;
  password: string;
}

export interface StudentLoginDto {
  email: string;
  password: string;
}

export interface StudentAuthResponse {
  token: string;
  student: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
    createdAt?: string;
  };
}

export interface EnrolledClassInfo {
  enrollment: Enrollment;
  classEntity: ClassEntity;
  teacher?: Teacher | null;
  lessonCount: number;
  completedLessonCount: number;
  progressPercent: number;
  nearestDeadline?: {
    lessonTitle: string;
    dueAt: string;
  } | null;
}

export type LessonStatus = 'draft' | 'published' | 'active' | 'ended';

export interface Lesson {
  id: string;
  teacherId: string;
  classId: string;
  title: string;
  description: string;
  objectives: string[];
  coverImage?: string;
  status: LessonStatus;
  openAt?: string;
  dueAt?: string;
  sequentialLock: boolean;
  scoringEnabled: boolean;
  order: number;
  isTemplate?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TaskType =
  | 'video'
  | 'document'
  | 'external_link'
  | 'google_drive'
  | 'google_form'
  | 'quiz'
  | 'question'
  | 'practice'
  | 'assignment'
  | 'submission'
  | 'offline_activity'
  | 'teacher_confirmation';

export type TaskPhase = 'online' | 'offline';

export interface QuizOption {
  id?: string;
  text?: string;
  isCorrect?: boolean;
}

export interface QuizQuestion {
  id: string;
  question?: string;
  prompt?: string;
  type?: 'multiple_choice' | 'true_false' | 'short_answer' | string;
  options?: (QuizOption | string)[];
  explanation?: string;
  points?: number;
  correctIndex?: number;
  correctAnswerText?: string;
}

export interface TaskSettings {
  videoUrl?: string;
  videoDuration?: number;
  videoDurationSeconds?: number;
  antiSeekEnabled?: boolean;
  minWatchPercent?: number;
  contentMarkdown?: string;
  documentContent?: string;
  externalUrl?: string;
  embedUrl?: string;
  quizQuestions?: QuizQuestion[];
  questions?: QuizQuestion[];
  minQuizPassScore?: number;
  passScore?: number;
  promptQuestion?: string;
  submissionType?: 'url' | 'file' | 'text' | 'all';
  allowedDomains?: string[];
  allowLinks?: boolean;
  allowFileUpload?: boolean;
  offlineActivityGuide?: string;
  requiresTeacherSignOff?: boolean;
  rubricNotes?: string;
  maxScore?: number;
  allowTextSubmission?: boolean;
  allowUrlSubmission?: boolean;
}

export interface Task {
  id: string;
  lessonId: string;
  title: string;
  description: string;
  type: TaskType;
  phase: TaskPhase; // 'online' (30%) | 'offline' (70%)
  required: boolean;
  order: number;
  durationMinutes?: number;
  points?: number;
  settings: TaskSettings;
  createdAt: string;
}

export interface VideoProgress {
  studentId: string;
  taskId: string;
  currentTime: number;
  maxWatchedTime: number;
  duration: number;
  percent: number;
  completed: boolean;
  lastUpdatedAt: string;
}

export type TaskProgressStatus = 'locked' | 'not_started' | 'in_progress' | 'completed';

export interface TaskProgress {
  id: string;
  studentId: string;
  lessonId: string;
  taskId: string;
  status: TaskProgressStatus;
  percent: number; // 0 to 100
  score?: number;
  maxScore?: number;
  completedAt?: string;
  metadata?: {
    videoProgress?: VideoProgress;
    quizScore?: number;
    quizMaxScore?: number;
    submissionId?: string;
    confirmedByTeacherId?: string;
    confirmedAt?: string;
    studentNotes?: string;
  };
}

export interface LessonProgressSummary {
  lessonId: string;
  studentId: string;
  totalTasks: number;
  totalRequiredTasks: number;
  completedTasks: number;
  completedRequiredTasks: number;
  percent: number;
  isCompleted: boolean;
  statusLabel: 'Chưa bắt đầu' | 'Đang học' | 'Chậm tiến độ' | 'Đã hoàn thành';
}

export interface Assignment {
  id: string;
  lessonId: string;
  taskId: string;
  title: string;
  instructions: string;
  dueAt?: string;
  maxScore: number;
  allowText: boolean;
  allowUrl: boolean;
}

export type SubmissionStatus = 'submitted' | 'graded' | 'needs_revision';

export interface Submission {
  id: string;
  assignmentId: string;
  taskId: string;
  lessonId: string;
  studentId: string;
  classId: string;
  text?: string;
  url?: string;
  urlType?: 'google_drive' | 'google_docs' | 'canva' | 'scratch' | 'github' | 'website' | 'other';
  submittedAt: string;
  status: SubmissionStatus;
  score?: number;
  maxScore?: number;
  feedback?: string;
  gradedAt?: string;
  gradedByTeacherId?: string;
}

export interface Certificate {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  teacherId: string;
  teacherName: string;
  courseName: string;
  grade: string;
  completionRate: number;
  completedAt: string;
  issuedAt: string;
  certificateCode: string;
  verificationCode?: string;
}

export interface Announcement {
  id: string;
  teacherId: string;
  classId: string; // 'all' or specific classId
  title: string;
  content: string;
  isPinned?: boolean;
  createdAt: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
  duration?: number;
}
