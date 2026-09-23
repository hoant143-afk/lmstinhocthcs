import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import {
  UserPlus,
  LogIn,
  KeyRound,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  GraduationCap,
  HelpCircle
} from 'lucide-react';

import { CreateAccountForm } from '../../components/auth/CreateAccountForm';

export const TeacherLoginPage: React.FC = () => {
  const { teacher, loginTeacher, loginTeacherWithGoogle } = useAuth();
  const { toastSuccess, toastError, toastInfo } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if tab is requested via state or query param
  const initialTab = (location.state as any)?.tab === 'register' || new URLSearchParams(location.search).get('tab') === 'register'
    ? 'register'
    : 'login';
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Login Form State - Starts empty or with prefillEmail
  const [loginEmail, setLoginEmail] = useState((location.state as any)?.prefillEmail || '');
  const [loginPassword, setLoginPassword] = useState('');

  const redirectPath = (location.state as { from?: { pathname: string } })?.from?.pathname || '/admin/dashboard';

  useEffect(() => {
    // If already logged in, redirect to dashboard
    if (teacher) {
      navigate(redirectPath, { replace: true });
    }
  }, [teacher]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) {
      toastError('Vui lòng nhập email đăng nhập');
      return;
    }

    setIsLoading(true);
    try {
      const logged = await loginTeacher({
        email: loginEmail.trim(),
        password: loginPassword.trim()
      });
      toastSuccess(`Chào mừng Thầy/Cô ${logged.fullName} đã đăng nhập thành công!`);
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      toastError(err?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    toastInfo('Để đặt lại mật khẩu, vui lòng liên hệ Ban Quản trị nhà trường hoặc sử dụng email công vụ đã đăng ký.');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4 sm:px-6">
      <div className="w-full max-w-xl space-y-6">
        {/* Header Title & Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/70 border border-blue-200 text-blue-800 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Khu Vực Quản Trị Giáo Viên Sư Phạm</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Cổng Đăng Nhập & Tạo Tài Khoản
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Hệ thống Quản lý Học tập Kết hợp (Blended LMS): Thiết kế bài giảng, chống tua video và nghiệm thu trực tiếp.
          </p>
        </div>

        {/* Main Auth Card */}
        <Card className="p-6 sm:p-8 shadow-sm border-slate-200 bg-white">
          {/* Tab Switcher: Đăng Nhập vs Tạo Tài Khoản */}
          <div className="grid grid-cols-2 p-1 bg-slate-100/80 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng Nhập</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Tạo Tài Khoản Mới</span>
            </button>
          </div>

          {/* TAB 1: FORM ĐĂNG NHẬP */}
          {activeTab === 'login' && (
            <div className="space-y-5">
              {/* Google Sign-in */}
              <div className="space-y-2">
                <GoogleSignInButton
                  role="teacher"
                  buttonText="Đăng nhập bằng Google"
                  onSuccess={async (credential) => {
                    try {
                      const logged = await loginTeacherWithGoogle(credential);
                      toastSuccess(`Chào mừng Thầy/Cô ${logged.fullName} đã đăng nhập thành công bằng Google!`);
                      navigate(redirectPath, { replace: true });
                    } catch (err: any) {
                      toastError(err?.message || 'Đăng nhập bằng Google thất bại.');
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

              {/* Local Email/Password Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Email / Tên Đăng Nhập <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      placeholder="giaovien@school.edu.vn"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Mật Khẩu <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      placeholder="Nhập mật khẩu..."
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs text-slate-500 hover:text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <HelpCircle className="w-3 h-3" />
                      <span>Quên mật khẩu?</span>
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  isLoading={isLoading}
                  leftIcon={<LogIn className="w-4 h-4" />}
                  className="w-full text-sm font-bold shadow-sm mt-2"
                >
                  Đăng Nhập Vào Bảng Điều Khiển
                </Button>

                {/* Toggle to register button */}
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Chưa có tài khoản? Nhấn vào đây để Tạo tài khoản Giáo viên mới</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: FORM TẠO TÀI KHOẢN MỚI (ĐĂNG KÝ) */}
          {activeTab === 'register' && (
            <div className="pt-2">
              <CreateAccountForm
                initialRole="teacher"
                onGoToLogin={(role, prefillEmail) => {
                  if (role === 'teacher') {
                    setActiveTab('login');
                    if (prefillEmail) {
                      setLoginEmail(prefillEmail);
                    }
                  } else {
                    navigate('/app/login', { state: { prefillEmail } });
                  }
                }}
              />
            </div>
          )}
        </Card>

        {/* Back Link to Student Portal */}
        <div className="text-center pt-2">
          <Link
            to="/app"
            className="text-xs font-medium text-slate-500 hover:text-slate-800 inline-flex items-center gap-1.5 transition"
          >
            <GraduationCap className="w-4 h-4 text-emerald-600" />
            <span>Bạn là Học sinh? Chuyển sang Cổng Bàn Học Sinh & Nhập Mã Lớp</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
