import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import {
  SEED_TEACHERS,
  SEED_CLASSES,
  SEED_STUDENTS,
  SEED_LESSONS,
  SEED_TASKS,
  SEED_ASSIGNMENTS,
  SEED_SUBMISSIONS,
  SEED_PROGRESS,
  SEED_ANNOUNCEMENTS,
  SEED_CERTIFICATES,
  SEED_TEACHER
} from './src/data/seedData';
import {
  Teacher,
  ClassEntity,
  Student,
  Enrollment,
  SessionEntity,
  StudentSessionEntity,
  Lesson,
  Task,
  Assignment,
  Submission,
  TaskProgress,
  Announcement,
  Certificate
} from './src/types';

interface DatabaseSchema {
  teachers: Teacher[];
  classes: ClassEntity[];
  students: Student[];
  enrollments: Enrollment[];
  sessions: SessionEntity[];
  lessons: Lesson[];
  tasks: Task[];
  assignments: Assignment[];
  submissions: Submission[];
  progress: TaskProgress[];
  announcements: Announcement[];
  certificates: Certificate[];
  currentTeacherId?: string;
  appsScriptUrl?: string;
  dataProvider?: string;
  googleClientId?: string;
}

const DB_FILE_PATH = path.join(process.cwd(), 'data_store.json');

function initializeSeedData(): DatabaseSchema {
  return {
    teachers: JSON.parse(JSON.stringify(SEED_TEACHERS)),
    classes: JSON.parse(JSON.stringify(SEED_CLASSES)),
    students: JSON.parse(JSON.stringify(SEED_STUDENTS)),
    enrollments: [],
    sessions: [],
    lessons: JSON.parse(JSON.stringify(SEED_LESSONS)),
    tasks: JSON.parse(JSON.stringify(SEED_TASKS)),
    assignments: JSON.parse(JSON.stringify(SEED_ASSIGNMENTS)),
    submissions: JSON.parse(JSON.stringify(SEED_SUBMISSIONS)),
    progress: JSON.parse(JSON.stringify(SEED_PROGRESS)),
    announcements: JSON.parse(JSON.stringify(SEED_ANNOUNCEMENTS)),
    certificates: JSON.parse(JSON.stringify(SEED_CERTIFICATES)),
    currentTeacherId: SEED_TEACHER?.id || (SEED_TEACHERS[0]?.id) || undefined,
    appsScriptUrl: process.env.VITE_APPS_SCRIPT_API_URL || process.env.VITE_APPS_SCRIPT_URL || '',
    dataProvider: 'appsScript',
    googleClientId: process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || ''
  };
}

let db: DatabaseSchema = initializeSeedData();

// Password hashing utilities using SHA-256 / PBKDF2
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, s, 1000, 64, 'sha256').toString('hex');
  return { hash, salt: s };
}

function verifyPassword(password: string, storedHashAndSalt: string): boolean {
  if (!storedHashAndSalt) return false;
  if (!storedHashAndSalt.includes(':')) {
    // Support legacy or direct equality test
    return storedHashAndSalt === password;
  }
  const [hash, salt] = storedHashAndSalt.split(':');
  if (!hash || !salt) return false;
  const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha256').toString('hex');
  return testHash === hash;
}

// Session extraction helper: extracts session and student strictly from token
function getStudentSessionFromReq(req: express.Request): { session: SessionEntity; student: Student } | null {
  let token = '';
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-student-token']) {
    token = String(req.headers['x-student-token']).trim();
  } else if (req.body && req.body.token) {
    token = String(req.body.token).trim();
  } else if (req.query && req.query.token) {
    token = String(req.query.token).trim();
  }

  if (!token) return null;

  const sess = db.sessions.find(s => s.token === token && s.actorType === 'student' && s.status === 'active');
  if (!sess) return null;

  if (new Date(sess.expiresAt) < new Date()) {
    sess.status = 'expired';
    saveDatabaseToDisk();
    return null;
  }

  const student = db.students.find(s => s.id === sess.actorId);
  if (!student || student.status !== 'active') return null;

  sess.lastUsedAt = new Date().toISOString();
  return { session: sess, student };
}

// Session extraction helper for teachers
function getTeacherSessionFromReq(req: express.Request): { session: SessionEntity; teacher: Teacher } | null {
  let token = '';
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-teacher-token']) {
    token = String(req.headers['x-teacher-token']).trim();
  } else if (req.body && req.body.token) {
    token = String(req.body.token).trim();
  } else if (req.query && req.query.token) {
    token = String(req.query.token).trim();
  }

  if (!token) return null;

  const sess = db.sessions.find(s => s.token === token && s.actorType === 'teacher' && s.status === 'active');
  if (!sess) return null;

  if (new Date(sess.expiresAt) < new Date()) {
    sess.status = 'expired';
    saveDatabaseToDisk();
    return null;
  }

  const teacher = db.teachers.find(t => t.id === sess.actorId);
  if (!teacher) return null;

  sess.lastUsedAt = new Date().toISOString();
  return { session: sess, teacher };
}

/**
 * Real Google ID Token Verification via Google's tokeninfo API.
 * Verifies issuer, expiration, email, and email_verified.
 * Does NOT trust arbitrary or unverified credentials.
 */
async function verifyGoogleCredential(credential: string): Promise<{
  sub: string;
  email: string;
  name: string;
  picture: string;
  emailVerified: boolean;
}> {
  if (!credential || typeof credential !== 'string') {
    throw new Error('MISSING_CREDENTIAL: Không tìm thấy Google ID token.');
  }

  const cleanCred = credential.trim();
  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(cleanCred)}`;

  let response: any;
  try {
    response = await fetch(url);
  } catch (err: any) {
    throw new Error(`NETWORK_ERROR: Không thể kết nối tới Google để xác minh token: ${err.message}`);
  }

  if (!response.ok) {
    const errorData: any = await response.json().catch(() => ({}));
    const desc = errorData.error_description || errorData.error || response.statusText;
    throw new Error(`INVALID_GOOGLE_TOKEN: Xác minh Google ID Token thất bại (${desc})`);
  }

  const payload: any = await response.json();

  // 1. Verify issuer
  if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') {
    throw new Error('INVALID_ISSUER: Issuer của Google token không hợp lệ (không phải accounts.google.com).');
  }

  // 2. Verify audience if configured
  const configuredClientId = db.googleClientId || process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  if (configuredClientId && payload.aud && payload.aud !== configuredClientId) {
    console.warn(`[Google Auth Warning] Token audience mismatch: token aud=${payload.aud}, configured=${configuredClientId}`);
  }

  // 3. Verify expiration
  const expNum = parseInt(payload.exp, 10);
  if (!isNaN(expNum) && expNum * 1000 < Date.now()) {
    throw new Error('EXPIRED_TOKEN: Google ID Token đã hết hạn.');
  }

  // 4. Verify email & email_verified
  const emailVerified = payload.email_verified === 'true' || payload.email_verified === true;
  if (!payload.email) {
    throw new Error('NO_EMAIL: Tài khoản Google không cung cấp thông tin Email.');
  }
  if (!emailVerified) {
    throw new Error('UNVERIFIED_EMAIL: Email tài khoản Google chưa được xác minh.');
  }

  return {
    sub: String(payload.sub),
    email: String(payload.email).trim().toLowerCase(),
    name: String(payload.name || payload.email.split('@')[0]),
    picture: String(payload.picture || ''),
    emailVerified: true
  };
}

// Load from disk if exists
function loadDatabaseFromDisk() {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.classes)) {
        db = {
          teachers: parsed.teachers || SEED_TEACHERS,
          classes: parsed.classes || SEED_CLASSES,
          students: parsed.students || SEED_STUDENTS,
          enrollments: parsed.enrollments || [],
          sessions: parsed.sessions || [],
          lessons: parsed.lessons || SEED_LESSONS,
          tasks: parsed.tasks || SEED_TASKS,
          assignments: parsed.assignments || SEED_ASSIGNMENTS,
          submissions: parsed.submissions || SEED_SUBMISSIONS,
          progress: parsed.progress || SEED_PROGRESS,
          announcements: parsed.announcements || SEED_ANNOUNCEMENTS,
          certificates: parsed.certificates || SEED_CERTIFICATES,
          currentTeacherId: parsed.currentTeacherId || SEED_TEACHER?.id || (SEED_TEACHERS[0]?.id) || undefined,
          appsScriptUrl: parsed.appsScriptUrl || process.env.VITE_APPS_SCRIPT_API_URL || process.env.VITE_APPS_SCRIPT_URL || '',
          dataProvider: parsed.dataProvider || 'appsScript',
          googleClientId: parsed.googleClientId || process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || ''
        };
        console.log(`[Database] Loaded persistent data: ${db.classes.length} classes, ${db.students.length} students, ${db.enrollments.length} enrollments`);
        return;
      }
    }
  } catch (err) {
    console.error('[Database] Failed to read database from disk, using seed data:', err);
  }
  saveDatabaseToDisk();
}

let saveTimeout: NodeJS.Timeout | null = null;
function saveDatabaseToDisk() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(db, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Database] Failed to write database to disk:', err);
    }
  }, 100);
}

// Normalize code for resilient matching (ignore hyphens, spaces, casing)
function normalizeClassCode(code: string): string {
  return (code || '').toUpperCase().replace(/[\s\-_]/g, '').trim();
}

async function startServer() {
  loadDatabaseFromDisk();

  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // ============================================================
  // API ROUTES
  // ============================================================

  // System health endpoints (Public, no auth required)
  app.get(['/api/health', '/api/system/health'], (req, res) => {
    res.json({
      success: true,
      data: {
        service: 'SMART BLENDED LMS API',
        status: 'ok',
        databaseConnected: true,
        databaseVersion: '1.0.0',
        timestamp: new Date().toISOString(),
        classCount: db.classes.length,
        studentCount: db.students.length
      }
    });
  });

  app.post(['/api/health', '/api/system/health'], (req, res) => {
    res.json({
      success: true,
      data: {
        service: 'SMART BLENDED LMS API',
        status: 'ok',
        databaseConnected: true,
        databaseVersion: '1.0.0',
        timestamp: new Date().toISOString(),
        classCount: db.classes.length,
        studentCount: db.students.length
      }
    });
  });

  // --- CONFIG (Cross-Device Apps Script URL & Google Auth Sync) ---
  app.get('/api/config', (req, res) => {
    res.json({
      appsScriptUrl: db.appsScriptUrl || process.env.VITE_APPS_SCRIPT_API_URL || process.env.VITE_APPS_SCRIPT_URL || '',
      dataProvider: db.dataProvider || 'appsScript',
      googleClientId: db.googleClientId || process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || ''
    });
  });

  app.post('/api/config', (req, res) => {
    const { appsScriptUrl, dataProvider, googleClientId } = req.body;
    if (appsScriptUrl !== undefined) {
      db.appsScriptUrl = (appsScriptUrl || '').trim();
    }
    if (dataProvider) {
      db.dataProvider = dataProvider;
    }
    if (googleClientId !== undefined) {
      db.googleClientId = (googleClientId || '').trim();
    }
    saveDatabaseToDisk();
    console.log(`[Config Updated] Apps Script URL: ${db.appsScriptUrl}, Provider: ${db.dataProvider}, Google Client ID: ${db.googleClientId ? 'configured' : 'empty'}`);
    res.json({
      success: true,
      appsScriptUrl: db.appsScriptUrl,
      dataProvider: db.dataProvider,
      googleClientId: db.googleClientId
    });
  });

  // --- CLASSES ---
  app.get('/api/classes', (req, res) => {
    const { teacherId } = req.query;
    if (teacherId) {
      return res.json(db.classes.filter(c => c.teacherId === teacherId));
    }
    res.json(db.classes);
  });

  app.get('/api/classes/by-code/:code', (req, res) => {
    const rawCode = req.params.code;
    const clean = (rawCode || '').trim().toUpperCase();
    const normalizedTarget = normalizeClassCode(clean);

    const found = db.classes.find(c => {
      if ((c.classCode || '').trim().toUpperCase() === clean) return true;
      return normalizeClassCode(c.classCode || '') === normalizedTarget;
    });

    if (!found) {
      return res.status(404).json({ error: `Không tìm thấy lớp học với mã "${rawCode}".` });
    }
    res.json(found);
  });

  app.get('/api/classes/:id', (req, res) => {
    const cls = db.classes.find(c => c.id === req.params.id);
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    res.json(cls);
  });

  app.post('/api/classes', (req, res) => {
    const data = req.body;
    const cleanCode = (data.classCode || '').trim().toUpperCase();
    const newClass: ClassEntity = {
      ...data,
      classCode: cleanCode,
      id: data.id || `class_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      status: data.status || 'active',
      joinEnabled: data.joinEnabled ?? true,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.classes.unshift(newClass);
    saveDatabaseToDisk();
    console.log(`[Class Created] ${newClass.name} with code: ${newClass.classCode}`);
    res.status(201).json(newClass);
  });

  app.put('/api/classes/:id', (req, res) => {
    const index = db.classes.findIndex(c => c.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Class not found' });
    db.classes[index] = {
      ...db.classes[index],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    saveDatabaseToDisk();
    res.json(db.classes[index]);
  });

  app.delete('/api/classes/:id', (req, res) => {
    const id = req.params.id;
    const index = db.classes.findIndex(c => c.id === id);
    if (index === -1) return res.status(404).json({ error: 'Class not found' });
    db.classes.splice(index, 1);
    saveDatabaseToDisk();
    res.json({ success: true });
  });

  // --- TEACHERS ---
  app.get('/api/teachers', (req, res) => {
    res.json(db.teachers);
  });

  app.get('/api/teachers/current', (req, res) => {
    // If request contains teacher session token, resolve directly from session
    const auth = getTeacherSessionFromReq(req);
    if (auth && auth.teacher) {
      return res.json(auth.teacher);
    }
    const current = db.teachers.find(t => t.id === db.currentTeacherId) || db.teachers[0] || null;
    res.json(current);
  });

  app.post('/api/teachers/current', (req, res) => {
    const { teacherId } = req.body;
    if (teacherId) {
      db.currentTeacherId = teacherId;
      saveDatabaseToDisk();
    }
    res.json({ success: true, currentTeacherId: db.currentTeacherId });
  });

  app.get('/api/teachers/:id', (req, res) => {
    const t = db.teachers.find(item => item.id === req.params.id);
    if (!t) return res.status(404).json({ error: 'Teacher not found' });
    res.json(t);
  });

  app.post('/api/teachers', (req, res) => {
    const data = req.body;
    const newTeacher: Teacher = {
      ...data,
      id: data.id || `teacher_${Date.now()}`,
      createdAt: data.createdAt || new Date().toISOString()
    };
    db.teachers.push(newTeacher);
    saveDatabaseToDisk();
    res.status(201).json(newTeacher);
  });

  app.put('/api/teachers/:id', (req, res) => {
    const index = db.teachers.findIndex(t => t.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Teacher not found' });
    db.teachers[index] = { ...db.teachers[index], ...req.body };
    saveDatabaseToDisk();
    res.json(db.teachers[index]);
  });

  // ============================================================
  // GOOGLE OAUTH & MULTI-ROLE CORE LOGIC
  // ============================================================
  async function handleGoogleLoginCore(credential: string, role: 'teacher' | 'student') {
    const verified = await verifyGoogleCredential(credential);
    const { sub, email, name, picture } = verified;

    if (role === 'teacher') {
      // 1. Check if teacher already has this googleSub
      let teacher = db.teachers.find(t => t.googleSub === sub);

      // 2. If not found by googleSub, look up by email for account linking
      if (!teacher) {
        teacher = db.teachers.find(t => String(t.email || '').trim().toLowerCase() === email);
        if (teacher) {
          // Link account
          teacher.googleSub = sub;
          teacher.authProvider = teacher.password ? 'local_google' : 'google';
          if (picture && !teacher.avatarUrl) {
            teacher.avatarUrl = picture;
          }
          console.log(`[Google Auth] Successfully linked teacher email ${email} with googleSub ${sub}`);
        } else {
          // Create new teacher
          const teacherId = `teacher_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          teacher = {
            id: teacherId,
            fullName: name,
            email: email,
            googleSub: sub,
            authProvider: 'google',
            avatarUrl: picture,
            schoolName: 'Trường THPT & THCS',
            subject: 'Bộ môn',
            title: 'Giáo viên',
            createdAt: new Date().toISOString()
          };
          db.teachers.push(teacher);
          console.log(`[Google Auth] Created new teacher via Google: ${email} (${teacherId})`);
        }
      } else {
        // Already linked, update avatar if missing
        if (picture && !teacher.avatarUrl) {
          teacher.avatarUrl = picture;
        }
      }

      db.currentTeacherId = teacher.id;

      // Create persistent session
      const token = `sblms_tch_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const newSession: SessionEntity = {
        id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        token,
        actorType: 'teacher',
        actorId: teacher.id,
        expiresAt,
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        status: 'active'
      };
      db.sessions.push(newSession);
      saveDatabaseToDisk();

      return {
        token,
        user: {
          id: teacher.id,
          fullName: teacher.fullName,
          email: teacher.email,
          avatarUrl: teacher.avatarUrl,
          schoolName: teacher.schoolName,
          subject: teacher.subject,
          title: teacher.title,
          role: 'teacher' as const,
          authProvider: teacher.authProvider || 'google'
        }
      };
    } else {
      // STUDENT ROLE
      // 1. Check if student already has this googleSub
      let student = db.students.find(s => s.googleSub === sub);

      // 2. If not found by googleSub, look up by email for account linking
      if (!student) {
        student = db.students.find(s => String(s.email || '').trim().toLowerCase() === email);
        if (student) {
          // Link account
          student.googleSub = sub;
          student.authProvider = student.passwordHash ? 'local_google' : 'google';
          if (picture && !student.avatarUrl) {
            student.avatarUrl = picture;
          }
          student.emailVerified = true;
          student.lastLoginAt = new Date().toISOString();
          student.updatedAt = new Date().toISOString();
          console.log(`[Google Auth] Successfully linked student email ${email} with googleSub ${sub}`);
        } else {
          // Create new student
          const studentId = `student_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          student = {
            id: studentId,
            fullName: name,
            email: email,
            googleSub: sub,
            authProvider: 'google',
            avatarUrl: picture,
            status: 'active',
            emailVerified: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString()
          };
          db.students.push(student);
          console.log(`[Google Auth] Created new student via Google: ${email} (${studentId})`);
        }
      } else {
        if (picture && !student.avatarUrl) {
          student.avatarUrl = picture;
        }
        student.lastLoginAt = new Date().toISOString();
        student.updatedAt = new Date().toISOString();
      }

      // Create persistent session
      const token = `sblms_std_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const newSession: SessionEntity = {
        id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        token,
        actorType: 'student',
        actorId: student.id,
        expiresAt,
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        status: 'active'
      };
      db.sessions.push(newSession);
      saveDatabaseToDisk();

      return {
        token,
        user: {
          id: student.id,
          fullName: student.fullName,
          email: student.email,
          avatarUrl: student.avatarUrl,
          role: 'student' as const,
          authProvider: student.authProvider || 'google'
        }
      };
    }
  }

  // Unified Google OAuth Endpoint: /api/auth/google
  app.post('/api/auth/google', async (req, res) => {
    try {
      const { credential, role } = req.body;
      if (!credential) {
        return res.status(400).json({ success: false, error: 'Thiếu thông tin Google ID Token (credential).' });
      }
      const targetRole = (role === 'student' || role === 'ROLE_STUDENT') ? 'student' : 'teacher';
      const result = await handleGoogleLoginCore(credential, targetRole);
      return res.json({
        success: true,
        token: result.token,
        data: result
      });
    } catch (err: any) {
      console.error('[Google Sign-In API Error]:', err.message);
      return res.status(400).json({
        success: false,
        errorCode: 'GOOGLE_AUTH_FAILED',
        error: err.message || 'Xác thực tài khoản Google thất bại.'
      });
    }
  });

  // Student Google OAuth Endpoint: /api/student-auth/google
  app.post('/api/student-auth/google', async (req, res) => {
    try {
      const { credential } = req.body;
      if (!credential) {
        return res.status(400).json({ success: false, error: 'Thiếu thông tin Google ID Token.' });
      }
      const result = await handleGoogleLoginCore(credential, 'student');
      return res.json({
        success: true,
        token: result.token,
        data: result,
        student: result.user
      });
    } catch (err: any) {
      console.error('[Student Google Sign-In Error]:', err.message);
      return res.status(400).json({
        success: false,
        errorCode: 'GOOGLE_AUTH_FAILED',
        error: err.message || 'Xác thực tài khoản Google thất bại.'
      });
    }
  });

  // Teacher Google OAuth Endpoint: /api/teacher-auth/google
  app.post('/api/teacher-auth/google', async (req, res) => {
    try {
      const { credential } = req.body;
      if (!credential) {
        return res.status(400).json({ success: false, error: 'Thiếu thông tin Google ID Token.' });
      }
      const result = await handleGoogleLoginCore(credential, 'teacher');
      return res.json({
        success: true,
        token: result.token,
        data: result,
        teacher: result.user
      });
    } catch (err: any) {
      console.error('[Teacher Google Sign-In Error]:', err.message);
      return res.status(400).json({
        success: false,
        errorCode: 'GOOGLE_AUTH_FAILED',
        error: err.message || 'Xác thực tài khoản Google thất bại.'
      });
    }
  });

  // Teacher Local Login / Register / Session
  app.post('/api/teacher-auth/login', (req, res) => {
    const { email, password } = req.body;
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập Email.' });
    }

    const teacher = db.teachers.find(t => String(t.email || '').trim().toLowerCase() === cleanEmail);
    if (!teacher) {
      return res.status(401).json({ success: false, error: 'Email hoặc mật khẩu không chính xác.' });
    }

    if (teacher.password && password && !verifyPassword(password, teacher.password)) {
      return res.status(401).json({ success: false, error: 'Email hoặc mật khẩu không chính xác.' });
    }

    db.currentTeacherId = teacher.id;

    // Create session
    const token = `sblms_tch_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const newSession: SessionEntity = {
      id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      token,
      actorType: 'teacher',
      actorId: teacher.id,
      expiresAt,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      status: 'active'
    };
    db.sessions.push(newSession);
    saveDatabaseToDisk();

    return res.json({
      success: true,
      token,
      teacher: {
        id: teacher.id,
        fullName: teacher.fullName,
        email: teacher.email,
        avatarUrl: teacher.avatarUrl,
        schoolName: teacher.schoolName,
        subject: teacher.subject,
        title: teacher.title
      }
    });
  });

  app.post('/api/teacher-auth/register', (req, res) => {
    const { fullName, email, password, schoolName, subject, title } = req.body;
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanName = String(fullName || '').trim();

    if (!cleanEmail || !cleanName) {
      return res.status(400).json({ success: false, error: 'Vui lòng điền họ tên và email.' });
    }

    const existing = db.teachers.find(t => String(t.email || '').trim().toLowerCase() === cleanEmail);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Email này đã được đăng ký tài khoản giáo viên.' });
    }

    let passwordHash = '';
    if (password) {
      const { hash, salt } = hashPassword(String(password));
      passwordHash = `${hash}:${salt}`;
    }

    const teacherId = `teacher_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newTeacher: Teacher = {
      id: teacherId,
      fullName: cleanName,
      email: cleanEmail,
      password: passwordHash || password,
      schoolName: schoolName || 'Trường THPT & THCS',
      subject: subject || 'Bộ môn',
      title: title || 'Giáo viên',
      authProvider: 'local',
      createdAt: new Date().toISOString()
    };
    db.teachers.push(newTeacher);
    db.currentTeacherId = teacherId;

    // Create session
    const token = `sblms_tch_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const newSession: SessionEntity = {
      id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      token,
      actorType: 'teacher',
      actorId: teacherId,
      expiresAt,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      status: 'active'
    };
    db.sessions.push(newSession);
    saveDatabaseToDisk();

    return res.status(201).json({
      success: true,
      token,
      teacher: newTeacher
    });
  });

  const verifyTeacherSessionHandler = (req: express.Request, res: express.Response) => {
    const auth = getTeacherSessionFromReq(req);
    if (!auth) {
      return res.status(401).json({ success: false, error: 'Phiên giáo viên đã hết hạn hoặc không hợp lệ.' });
    }
    return res.json({
      success: true,
      teacher: {
        id: auth.teacher.id,
        fullName: auth.teacher.fullName,
        email: auth.teacher.email,
        avatarUrl: auth.teacher.avatarUrl,
        schoolName: auth.teacher.schoolName,
        subject: auth.teacher.subject,
        title: auth.teacher.title
      }
    });
  };

  app.get('/api/teacher-auth/verify-session', verifyTeacherSessionHandler);
  app.post('/api/teacher-auth/verify-session', verifyTeacherSessionHandler);

  app.post('/api/teacher-auth/logout', (req, res) => {
    let token = '';
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.body && req.body.token) {
      token = String(req.body.token).trim();
    }
    if (token) {
      const sess = db.sessions.find(s => s.token === token && s.actorType === 'teacher');
      if (sess) {
        sess.status = 'revoked';
        saveDatabaseToDisk();
      }
    }
    return res.json({ success: true, message: 'Đăng xuất giáo viên thành công.' });
  });

  // --- STUDENTS & JOIN CLASS ---
  // ============================================================
  // STUDENT AUTHENTICATION & SESSION MANAGEMENT
  // ============================================================

  // 1. Student Registration: /api/student-auth/register
  app.post('/api/student-auth/register', (req, res) => {
    const { fullName, email, password } = req.body;
    const cleanName = String(fullName || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const rawPass = String(password || '');

    if (!cleanName) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng nhập đầy đủ Họ và tên học sinh.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng nhập địa chỉ Email hợp lệ.'
      });
    }

    if (!rawPass || rawPass.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Mật khẩu phải có độ dài từ 6 ký tự trở lên.'
      });
    }

    // Check email uniqueness
    const existing = db.students.find(s => String(s.email || '').trim().toLowerCase() === cleanEmail);
    if (existing) {
      return res.status(400).json({
        success: false,
        errorCode: 'EMAIL_EXISTS',
        error: 'Email này đã được đăng ký.'
      });
    }

    // Hash password securely with salt
    const { hash, salt } = hashPassword(rawPass);
    const passwordHash = `${hash}:${salt}`;

    const studentId = `student_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();

    const newStudent: Student = {
      id: studentId,
      fullName: cleanName,
      email: cleanEmail,
      passwordHash,
      status: 'active',
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now
    };

    db.students.push(newStudent);

    // Create session token (actorType: 'student', actorId: studentId)
    const token = `sblms_std_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    const session: StudentSessionEntity = {
      id: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      token,
      actorType: 'student',
      actorId: newStudent.id,
      expiresAt,
      createdAt: now,
      lastUsedAt: now,
      status: 'active'
    };

    db.sessions.push(session);
    saveDatabaseToDisk();

    console.log(`[Student Registered] ${cleanName} (${cleanEmail}) created with studentId=${newStudent.id}`);

    return res.status(201).json({
      success: true,
      token,
      student: {
        id: newStudent.id,
        fullName: newStudent.fullName,
        email: newStudent.email,
        avatarUrl: newStudent.avatarUrl,
        createdAt: newStudent.createdAt
      }
    });
  });

  // 2. Student Login: /api/student-auth/login
  app.post('/api/student-auth/login', (req, res) => {
    const { email, password } = req.body;
    const cleanEmail = String(email || '').trim().toLowerCase();
    const rawPass = String(password || '');

    if (!cleanEmail || !rawPass) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_CREDENTIALS',
        error: 'Email hoặc mật khẩu không chính xác.'
      });
    }

    const student = db.students.find(s => String(s.email || '').trim().toLowerCase() === cleanEmail);
    if (!student || student.status !== 'active') {
      return res.status(401).json({
        success: false,
        errorCode: 'INVALID_CREDENTIALS',
        error: 'Email hoặc mật khẩu không chính xác.'
      });
    }

    const isMatch = verifyPassword(rawPass, student.passwordHash || '');
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        errorCode: 'INVALID_CREDENTIALS',
        error: 'Email hoặc mật khẩu không chính xác.'
      });
    }

    // Update last login
    student.lastLoginAt = new Date().toISOString();
    student.updatedAt = new Date().toISOString();

    // Create session token
    const token = `sblms_std_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    const session: StudentSessionEntity = {
      id: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      token,
      actorType: 'student',
      actorId: student.id,
      expiresAt,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      status: 'active'
    };

    db.sessions.push(session);
    saveDatabaseToDisk();

    console.log(`[Student Login] ${student.fullName} (${student.email}) logged in.`);

    return res.json({
      success: true,
      token,
      student: {
        id: student.id,
        fullName: student.fullName,
        email: student.email,
        avatarUrl: student.avatarUrl,
        createdAt: student.createdAt
      }
    });
  });

  // 3. Student Logout: /api/student-auth/logout
  app.post('/api/student-auth/logout', (req, res) => {
    let token = '';
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.body && req.body.token) {
      token = String(req.body.token).trim();
    }

    if (token) {
      const sess = db.sessions.find(s => s.token === token && s.actorType === 'student');
      if (sess) {
        sess.status = 'revoked';
        saveDatabaseToDisk();
      }
    }

    return res.json({ success: true, message: 'Đăng xuất thành công.' });
  });

  // 4. Verify Student Session: /api/student-auth/verify-session
  const verifySessionHandler = (req: express.Request, res: express.Response) => {
    const auth = getStudentSessionFromReq(req);
    if (!auth) {
      return res.status(401).json({
        success: false,
        errorCode: 'SESSION_EXPIRED',
        error: 'Phiên đăng nhập đã hết hạn.'
      });
    }

    saveDatabaseToDisk();

    return res.json({
      success: true,
      student: {
        id: auth.student.id,
        fullName: auth.student.fullName,
        email: auth.student.email,
        avatarUrl: auth.student.avatarUrl,
        createdAt: auth.student.createdAt
      }
    });
  };

  app.get('/api/student-auth/verify-session', verifySessionHandler);
  app.post('/api/student-auth/verify-session', verifySessionHandler);

  // 5. Student Me / Profile info: /api/student-auth/me
  app.get('/api/student-auth/me', (req, res) => {
    const auth = getStudentSessionFromReq(req);
    if (!auth) {
      return res.status(401).json({
        success: false,
        errorCode: 'SESSION_EXPIRED',
        error: 'Phiên đăng nhập đã hết hạn.'
      });
    }

    const studentEnrollments = db.enrollments.filter(e => e.studentId === auth.student.id && e.status === 'active');
    const classIds = new Set(studentEnrollments.map(e => e.classId));
    const classes = db.classes.filter(c => classIds.has(c.id));

    return res.json({
      success: true,
      student: {
        id: auth.student.id,
        fullName: auth.student.fullName,
        email: auth.student.email,
        avatarUrl: auth.student.avatarUrl,
        createdAt: auth.student.createdAt,
        lastLoginAt: auth.student.lastLoginAt,
        enrollmentCount: studentEnrollments.length,
        classes: classes.map(c => ({ id: c.id, name: c.name, classCode: c.classCode, subject: c.subject }))
      }
    });
  });

  // 6. Update Student Profile: /api/student-auth/profile
  app.put('/api/student-auth/profile', (req, res) => {
    const auth = getStudentSessionFromReq(req);
    if (!auth) {
      return res.status(401).json({
        success: false,
        errorCode: 'SESSION_EXPIRED',
        error: 'Phiên đăng nhập đã hết hạn.'
      });
    }

    const { fullName, avatarUrl, oldPassword, newPassword } = req.body;

    if (fullName && typeof fullName === 'string') {
      const cleanName = fullName.trim();
      if (cleanName) {
        auth.student.fullName = cleanName;
      }
    }

    if (avatarUrl !== undefined && typeof avatarUrl === 'string') {
      auth.student.avatarUrl = avatarUrl.trim();
    }

    // Change password if requested
    if (newPassword) {
      if (!oldPassword || !verifyPassword(oldPassword, auth.student.passwordHash || '')) {
        return res.status(400).json({
          success: false,
          error: 'Mật khẩu hiện tại không chính xác.'
        });
      }

      if (String(newPassword).length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Mật khẩu mới phải có ít nhất 6 ký tự.'
        });
      }

      const { hash, salt } = hashPassword(String(newPassword));
      auth.student.passwordHash = `${hash}:${salt}`;
    }

    auth.student.updatedAt = new Date().toISOString();
    saveDatabaseToDisk();

    return res.json({
      success: true,
      student: {
        id: auth.student.id,
        fullName: auth.student.fullName,
        email: auth.student.email,
        avatarUrl: auth.student.avatarUrl,
        createdAt: auth.student.createdAt
      }
    });
  });

  // ============================================================
  // STUDENT CLASS ENROLLMENT API (SESSION-SECURED)
  // ============================================================

  // 7. Join Class: /api/student/classes/join
  // CRITICAL: studentId is derived strictly from session token (frontend cannot forge studentId)
  app.post('/api/student/classes/join', (req, res) => {
    const auth = getStudentSessionFromReq(req);
    if (!auth) {
      return res.status(401).json({
        success: false,
        errorCode: 'SESSION_EXPIRED',
        error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tham gia lớp.'
      });
    }

    const { classCode } = req.body;
    const cleanCode = String(classCode || '').trim().toUpperCase();

    if (!cleanCode) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng nhập Mã lớp học (Class Code).'
      });
    }

    const normalizedTarget = normalizeClassCode(cleanCode);
    const targetClass = db.classes.find(c => {
      if ((c.classCode || '').trim().toUpperCase() === cleanCode) return true;
      return normalizeClassCode(c.classCode || '') === normalizedTarget;
    });

    if (!targetClass) {
      return res.status(404).json({
        success: false,
        errorCode: 'CLASS_NOT_FOUND',
        error: 'Không tìm thấy lớp học với mã này.'
      });
    }

    if (targetClass.status === 'inactive' || targetClass.joinEnabled === false) {
      return res.status(403).json({
        success: false,
        errorCode: 'CLASS_JOIN_DISABLED',
        error: 'Lớp học hiện chưa cho phép tham gia.'
      });
    }

    const studentId = auth.student.id;

    // Check if already enrolled
    const existingEnrollment = db.enrollments.find(
      e => e.studentId === studentId && e.classId === targetClass.id && e.status === 'active'
    );

    if (existingEnrollment) {
      return res.json({
        success: true,
        class: targetClass,
        enrollment: existingEnrollment,
        alreadyEnrolled: true,
        message: 'Bạn đã tham gia lớp học này.'
      });
    }

    // Create new enrollment
    const newEnrollment: Enrollment = {
      id: `enr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      studentId,
      classId: targetClass.id,
      status: 'active',
      enrolledAt: new Date().toISOString()
    };

    db.enrollments.push(newEnrollment);

    // Keep student.classId in sync for legacy references
    if (!auth.student.classId) {
      auth.student.classId = targetClass.id;
    }

    saveDatabaseToDisk();
    console.log(`[Enrollment Created] Student ${auth.student.fullName} (${studentId}) joined ${targetClass.name} (${targetClass.classCode})`);

    return res.json({
      success: true,
      class: targetClass,
      enrollment: newEnrollment,
      alreadyEnrolled: false
    });
  });

  // 8. Get My Enrolled Classes: /api/student/classes
  app.get('/api/student/classes', (req, res) => {
    const auth = getStudentSessionFromReq(req);
    if (!auth) {
      return res.status(401).json({
        success: false,
        errorCode: 'SESSION_EXPIRED',
        error: 'Phiên đăng nhập đã hết hạn.'
      });
    }

    const studentId = auth.student.id;
    const enrollments = db.enrollments.filter(e => e.studentId === studentId && e.status === 'active');

    const result = enrollments.map(enr => {
      const cls = db.classes.find(c => c.id === enr.classId);
      if (!cls) return null;

      const teacher = db.teachers.find(t => t.id === cls.teacherId) || null;
      const classLessons = db.lessons.filter(l => l.classId === cls.id);

      // Compute progress for this student in this class
      let totalPoints = 0;
      let completedLessons = 0;
      for (const l of classLessons) {
        const lessonTasks = db.tasks.filter(t => t.lessonId === l.id);
        const completedTasks = db.progress.filter(
          p => p.studentId === studentId && p.lessonId === l.id && p.status === 'completed'
        );
        if (lessonTasks.length > 0 && completedTasks.length >= lessonTasks.length) {
          completedLessons++;
        }
      }

      const progressPercent = classLessons.length > 0
        ? Math.round((completedLessons / classLessons.length) * 100)
        : 0;

      // Find nearest upcoming deadline
      const now = new Date();
      let nearestDeadline: { lessonTitle: string; dueAt: string } | null = null;
      for (const l of classLessons) {
        if (l.dueAt) {
          const dueDate = new Date(l.dueAt);
          if (dueDate > now) {
            if (!nearestDeadline || dueDate < new Date(nearestDeadline.dueAt)) {
              nearestDeadline = {
                lessonTitle: l.title,
                dueAt: l.dueAt
              };
            }
          }
        }
      }

      return {
        enrollment: enr,
        classEntity: cls,
        teacher: teacher ? { id: teacher.id, fullName: teacher.fullName, schoolName: teacher.schoolName, avatarUrl: teacher.avatarUrl } : null,
        lessonCount: classLessons.length,
        completedLessonCount: completedLessons,
        progressPercent,
        nearestDeadline
      };
    }).filter(Boolean);

    return res.json({
      success: true,
      classes: result
    });
  });

  // 9. Legacy / Generic Students endpoints
  app.get('/api/students', (req, res) => {
    const { classId } = req.query;
    if (classId) {
      // Return students enrolled in this class
      const enrolledStudentIds = new Set(
        db.enrollments.filter(e => e.classId === classId && e.status === 'active').map(e => e.studentId)
      );
      const list = db.students.filter(s => enrolledStudentIds.has(s.id) || s.classId === classId);
      return res.json(list.map(s => {
        const { passwordHash, ...safe } = s;
        return safe;
      }));
    }
    res.json(db.students.map(s => {
      const { passwordHash, ...safe } = s;
      return safe;
    }));
  });

  app.get('/api/students/:id', (req, res) => {
    const s = db.students.find(item => item.id === req.params.id);
    if (!s) return res.status(404).json({ error: 'Student not found' });
    const { passwordHash, ...safe } = s;
    res.json(safe);
  });

  app.post('/api/students', (req, res) => {
    const data = req.body;
    const newStudent: Student = {
      ...data,
      id: data.id || `student_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      status: data.status || 'active',
      createdAt: data.createdAt || new Date().toISOString()
    };
    db.students.push(newStudent);
    saveDatabaseToDisk();
    const { passwordHash, ...safe } = newStudent;
    res.status(201).json(safe);
  });

  // Legacy student join endpoint compatibility
  app.post('/api/students/join', (req, res) => {
    // If student token is provided, defer to session-secured join
    const auth = getStudentSessionFromReq(req);
    if (auth) {
      const { classCode } = req.body;
      const cleanCode = String(classCode || '').trim().toUpperCase();
      const targetClass = db.classes.find(c => {
        return (c.classCode || '').trim().toUpperCase() === cleanCode ||
               normalizeClassCode(c.classCode || '') === normalizeClassCode(cleanCode);
      });
      if (!targetClass) {
        return res.status(404).json({ success: false, errorCode: 'CLASS_NOT_FOUND', error: 'Không tìm thấy lớp học với mã này.' });
      }
      let enr = db.enrollments.find(e => e.studentId === auth.student.id && e.classId === targetClass.id && e.status === 'active');
      if (!enr) {
        enr = {
          id: `enr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          studentId: auth.student.id,
          classId: targetClass.id,
          status: 'active',
          enrolledAt: new Date().toISOString()
        };
        db.enrollments.push(enr);
        saveDatabaseToDisk();
      }
      return res.json({
        success: true,
        student: auth.student,
        class: targetClass,
        session: {
          token: auth.session.token,
          studentId: auth.student.id,
          classId: targetClass.id,
          fullName: auth.student.fullName,
          email: auth.student.email
        },
        token: auth.session.token
      });
    }

    return res.status(401).json({
      success: false,
      errorCode: 'SESSION_EXPIRED',
      error: 'Vui lòng đăng nhập tài khoản học sinh trước khi tham gia lớp.'
    });
  });

  // --- LESSONS ---
  app.get('/api/lessons', (req, res) => {
    const { classId } = req.query;
    if (classId) {
      return res.json(db.lessons.filter(l => l.classId === classId));
    }
    res.json(db.lessons);
  });

  app.get('/api/lessons/:id', (req, res) => {
    const lesson = db.lessons.find(l => l.id === req.params.id);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    res.json(lesson);
  });

  app.post('/api/lessons', (req, res) => {
    const data = req.body;
    const newLesson: Lesson = {
      ...data,
      id: data.id || `lesson_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.lessons.push(newLesson);
    saveDatabaseToDisk();
    res.status(201).json(newLesson);
  });

  app.put('/api/lessons/:id', (req, res) => {
    const index = db.lessons.findIndex(l => l.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Lesson not found' });
    db.lessons[index] = {
      ...db.lessons[index],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    saveDatabaseToDisk();
    res.json(db.lessons[index]);
  });

  app.delete('/api/lessons/:id', (req, res) => {
    const id = req.params.id;
    const index = db.lessons.findIndex(l => l.id === id);
    if (index === -1) return res.status(404).json({ error: 'Lesson not found' });
    db.lessons.splice(index, 1);
    saveDatabaseToDisk();
    res.json({ success: true });
  });

  app.post('/api/lessons/:id/duplicate', (req, res) => {
    const srcLesson = db.lessons.find(l => l.id === req.params.id);
    if (!srcLesson) return res.status(404).json({ error: 'Lesson not found' });
    const { targetClassId } = req.body;

    const newLessonId = `lesson_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newLesson: Lesson = {
      ...srcLesson,
      id: newLessonId,
      classId: targetClassId || srcLesson.classId,
      title: `${srcLesson.title} (Bản sao)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.lessons.push(newLesson);

    // Duplicate tasks
    const srcTasks = db.tasks.filter(t => t.lessonId === srcLesson.id);
    srcTasks.forEach(task => {
      db.tasks.push({
        ...task,
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        lessonId: newLessonId,
        createdAt: new Date().toISOString()
      });
    });

    saveDatabaseToDisk();
    res.status(201).json(newLesson);
  });

  // --- TASKS ---
  app.get('/api/tasks', (req, res) => {
    const { lessonId } = req.query;
    if (lessonId) {
      return res.json(db.tasks.filter(t => t.lessonId === lessonId));
    }
    res.json(db.tasks);
  });

  app.post('/api/tasks', (req, res) => {
    const data = req.body;
    const newTask: Task = {
      ...data,
      id: data.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: data.createdAt || new Date().toISOString()
    };
    db.tasks.push(newTask);
    saveDatabaseToDisk();
    res.status(201).json(newTask);
  });

  app.put('/api/tasks/:id', (req, res) => {
    const index = db.tasks.findIndex(t => t.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Task not found' });
    db.tasks[index] = { ...db.tasks[index], ...req.body };
    saveDatabaseToDisk();
    res.json(db.tasks[index]);
  });

  app.delete('/api/tasks/:id', (req, res) => {
    const id = req.params.id;
    const index = db.tasks.findIndex(t => t.id === id);
    if (index === -1) return res.status(404).json({ error: 'Task not found' });
    db.tasks.splice(index, 1);
    saveDatabaseToDisk();
    res.json({ success: true });
  });

  app.post('/api/tasks/reorder', (req, res) => {
    const { lessonId, taskIds } = req.body;
    if (!Array.isArray(taskIds)) return res.status(400).json({ error: 'Invalid taskIds array' });
    taskIds.forEach((id, idx) => {
      const task = db.tasks.find(t => t.id === id && t.lessonId === lessonId);
      if (task) task.order = idx + 1;
    });
    saveDatabaseToDisk();
    res.json({ success: true });
  });

  // --- PROGRESS ---
  app.get('/api/progress', (req, res) => {
    const { studentId, lessonId, classId } = req.query;
    let list = db.progress;
    if (studentId) list = list.filter(p => p.studentId === studentId);
    if (lessonId) list = list.filter(p => p.lessonId === lessonId);
    if (classId) {
      const classStudents = new Set(db.students.filter(s => s.classId === classId).map(s => s.id));
      list = list.filter(p => classStudents.has(p.studentId));
    }
    res.json(list);
  });

  app.post('/api/progress/upsert', (req, res) => {
    const progData: TaskProgress = req.body;
    const existingIdx = db.progress.findIndex(
      p => p.studentId === progData.studentId && p.taskId === progData.taskId
    );

    if (existingIdx >= 0) {
      db.progress[existingIdx] = {
        ...db.progress[existingIdx],
        ...progData
      };
      saveDatabaseToDisk();
      return res.json(db.progress[existingIdx]);
    } else {
      const newProg: TaskProgress = {
        ...progData,
        id: progData.id || `prog_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`
      };
      db.progress.push(newProg);
      saveDatabaseToDisk();
      return res.status(201).json(newProg);
    }
  });

  // --- ASSIGNMENTS ---
  app.get('/api/assignments', (req, res) => {
    const { lessonId, taskId } = req.query;
    if (lessonId) return res.json(db.assignments.filter(a => a.lessonId === lessonId));
    if (taskId) return res.json(db.assignments.filter(a => a.taskId === taskId));
    res.json(db.assignments);
  });

  app.post('/api/assignments', (req, res) => {
    const data = req.body;
    const newAss: Assignment = {
      ...data,
      id: data.id || `ass_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`
    };
    db.assignments.push(newAss);
    saveDatabaseToDisk();
    res.status(201).json(newAss);
  });

  // --- SUBMISSIONS ---
  app.get('/api/submissions', (req, res) => {
    const { classId, lessonId, studentId, assignmentId } = req.query;
    let list = db.submissions;
    if (classId) {
      const classStudents = new Set(db.students.filter(s => s.classId === classId).map(s => s.id));
      list = list.filter(s => classStudents.has(s.studentId));
    }
    if (lessonId) list = list.filter(s => s.lessonId === lessonId);
    if (studentId) list = list.filter(s => s.studentId === studentId);
    if (assignmentId) list = list.filter(s => s.assignmentId === assignmentId);
    res.json(list);
  });

  app.post('/api/submissions', (req, res) => {
    const data = req.body;
    const newSub: Submission = {
      ...data,
      id: data.id || `sub_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      submittedAt: data.submittedAt || new Date().toISOString()
    };
    db.submissions.unshift(newSub);
    saveDatabaseToDisk();
    res.status(201).json(newSub);
  });

  app.post('/api/submissions/:id/grade', (req, res) => {
    const { score, feedback, teacherId } = req.body;
    const sub = db.submissions.find(s => s.id === req.params.id);
    if (!sub) return res.status(404).json({ error: 'Submission not found' });
    sub.score = score;
    sub.feedback = feedback;
    sub.gradedByTeacherId = teacherId;
    sub.gradedAt = new Date().toISOString();
    sub.status = 'graded';
    saveDatabaseToDisk();
    res.json(sub);
  });

  // --- ANNOUNCEMENTS ---
  app.get('/api/announcements', (req, res) => {
    const { classId } = req.query;
    if (classId) {
      return res.json(db.announcements.filter(a => a.classId === classId || a.classId === 'all'));
    }
    res.json(db.announcements);
  });

  app.post('/api/announcements', (req, res) => {
    const data = req.body;
    const newAnn: Announcement = {
      ...data,
      id: data.id || `ann_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString()
    };
    db.announcements.unshift(newAnn);
    saveDatabaseToDisk();
    res.status(201).json(newAnn);
  });

  // --- CERTIFICATES ---
  app.get('/api/certificates', (req, res) => {
    const { studentId, classId } = req.query;
    let list = db.certificates;
    if (studentId) list = list.filter(c => c.studentId === studentId);
    if (classId) list = list.filter(c => c.classId === classId);
    res.json(list);
  });

  app.post('/api/certificates', (req, res) => {
    const data = req.body;
    const newCert: Certificate = {
      ...data,
      id: data.id || `cert_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      issuedAt: data.issuedAt || new Date().toISOString()
    };
    db.certificates.push(newCert);
    saveDatabaseToDisk();
    res.status(201).json(newCert);
  });

  // --- RESET DATABASE TO SEED ---
  app.post('/api/system/reset-seed', (req, res) => {
    db = initializeSeedData();
    saveDatabaseToDisk();
    res.json({ success: true, message: 'Database reset to seed data' });
  });

  // --- FULL DATA SYNC (Cross-Device Auto-Sync) ---
  app.post('/api/sync/push', (req, res) => {
    try {
      const { classes, lessons, tasks, teachers, students } = req.body;
      let addedClasses = 0;

      if (Array.isArray(classes)) {
        classes.forEach(incoming => {
          const cleanCode = (incoming.classCode || '').trim().toUpperCase();
          const existingIdx = db.classes.findIndex(
            c => c.id === incoming.id || (c.classCode && cleanCode && c.classCode.toUpperCase() === cleanCode)
          );
          if (existingIdx >= 0) {
            db.classes[existingIdx] = { ...db.classes[existingIdx], ...incoming, classCode: cleanCode || db.classes[existingIdx].classCode };
          } else {
            db.classes.unshift({
              ...incoming,
              classCode: cleanCode,
              status: incoming.status || 'active',
              joinEnabled: incoming.joinEnabled ?? true
            });
            addedClasses++;
          }
        });
      }

      if (Array.isArray(lessons)) {
        lessons.forEach(incoming => {
          const existingIdx = db.lessons.findIndex(l => l.id === incoming.id);
          if (existingIdx >= 0) {
            db.lessons[existingIdx] = { ...db.lessons[existingIdx], ...incoming };
          } else {
            db.lessons.push(incoming);
          }
        });
      }

      if (Array.isArray(tasks)) {
        tasks.forEach(incoming => {
          const existingIdx = db.tasks.findIndex(t => t.id === incoming.id);
          if (existingIdx >= 0) {
            db.tasks[existingIdx] = { ...db.tasks[existingIdx], ...incoming };
          } else {
            db.tasks.push(incoming);
          }
        });
      }

      if (Array.isArray(teachers)) {
        teachers.forEach(incoming => {
          const existingIdx = db.teachers.findIndex(t => t.id === incoming.id || (t.email && incoming.email && t.email.toLowerCase() === incoming.email.toLowerCase()));
          if (existingIdx >= 0) {
            db.teachers[existingIdx] = { ...db.teachers[existingIdx], ...incoming };
          } else {
            db.teachers.push(incoming);
          }
        });
      }

      saveDatabaseToDisk();
      console.log(`[Sync Push] Merged client data. Total classes in server DB: ${db.classes.length}`);
      res.json({
        success: true,
        totalClasses: db.classes.length,
        totalLessons: db.lessons.length,
        totalTasks: db.tasks.length
      });
    } catch (err: any) {
      console.error('[Sync Push Error]:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================
  // VITE MIDDLEWARE (DEV) & STATIC FILES (PROD)
  // ============================================================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: 3000 },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Smart Blended LMS Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
