import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { authService } from '../../services/authService';
import { Teacher } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input, Select } from '../../components/common/Input';
import {
  UserCheck,
  UserPlus,
  LogIn,
  KeyRound,
  Mail,
  School,
  BookOpen,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  Layers,
  GraduationCap
} from 'lucide-react';

export const TeacherLoginPage: React.FC = () => {
  const { teacher, loginTeacher, registerTeacher, loginAsTeacherQuick } = useAuth();
  const { toastSuccess, toastError, toastInfo } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [demoTeachers, setDemoTeachers] = useState<Teacher[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Form State
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regSchoolName, setRegSchoolName] = useState('Trường THPT Chuyên Quốc Gia');
  const [regSubject, setRegSubject] = useState('Tin học');
  const [regTitle, setRegTitle] = useState('Giáo viên bộ môn');

  const redirectPath = (location.state as { from?: { pathname: string } })?.from?.pathname || '/admin/dashboard';

  useEffect(() => {
    // If already logged in, redirect to dashboard
    if (teacher) {
      navigate(redirectPath, { replace: true });
    }
    loadDemoTeachers();
  }, [teacher]);

  const loadDemoTeachers = async () => {
    try {
      const list = await authService.getAllTeachers();
      setDemoTeachers(list);
      if (list.length > 0 && !loginEmail) {
        setLoginEmail(list[0].email);
        setLoginPassword(list[0].password || 'password123');
      }
    } catch (err) {
      console.error(err);
    }
  };

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName.trim()) {
      toastError('Vui lòng nhập Họ và tên giáo viên');
      return;
    }
    if (!regEmail.trim()) {
      toastError('Vui lòng nhập Email công tác');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      toastError('Mật khẩu cần có tối thiểu 6 ký tự');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      toastError('Mật khẩu xác nhận không khớp');
      return;
    }

    setIsLoading(true);
    try {
      const newTeacher = await registerTeacher({
        fullName: regFullName.trim(),
        email: regEmail.trim(),
        password: regPassword.trim(),
        schoolName: regSchoolName.trim(),
        subject: regSubject.trim(),
        title: regTitle.trim()
      });

      toastSuccess(`Chúc mừng Thầy/Cô ${newTeacher.fullName} đã tạo tài khoản thành công! Hệ thống đã tạo sẵn 1 lớp học mẫu cho Thầy/Cô.`);
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      toastError(err?.message || 'Lỗi khi tạo tài khoản. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (t: Teacher) => {
    setIsLoading(true);
    try {
      await loginAsTeacherQuick(t.id);
      toastSuccess(`Đã đăng nhập với tư cách: ${t.fullName}`);
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      toastError(err?.message || 'Lỗi đăng nhập nhanh');
    } finally {
      setIsLoading(false);
    }
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
            Hệ thống Quản lý Học tập Kết hợp (Blended LMS 30/70): Thiết kế bài giảng, chống tua video và nghiệm thu trực tiếp.
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

              {/* Quick 1-Click Demo Accounts */}
              {demoTeachers.length > 0 && (
                <div className="pt-4 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                    <span>Tài khoản giáo viên mẫu có sẵn:</span>
                    <span className="text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">1 chạm</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {demoTeachers.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleQuickLogin(t)}
                        className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition text-left flex items-center gap-2.5 cursor-pointer group"
                      >
                        <img
                          src={t.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt={t.fullName}
                          className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700 truncate">
                            {t.fullName}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">{t.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>
          )}

          {/* TAB 2: FORM TẠO TÀI KHOẢN MỚI (ĐĂNG KÝ) */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <Input
                label="Họ Và Tên Giáo Viên"
                required
                placeholder="VD: Thầy Nguyễn Văn Hoàng hoặc Cô Trần Thị Mai Lan"
                value={regFullName}
                onChange={e => setRegFullName(e.target.value)}
              />

              <Input
                label="Email Công Tác / Trường Học"
                type="email"
                required
                placeholder="VD: hoang.nv@thpt.edu.vn"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Mật Khẩu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Xác Nhận Mật Khẩu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regConfirmPassword}
                    onChange={e => setRegConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Trường Học / Đơn Vị"
                  placeholder="VD: THPT Chuyên Quốc Gia"
                  value={regSchoolName}
                  onChange={e => setRegSchoolName(e.target.value)}
                />

                <Input
                  label="Môn Học Giảng Dạy"
                  placeholder="VD: Tin học, STEM, Toán học..."
                  value={regSubject}
                  onChange={e => setRegSubject(e.target.value)}
                />
              </div>

              <Input
                label="Chức Danh / Học Vị"
                placeholder="VD: Giáo viên bộ môn, Thạc sĩ, Tổ trưởng..."
                value={regTitle}
                onChange={e => setRegTitle(e.target.value)}
              />

              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Hệ thống sẽ <strong>tự động khởi tạo 1 lớp học thực hành mẫu</strong> với video chống tua và bài tập trắc nghiệm để Thầy/Cô trải nghiệm ngay lập tức.
                </span>
              </div>

              <Button
                type="submit"
                size="lg"
                isLoading={isLoading}
                leftIcon={<UserPlus className="w-4 h-4" />}
                className="w-full text-sm font-bold shadow-sm mt-2"
              >
                Tạo Tài Khoản & Đăng Nhập
              </Button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Đã có tài khoản? Nhấn để Đăng nhập ngay</span>
                </button>
              </div>
            </form>
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
