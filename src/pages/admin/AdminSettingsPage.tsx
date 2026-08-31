import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { resetAllDataToSeed } from '../../repositories/LocalStorageRepository';
import { apiClient } from '../../services/apiClient';
import { Card, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  Settings,
  Database,
  RefreshCw,
  UserCheck,
  ShieldAlert,
  Sparkles,
  Save,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  Code2,
  Zap,
  Server
} from 'lucide-react';

const GOOGLE_APPS_SCRIPT_SAMPLE_CODE = `/**
 * ============================================================================
 * SMART BLENDED LMS - GOOGLE APPS SCRIPT WEB APP BACKEND (API ROUTER)
 * REST-like API kết nối Web React ↔ Google Sheet Database (/exec)
 * Hỗ trợ đa người dùng trực tuyến qua Internet: Giáo viên & Học sinh tham gia lớp
 * ============================================================================
 * HƯỚNG DẪN DEPLOY TRÊN GOOGLE APPS SCRIPT:
 * 1. Mở Google Sheet → Tiện ích mở rộng → Apps Script.
 * 2. Dán toàn bộ mã này vào Code.gs và nhấn Save (Ctrl+S).
 * 3. Nhấn "Triển khai" (Deploy) → "Triển khai mới" (New deployment).
 * 4. Loại triển khai: "Ứng dụng web" (Web app).
 * 5. CẤU HÌNH BẮT BUỘC ĐỂ HỌC SINH KHÔNG CẦN ĐĂNG NHẬP GOOGLE:
 *    - Thực thi dưới dạng (Execute as): Tôi (Me / your email).
 *    - Ai có quyền truy cập (Who has access): Bất kỳ ai (Anyone).
 * 6. Nhấn "Triển khai", cấp quyền truy cập và copy URL dạng:
 *    https://script.google.com/macros/s/.../exec (KẾT THÚC BẰNG /exec, KHÔNG DÙNG /dev)
 * 7. Dán URL vào ô cấu hình bên dưới và nhấn "Lưu Cấu Hình".
 * ============================================================================
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "system.health";
  
  if (action === "system.health" || action === "ping") {
    var isDbConnected = false;
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      isDbConnected = Boolean(ss && ss.getSheetByName("CLASSES"));
    } catch (err) {
      isDbConnected = false;
    }
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: {
        service: "SMART BLENDED LMS API",
        status: "ok",
        databaseConnected: isDbConnected,
        databaseVersion: "1.0.0",
        timestamp: new Date().toISOString()
      }
    })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "classes.getByCode" && e.parameter.classCode) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName("CLASSES");
      if (!sheet) throw new Error("DATABASE_ERROR: Sheet CLASSES chưa được tạo.");
      var rows = getSheetData(sheet);
      var code = String(e.parameter.classCode).trim().toUpperCase();
      var found = rows.find(function(r) { return String(r.classCode || "").trim().toUpperCase() === code; });
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: found || null,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        errorCode: "DATABASE_ERROR",
        error: err.message
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    data: {
      service: "SMART BLENDED LMS API",
      status: "ok",
      databaseConnected: true,
      timestamp: new Date().toISOString()
    }
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    var action = payload.action;
    var data = payload.data || {};
    var result = handleApiAction(action, data);
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    var rawErr = error.message || error.toString();
    var errCode = "API_ERROR";
    if (rawErr.indexOf("CLASS_NOT_FOUND") !== -1) errCode = "CLASS_NOT_FOUND";
    else if (rawErr.indexOf("CLASS_JOIN_DISABLED") !== -1) errCode = "CLASS_JOIN_DISABLED";
    else if (rawErr.indexOf("DATABASE_ERROR") !== -1) errCode = "DATABASE_ERROR";
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      errorCode: errCode,
      error: rawErr,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function handleApiAction(action, data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Public actions (No session required)
  var PUBLIC_ACTIONS = [
    "system.health",
    "system.ping",
    "students.join",
    "classes.getByCode",
    "system.setupDatabase",
    "system.seedDemoData",
    "system.validateDatabase"
  ];
  
  if (action === "system.health" || action === "system.ping") {
    var isDbConnected = Boolean(ss && ss.getSheetByName("CLASSES"));
    return {
      service: "SMART BLENDED LMS API",
      status: "ok",
      databaseConnected: isDbConnected,
      databaseVersion: "1.0.0",
      time: new Date().toISOString()
    };
  }
  if (action === "system.setupDatabase") {
    return setupDatabase();
  }
  if (action === "system.seedDemoData") {
    return seedDemoData();
  }

  // --- PUBLIC STUDENT JOIN CLASS API ---
  if (action === "students.join") {
    var rawName = String(data.fullName || "").trim();
    var cleanCode = String(data.classCode || "").trim().toUpperCase();

    if (!rawName) throw new Error("Vui lòng nhập đầy đủ Họ và tên học sinh.");
    if (!cleanCode) throw new Error("Vui lòng nhập Mã lớp học (Class Code).");

    var classSheet = ss.getSheetByName("CLASSES");
    if (!classSheet) throw new Error("DATABASE_ERROR: Sheet CLASSES chưa được khởi tạo. Hãy nhấn Khởi tạo CSDL trước.");
    var classes = getSheetData(classSheet);

    function normalizeCode(val) {
      return String(val || "").trim().toUpperCase();
    }

    var targetClass = classes.find(function(c) {
      if (normalizeCode(c.classCode) === normalizeCode(cleanCode)) return true;
      var cNorm = String(c.classCode || "").toUpperCase().replace(/[\\s\\-_]/g, "");
      var tNorm = cleanCode.replace(/[\\s\\-_]/g, "");
      return cNorm === tNorm;
    });

    if (!targetClass) {
      throw new Error("CLASS_NOT_FOUND: Không tìm thấy mã lớp.");
    }

    if (targetClass.status === "inactive" || targetClass.joinEnabled === false) {
      throw new Error("CLASS_JOIN_DISABLED: Lớp hiện không cho phép tham gia.");
    }

    // Check or create student
    var studentSheet = ss.getSheetByName("STUDENTS");
    if (!studentSheet) throw new Error("DATABASE_ERROR: Sheet STUDENTS chưa được khởi tạo.");
    var students = getSheetData(studentSheet);

    var existingStudent = students.find(function(s) {
      return String(s.fullName || "").trim().toLowerCase() === rawName.toLowerCase() && s.classId === targetClass.id;
    });

    var student = existingStudent;
    if (!student) {
      student = {
        id: "std_" + new Date().getTime() + "_" + Math.floor(Math.random() * 1000),
        classId: targetClass.id,
        fullName: rawName,
        status: "active",
        joinedAt: new Date().toISOString()
      };
      appendRowData(studentSheet, student);
    }

    // Record enrollment in ENROLLMENTS sheet if present
    var enrollSheet = ss.getSheetByName("ENROLLMENTS");
    var enrollment = null;
    if (enrollSheet) {
      enrollment = {
        id: "enr_" + new Date().getTime() + "_" + Math.floor(Math.random() * 1000),
        studentId: student.id,
        classId: targetClass.id,
        status: "active",
        enrolledAt: new Date().toISOString()
      };
      appendRowData(enrollSheet, enrollment);
    }

    // Generate unique student session token
    var token = "sblms_std_" + Utilities.getUuid();
    var sessionSheet = ss.getSheetByName("SESSIONS");
    if (sessionSheet) {
      appendRowData(sessionSheet, {
        id: "sess_" + new Date().getTime(),
        studentId: student.id,
        classId: targetClass.id,
        token: token,
        actorType: "student",
        createdAt: new Date().toISOString()
      });
    }

    var session = {
      studentId: student.id,
      classId: targetClass.id,
      fullName: student.fullName,
      joinedAt: student.joinedAt,
      token: token
    };

    return {
      student: student,
      class: targetClass,
      enrollment: enrollment,
      session: session,
      token: token
    };
  }

  // --- ENTITY CRUD ROUTES ---
  var parts = action.split(".");
  var entity = parts[0];
  var op = parts[1];
  
  var sheetMap = {
    teachers: "USERS",
    classes: "CLASSES",
    students: "STUDENTS",
    enrollments: "ENROLLMENTS",
    sessions: "SESSIONS",
    lessons: "LESSONS",
    tasks: "TASKS",
    progress: "PROGRESS",
    assignments: "ASSIGNMENTS",
    submissions: "SUBMISSIONS",
    announcements: "ANNOUNCEMENTS",
    certificates: "CERTIFICATES"
  };
  
  var sheetName = sheetMap[entity] || entity.toUpperCase();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error("Không tìm thấy bảng: " + sheetName + ". Vui lòng khởi tạo CSDL.");
  }
  
  var rows = getSheetData(sheet);
  
  if (op === "getAll" || op === "getByClass" || op === "getByTeacher" || op === "getByStudent" || op === "getByLesson") {
    if (entity === "classes" && data.teacherId) return rows.filter(function(r) { return r.teacherId === data.teacherId; });
    if (entity === "students" && data.classId) return rows.filter(function(r) { return r.classId === data.classId; });
    if (entity === "lessons" && data.classId) return rows.filter(function(r) { return r.classId === data.classId; });
    if (entity === "tasks" && data.lessonId) return rows.filter(function(r) { return r.lessonId === data.lessonId; });
    if (entity === "progress" && data.studentId && data.lessonId) return rows.filter(function(r) { return r.studentId === data.studentId && r.lessonId === data.lessonId; });
    if (entity === "progress" && data.classId) return rows.filter(function(r) { return r.classId === data.classId; });
    if (entity === "submissions" && data.assignmentId) return rows.filter(function(r) { return r.assignmentId === data.assignmentId; });
    if (entity === "submissions" && data.classId) return rows.filter(function(r) { return r.classId === data.classId; });
    if (entity === "certificates" && data.studentId) return rows.filter(function(r) { return r.studentId === data.studentId; });
    return rows;
  }
  
  if (op === "getById") {
    var item = rows.find(function(r) { return r.id === data.id; });
    return item || null;
  }
  
  if (op === "getByCode") {
    var queryCode = String(data.classCode || "").trim().toUpperCase();
    var itemByCode = rows.find(function(r) {
      return String(r.classCode || "").trim().toUpperCase() === queryCode;
    });
    return itemByCode || null;
  }
  
  if (op === "create") {
    var newId = data.id || (entity.slice(0, 3) + "_" + new Date().getTime());
    data.id = newId;
    if (entity === "classes") {
      data.classCode = String(data.classCode || ("BLN-" + Math.floor(1000 + Math.random() * 9000))).trim().toUpperCase();
      data.status = data.status || "active";
      data.joinEnabled = data.joinEnabled !== undefined ? data.joinEnabled : true;
    }
    data.createdAt = data.createdAt || new Date().toISOString();
    data.updatedAt = new Date().toISOString();
    appendRowData(sheet, data);
    return data;
  }

  if (op === "update") {
    return updateRowData(sheet, data.id, data);
  }

  if (op === "delete") {
    return deleteRowData(sheet, data.id);
  }
  
  if (op === "upsert") {
    return upsertRowData(sheet, data, "studentId", "taskId");
  }
  
  return { success: true };
}

function getSheetData(sheet) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol < 1) return [];
  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0];
  var results = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var val = row[j];
      try {
        if (typeof val === "string" && (val.startsWith("{") || val.startsWith("["))) {
          val = JSON.parse(val);
        }
      } catch (e) {}
      obj[headers[j]] = val;
    }
    results.push(obj);
  }
  return results;
}

function appendRowData(sheet, data) {
  var headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
  var row = [];
  for (var i = 0; i < headers.length; i++) {
    var key = headers[i];
    var val = data[key] !== undefined ? data[key] : "";
    if (typeof val === "object") val = JSON.stringify(val);
    row.push(val);
  }
  sheet.appendRow(row);
}

function updateRowData(sheet, id, data) {
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var idIdx = headers.indexOf("id");
  if (idIdx === -1) return data;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idIdx]) === String(id)) {
      var updateRow = [];
      for (var j = 0; j < headers.length; j++) {
        var key = headers[j];
        var val = data[key] !== undefined ? data[key] : values[i][j];
        if (typeof val === "object") val = JSON.stringify(val);
        updateRow.push(val);
      }
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([updateRow]);
      return data;
    }
  }
  return data;
}

function deleteRowData(sheet, id) {
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var idIdx = headers.indexOf("id");
  if (idIdx === -1) return true;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idIdx]) === String(id)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return true;
}

function upsertRowData(sheet, data, key1, key2) {
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var k1Idx = headers.indexOf(key1);
  var k2Idx = headers.indexOf(key2);
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][k1Idx] == data[key1] && values[i][k2Idx] == data[key2]) {
      var updateRow = [];
      for (var j = 0; j < headers.length; j++) {
        var key = headers[j];
        var val = data[key] !== undefined ? data[key] : values[i][j];
        if (typeof val === "object") val = JSON.stringify(val);
        updateRow.push(val);
      }
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([updateRow]);
      return data;
    }
  }
  appendRowData(sheet, data);
  return data;
}

function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var schemas = {
    USERS: ["id", "fullName", "email", "password", "schoolName", "subject", "title", "avatarUrl", "createdAt"],
    CLASSES: ["id", "teacherId", "name", "subject", "grade", "schoolYear", "description", "classCode", "status", "joinEnabled", "certificateEnabled", "scoringEnabled", "onlineRatio", "offlineRatio", "createdAt", "updatedAt"],
    STUDENTS: ["id", "classId", "fullName", "joinedAt", "status", "avatarUrl", "email"],
    ENROLLMENTS: ["id", "studentId", "classId", "status", "enrolledAt"],
    SESSIONS: ["id", "studentId", "classId", "token", "createdAt"],
    LESSONS: ["id", "teacherId", "classId", "title", "description", "objectives", "status", "order", "sequentialLock", "scoringEnabled", "createdAt", "updatedAt"],
    TASKS: ["id", "lessonId", "classId", "phase", "type", "title", "description", "order", "required", "points", "estimatedMinutes", "settings", "createdAt", "updatedAt"],
    PROGRESS: ["id", "studentId", "lessonId", "taskId", "classId", "status", "score", "timeSpentSeconds", "lastPosition", "attempts", "completedAt", "updatedAt"],
    ASSIGNMENTS: ["id", "teacherId", "classId", "lessonId", "taskId", "title", "description", "rubric", "maxScore", "dueAt", "createdAt"],
    SUBMISSIONS: ["id", "assignmentId", "studentId", "classId", "lessonId", "taskId", "status", "content", "linkUrl", "score", "feedback", "gradedBy", "submittedAt", "gradedAt"],
    ANNOUNCEMENTS: ["id", "teacherId", "classId", "title", "content", "createdAt"],
    CERTIFICATES: ["id", "studentId", "classId", "certificateCode", "studentName", "className", "teacherName", "schoolName", "completionDate", "averageScore", "onlineProgress", "offlineProgress", "issuedAt"]
  };

  for (var name in schemas) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(schemas[name]);
      sheet.getRange(1, 1, 1, schemas[name].length).setFontWeight("bold").setBackground("#f3f4f6");
      sheet.setFrozenRows(1);
    }
  }

  return { ok: true, message: "Đã khởi tạo thành công 12 bảng dữ liệu trên Google Sheet!" };
}

function seedDemoData() {
  setupDatabase();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var classSheet = ss.getSheetByName("CLASSES");
  var userSheet = ss.getSheetByName("USERS");

  if (userSheet && userSheet.getLastRow() <= 1) {
    appendRowData(userSheet, {
      id: "teacher_demo_1",
      fullName: "Thầy Nguyễn Văn Hoàng",
      email: "hoang.nv@school.edu.vn",
      schoolName: "THPT Chuyên Lê Hồng Phong",
      subject: "Tin học & STEM",
      title: "Tổ trưởng Chuyên môn",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      createdAt: new Date().toISOString()
    });
  }

  if (classSheet && classSheet.getLastRow() <= 1) {
    appendRowData(classSheet, {
      id: "class_demo_1",
      teacherId: "teacher_demo_1",
      name: "Lớp 10A1 - Tin học & Chuyển đổi số",
      subject: "Tin học 10",
      grade: "Lớp 10",
      schoolYear: "2025 - 2026",
      description: "Mô hình Blended Learning: 30% Tự học Online chống tua + 70% Thực hành sáng tạo tại lớp.",
      classCode: "TIN10-A1",
      status: "active",
      joinEnabled: true,
      certificateEnabled: true,
      scoringEnabled: true,
      onlineRatio: 30,
      offlineRatio: 70,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  return { ok: true, message: "Đã nạp dữ liệu mẫu ban đầu (Lớp 10A1, Mã: TIN10-A1)!" };
}`;

export const AdminSettingsPage: React.FC = () => {
  const { teacher, updateTeacherProfile, refreshUserData } = useAuth();
  const { toastSuccess, toastWarning, toastInfo } = useToast();

  const [fullName, setFullName] = useState(teacher?.fullName || 'Thầy Nguyễn Văn Hoàng');
  const [email, setEmail] = useState(teacher?.email || 'hoang.nv@school.edu.vn');
  const [schoolName, setSchoolName] = useState(teacher?.schoolName || 'THPT Chuyên Lê Hồng Phong');
  const [subject, setSubject] = useState(teacher?.subject || 'Tin học');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Apps Script & Google Sheet API State
  const [apiUrl, setApiUrl] = useState<string>(apiClient.getApiUrl());
  const [provider, setProvider] = useState<'appsScript' | 'localStorage'>(apiClient.getDataProvider());
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isCodeCopied, setIsCodeCopied] = useState<boolean>(false);
  const [showCode, setShowCode] = useState<boolean>(false);

  useEffect(() => {
    if (teacher) {
      setFullName(teacher.fullName || '');
      setEmail(teacher.email || '');
      setSchoolName(teacher.schoolName || '');
      setSubject(teacher.subject || '');
    }
  }, [teacher]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateTeacherProfile({
      fullName,
      email,
      schoolName,
      subject
    });
    toastSuccess('Đã cập nhật thông tin Giáo viên!');
  };

  const handleSaveApiConfig = async () => {
    apiClient.setApiUrl(apiUrl);
    apiClient.setDataProvider(provider);
    toastSuccess('Đã lưu cấu hình kết nối Google Sheet Web App!');
    await refreshUserData();
  };

  const handleTestConnection = async () => {
    if (!apiUrl || !apiUrl.trim()) {
      toastWarning('Vui lòng nhập URL Google Apps Script Web App /exec trước khi kiểm tra.');
      return;
    }
    setIsTesting(true);
    setTestResult(null);

    try {
      // Temporarily set to test
      apiClient.setApiUrl(apiUrl);
      const res = await apiClient.ping();
      if (res.ok) {
        setTestResult({ ok: true, message: `Kết nối thành công! ${res.message}` });
        toastSuccess('Kết nối tới Google Sheet Apps Script API thành công!');
      } else {
        setTestResult({ ok: false, message: `Thất bại: ${res.message}` });
        toastWarning(`Không thể kết nối: ${res.message}`);
      }
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message || 'Lỗi mạng' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSetupSheet = async () => {
    if (!apiUrl) {
      toastWarning('Vui lòng cấu hình URL Web App trước.');
      return;
    }
    setIsTesting(true);
    try {
      const res = await apiClient.setupDatabase();
      if (res.success) {
        toastSuccess('Đã khởi tạo đầy đủ các bảng dữ liệu trên Google Sheet!');
      } else {
        toastWarning(res.error || 'Khởi tạo bảng thất bại');
      }
    } catch (e: any) {
      toastWarning(e.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSeedSheet = async () => {
    if (!apiUrl) {
      toastWarning('Vui lòng cấu hình URL Web App trước.');
      return;
    }
    setIsTesting(true);
    try {
      const res = await apiClient.seedDemoData();
      if (res.success) {
        toastSuccess('Đã nạp thành công bộ dữ liệu bài học mẫu vào Google Sheet!');
      } else {
        toastWarning(res.error || 'Nạp dữ liệu thất bại');
      }
    } catch (e: any) {
      toastWarning(e.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_SAMPLE_CODE);
    setIsCodeCopied(true);
    toastInfo('Đã sao chép mã nguồn Google Apps Script vào Clipboard!');
    setTimeout(() => setIsCodeCopied(false), 3000);
  };

  const handleResetDatabase = () => {
    resetAllDataToSeed();
    toastSuccess('Đã khôi phục toàn bộ cơ sở dữ liệu mẫu ban đầu!');
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  return (
    <div className="space-y-8 max-w-4xl pb-16">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cài Đặt Hệ Thống & Cơ Sở Dữ Liệu</h1>
        <p className="text-sm text-slate-500 mt-1">
          Quản lý thông tin Giáo viên và thiết lập đồng bộ Google Sheet Cloud Backend qua Apps Script Web App (/exec)
        </p>
      </div>

      {/* Cloud Google Sheets Database Integration */}
      <Card className="p-6 border-blue-200 bg-gradient-to-br from-white to-blue-50/30">
        <CardHeader
          title="Kết Nối Google Sheet Cloud Database (Công Đoạn 3)"
          subtitle="Đồng bộ 2 chiều giữa Web React và Google Sheet thông qua Apps Script Web App API"
        />

        <div className="space-y-6 mt-4">
          {/* Active Data Mode Indicator */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${provider === 'appsScript' && apiClient.isAppsScriptConfigured() ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'}`}>
                {provider === 'appsScript' && apiClient.isAppsScriptConfigured() ? <Cloud className="w-6 h-6" /> : <Database className="w-6 h-6" />}
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500">Chế độ Lưu trữ Dữ liệu:</div>
                <div className="text-base font-black text-slate-900 flex items-center gap-2">
                  {provider === 'appsScript' && apiClient.isAppsScriptConfigured()
                    ? 'Google Sheet Cloud Database (Trực Tuyến)'
                    : 'LocalStorage Offline Repository (Demo Nhanh)'}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    provider === 'appsScript' && apiClient.isAppsScriptConfigured()
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {provider === 'appsScript' && apiClient.isAppsScriptConfigured() ? 'Đang kích hoạt Cloud' : 'Đang chạy Local'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setProvider('localStorage')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  provider === 'localStorage'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Local Demo
              </button>
              <button
                type="button"
                onClick={() => setProvider('appsScript')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  provider === 'appsScript'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Google Sheet API
              </button>
            </div>
          </div>

          {/* Web App URL Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase text-slate-700">
              Google Apps Script Web App URL (/exec) <span className="text-blue-600">*</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                value={apiUrl}
                onChange={e => setApiUrl(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  isLoading={isTesting}
                  leftIcon={<Zap className="w-4 h-4 text-amber-500" />}
                >
                  Kiểm Tra Kết Nối
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveApiConfig}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Lưu Cấu Hình
                </Button>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Đường dẫn Web App nhận được sau khi bấm <strong>Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone)</strong> trong Google Sheets.
            </p>
          </div>

          {/* Test connection alert result */}
          {testResult && (
            <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 border ${
              testResult.ok ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}>
              {testResult.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Cloud Operations & Sheet Initialization */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSetupSheet}
              leftIcon={<Server className="w-3.5 h-3.5 text-blue-600" />}
            >
              Khởi Tạo Cấu Trúc Bảng Sheet
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSeedSheet}
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-amber-600" />}
            >
              Đồng Bộ Dữ Liệu Mẫu Vào Sheet
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowCode(!showCode)}
              leftIcon={<Code2 className="w-3.5 h-3.5 text-slate-600" />}
            >
              {showCode ? 'Ẩn mã nguồn Apps Script' : 'Xem mã nguồn Apps Script (Code.gs)'}
            </Button>
          </div>

          {/* Google Apps Script Code Drawer */}
          {showCode && (
            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Mã nguồn Apps Script Web App Router (Code.gs):</span>
                <button
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                >
                  {isCodeCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCodeCopied ? 'Đã sao chép!' : 'Sao chép toàn bộ mã'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto max-h-72 border border-slate-800 leading-relaxed">
                {GOOGLE_APPS_SCRIPT_SAMPLE_CODE}
              </pre>
            </div>
          )}
        </div>
      </Card>

      {/* Teacher Profile */}
      <Card className="p-6">
        <CardHeader
          title="Thông Tin Giáo Viên Phụ Trách"
          subtitle="Hiển thị trên tiêu đề chứng chỉ và lớp học của học sinh"
        />

        <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Họ và Tên Giáo Viên <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Email Liên Hệ <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Tên Trường Học / Đơn Vị
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={e => setSchoolName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Bộ Môn Giảng Dạy
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button type="submit" leftIcon={<Save className="w-4 h-4" />}>
              Lưu Thông Tin Hồ Sơ
            </Button>
          </div>
        </form>
      </Card>

      {/* Local Demo Data Reset */}
      <Card className="p-6 border-slate-200">
        <CardHeader
          title="Khôi Phục Dữ Liệu Demo Cục Bộ"
          subtitle="Đặt lại toàn bộ trạng thái bài học, tiến độ và lớp học mẫu về trạng thái gốc"
        />

        <div className="space-y-4 max-w-xl text-sm text-slate-600 mt-2">
          <p className="text-xs text-slate-500 leading-relaxed">
            Bạn có thể khôi phục dữ liệu mẫu ban đầu bất kỳ lúc nào để thực hiện kiểm thử quy trình học sinh và giáo viên.
          </p>

          <Button
            variant="danger"
            onClick={() => setIsResetConfirmOpen(true)}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Đặt Lại Dữ Liệu Demo Gốc
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetDatabase}
        title="Khôi Phục Dữ Liệu Mẫu"
        message="Hành động này sẽ xóa các lớp hoặc bài học tùy biến mà bạn đã tạo trong bộ nhớ cục bộ và nạp lại toàn bộ bộ bài học mẫu ban đầu."
        confirmText="Xác Nhận Khôi Phục"
        isDestructive
      />
    </div>
  );
};
