import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { Layout } from './components/layout/Layout';

// Landing & Auth
import { LandingPage } from './pages/landing/LandingPage';
import { JoinClassPage } from './pages/auth/JoinClassPage';
import { TeacherLoginPage } from './pages/auth/TeacherLoginPage';
import { TeacherProtectedRoute } from './components/auth/TeacherProtectedRoute';
import { StudentProtectedRoute } from './components/auth/StudentProtectedRoute';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminClassesPage } from './pages/admin/AdminClassesPage';
import { AdminClassDetailPage } from './pages/admin/AdminClassDetailPage';
import { AdminLessonEditorPage } from './pages/admin/AdminLessonEditorPage';
import { AdminSubmissionsPage } from './pages/admin/AdminSubmissionsPage';
import { AdminProgressPage } from './pages/admin/AdminProgressPage';
import { AdminLibraryPage } from './pages/admin/AdminLibraryPage';
import { AdminAnnouncementsPage } from './pages/admin/AdminAnnouncementsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';

// Student Pages
import { StudentDashboardPage } from './pages/student/StudentDashboardPage';
import { StudentClassPage } from './pages/student/StudentClassPage';
import { StudentLessonPage } from './pages/student/StudentLessonPage';
import { StudentProgressPage } from './pages/student/StudentProgressPage';
import { StudentCertificatePage } from './pages/student/StudentCertificatePage';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              {/* Landing & Public Flow */}
              <Route index element={<LandingPage />} />

              {/* Student App Flow */}
              <Route path="app/join" element={<JoinClassPage />} />
              <Route path="app" element={<StudentProtectedRoute />}>
                <Route index element={<StudentDashboardPage />} />
                <Route path="class/:classId" element={<StudentClassPage />} />
                <Route path="lesson/:lessonId" element={<StudentLessonPage />} />
                <Route path="progress" element={<StudentProgressPage />} />
                <Route path="certificate/:classId" element={<StudentCertificatePage />} />
              </Route>

              {/* Teacher Admin Flow */}
              <Route path="admin/login" element={<TeacherLoginPage />} />
              <Route path="admin" element={<TeacherProtectedRoute />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="classes" element={<AdminClassesPage />} />
                <Route path="classes/:classId" element={<AdminClassDetailPage />} />
                <Route path="lessons/:lessonId/edit" element={<AdminLessonEditorPage />} />
                <Route path="submissions" element={<AdminSubmissionsPage />} />
                <Route path="progress" element={<AdminProgressPage />} />
                <Route path="library" element={<AdminLibraryPage />} />
                <Route path="announcements" element={<AdminAnnouncementsPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
