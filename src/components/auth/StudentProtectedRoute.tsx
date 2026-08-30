import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface StudentProtectedRouteProps {
  children?: React.ReactNode;
}

export const StudentProtectedRoute: React.FC<StudentProtectedRouteProps> = ({ children }) => {
  const { studentSession, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Đang kiểm tra phiên học sinh...</p>
      </div>
    );
  }

  if (!studentSession) {
    return <Navigate to="/app/join" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
