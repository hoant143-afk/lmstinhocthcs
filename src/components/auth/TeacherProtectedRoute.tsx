import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface TeacherProtectedRouteProps {
  children?: React.ReactNode;
}

export const TeacherProtectedRoute: React.FC<TeacherProtectedRouteProps> = ({ children }) => {
  const { teacher, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Đang xác thực thông tin Giáo viên...</p>
      </div>
    );
  }

  if (!teacher) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
