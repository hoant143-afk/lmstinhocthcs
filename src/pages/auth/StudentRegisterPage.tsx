import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/common/Card';
import { GraduationCap, ShieldCheck } from 'lucide-react';
import { CreateAccountForm } from '../../components/auth/CreateAccountForm';

export const StudentRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticatedStudent } = useAuth();

  // If already logged in, redirect to student dashboard
  React.useEffect(() => {
    if (isAuthenticatedStudent) {
      navigate('/app', { replace: true });
    }
  }, [isAuthenticatedStudent, navigate]);

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/60">
      <div className="max-w-xl w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/70 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <GraduationCap className="w-4 h-4 text-emerald-600" />
            <span>Đăng Ký Tài Khoản SMART BLENDED LMS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Tạo Tài Khoản Mới
          </h1>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Hệ thống học tập kết hợp hiện đại dành cho Giáo viên và Học sinh.
          </p>
        </div>

        {/* Card Form */}
        <Card className="p-6 sm:p-8 shadow-md border-slate-200/80 bg-white">
          <CreateAccountForm
            initialRole="student"
            onGoToLogin={(role, prefillEmail) => {
              if (role === 'student') {
                navigate('/app/login', { state: { prefillEmail } });
              } else {
                navigate('/admin/login', { state: { prefillEmail } });
              }
            }}
          />
        </Card>

        {/* Footer Link */}
        <div className="text-center">
          <Link
            to="/admin/login"
            className="text-xs font-medium text-slate-500 hover:text-slate-800 inline-flex items-center gap-1.5 transition"
          >
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Bạn là Thầy/Cô giáo? Đến Cổng Quản Trị Giáo Viên</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
