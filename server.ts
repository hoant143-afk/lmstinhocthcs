import express from 'express';
import path from 'path';
import fs from 'fs';
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
}

const DB_FILE_PATH = path.join(process.cwd(), 'data_store.json');

function initializeSeedData(): DatabaseSchema {
  return {
    teachers: JSON.parse(JSON.stringify(SEED_TEACHERS)),
    classes: JSON.parse(JSON.stringify(SEED_CLASSES)),
    students: JSON.parse(JSON.stringify(SEED_STUDENTS)),
    lessons: JSON.parse(JSON.stringify(SEED_LESSONS)),
    tasks: JSON.parse(JSON.stringify(SEED_TASKS)),
    assignments: JSON.parse(JSON.stringify(SEED_ASSIGNMENTS)),
    submissions: JSON.parse(JSON.stringify(SEED_SUBMISSIONS)),
    progress: JSON.parse(JSON.stringify(SEED_PROGRESS)),
    announcements: JSON.parse(JSON.stringify(SEED_ANNOUNCEMENTS)),
    certificates: JSON.parse(JSON.stringify(SEED_CERTIFICATES)),
    currentTeacherId: SEED_TEACHER.id,
    appsScriptUrl: process.env.VITE_APPS_SCRIPT_API_URL || process.env.VITE_APPS_SCRIPT_URL || '',
    dataProvider: 'appsScript'
  };
}

let db: DatabaseSchema = initializeSeedData();

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
          lessons: parsed.lessons || SEED_LESSONS,
          tasks: parsed.tasks || SEED_TASKS,
          assignments: parsed.assignments || SEED_ASSIGNMENTS,
          submissions: parsed.submissions || SEED_SUBMISSIONS,
          progress: parsed.progress || SEED_PROGRESS,
          announcements: parsed.announcements || SEED_ANNOUNCEMENTS,
          certificates: parsed.certificates || SEED_CERTIFICATES,
          currentTeacherId: parsed.currentTeacherId || SEED_TEACHER.id,
          appsScriptUrl: parsed.appsScriptUrl || process.env.VITE_APPS_SCRIPT_API_URL || process.env.VITE_APPS_SCRIPT_URL || '',
          dataProvider: parsed.dataProvider || 'appsScript'
        };
        console.log(`[Database] Loaded persistent data: ${db.classes.length} classes, ${db.students.length} students, ${db.lessons.length} lessons`);
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

  // --- CONFIG (Cross-Device Apps Script URL Sync) ---
  app.get('/api/config', (req, res) => {
    res.json({
      appsScriptUrl: db.appsScriptUrl || process.env.VITE_APPS_SCRIPT_API_URL || process.env.VITE_APPS_SCRIPT_URL || '',
      dataProvider: db.dataProvider || 'appsScript'
    });
  });

  app.post('/api/config', (req, res) => {
    const { appsScriptUrl, dataProvider } = req.body;
    if (appsScriptUrl !== undefined) {
      db.appsScriptUrl = (appsScriptUrl || '').trim();
    }
    if (dataProvider) {
      db.dataProvider = dataProvider;
    }
    saveDatabaseToDisk();
    console.log(`[Config Updated] Apps Script URL: ${db.appsScriptUrl}, Provider: ${db.dataProvider}`);
    res.json({ success: true, appsScriptUrl: db.appsScriptUrl, dataProvider: db.dataProvider });
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

  // --- STUDENTS & JOIN CLASS ---
  app.get('/api/students', (req, res) => {
    const { classId } = req.query;
    if (classId) {
      return res.json(db.students.filter(s => s.classId === classId));
    }
    res.json(db.students);
  });

  app.get('/api/students/:id', (req, res) => {
    const s = db.students.find(item => item.id === req.params.id);
    if (!s) return res.status(404).json({ error: 'Student not found' });
    res.json(s);
  });

  app.post('/api/students', (req, res) => {
    const data = req.body;
    const newStudent: Student = {
      ...data,
      id: data.id || `student_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      joinedAt: data.joinedAt || new Date().toISOString(),
      status: data.status || 'active'
    };
    db.students.push(newStudent);
    saveDatabaseToDisk();
    res.status(201).json(newStudent);
  });

  app.post('/api/students/join', (req, res) => {
    const { fullName, classCode } = req.body;
    const cleanName = (fullName || '').trim();
    const cleanCode = (classCode || '').trim().toUpperCase();

    if (!cleanName) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập đầy đủ Họ và tên của bạn.' });
    }
    if (!cleanCode) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập Mã lớp học (Class Code).' });
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
        error: `Không tìm thấy lớp học với mã "${cleanCode}". Vui lòng liên hệ Thầy/Cô để nhận đúng mã lớp.`
      });
    }

    if (targetClass.status === 'inactive' || targetClass.joinEnabled === false) {
      return res.status(403).json({
        success: false,
        errorCode: 'CLASS_JOIN_DISABLED',
        error: `Lớp học "${targetClass.name}" hiện đang tạm khóa tham gia mới.`
      });
    }

    // Check if student already registered in this class
    let student = db.students.find(
      s => s.classId === targetClass.id && s.fullName.toLowerCase().trim() === cleanName.toLowerCase().trim()
    );

    if (!student) {
      student = {
        id: `student_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        classId: targetClass.id,
        fullName: cleanName,
        status: 'active',
        joinedAt: new Date().toISOString()
      };
      db.students.push(student);
      saveDatabaseToDisk();
      console.log(`[Student Joined] ${cleanName} joined class ${targetClass.name} (${targetClass.classCode})`);
    }

    const token = `sblms_std_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const session = {
      studentId: student.id,
      classId: targetClass.id,
      fullName: student.fullName,
      joinedAt: student.joinedAt,
      token
    };

    res.json({
      success: true,
      student,
      class: targetClass,
      session,
      token
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
