import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2
} from 'lucide-react';

export const StudentLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginStudent, loginStudentWithGoogle, isAuthenticatedStudent } = useAuth();
  const { toastSuccess, toastError } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect to student dashboard
  React.useEffect(() => {
    if (isAuthenticatedStudent) {
      navigate('/app', { replace: true });
    }
  }, [isAuthenticatedStudent, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Vui lòng nhập địa chỉ Email học sinh.');
      return;
    }
    if (!password) {
      setErrorMsg('Vui lòng nhập mật khẩu.');
      return;
    }

    setIsSubmitting(true);
    try {
      await loginStudent({ email: cleanEmail, password });
      toastSuccess('Đăng nhập thành công! Chào mừng bạn đến với Smart Blended LMS.');
      const from = (location.state as any)?.from?.pathname || '/app';
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('[StudentLogin] Error:', err);
      const msg = err.message || 'Email hoặc mật khẩu không chính xác.';
      setErrorMsg(msg);
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/60">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 mb-2">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Học sinh Đăng nhập
          </h1>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Đăng nhập tài khoản cá nhân để tiếp tục học tập và làm bài tập.
          </p>
        </div>

        {/* Card Form */}
        <Card className="p-6 sm:p-8 shadow-md border-slate-200/80 bg-white">
          <div className="space-y-5">
            {/* Google Sign-in: [ Tiếp tục với Google ] */}
            <div className="space-y-2">
              <GoogleSignInButton
                role="student"
                buttonText="Tiếp tục với Google"
                onSuccess={async (credential) => {
                  try {
                    await loginStudentWithGoogle(credential);
                    toastSuccess('Đăng nhập tài khoản Google thành công!');
                    const from = (location.state as any)?.from?.pathname || '/app';
                    navigate(from, { replace: true });
                  } catch (err: any) {
                    toastError(err?.message || 'Đăng nhập Google thất bại.');
                  }
                }}
              />
            </div>

            {/* Divider "hoặc" */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
                hoặc
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Địa chỉ Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vidu@hocsinh.edu.vn"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">
                  Mật khẩu
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang đăng nhập...</span>
                  </>
                ) : (
                  <>
                    <span>Đăng nhập</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Switch to Register */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-600">
              Chưa có tài khoản học sinh?{' '}
              <Link
                to="/app/register"
                className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                Đăng ký ngay
              </Link>
            </p>
          </div>
          </div>
        </Card>

        {/* Footer teacher link */}
        <div className="text-center">
          <Link
            to="/admin/login"
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Bạn là Giáo viên? Đăng nhập quản lý tại đây &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};
