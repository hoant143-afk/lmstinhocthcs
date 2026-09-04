import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { resetAllDataToSeed } from '../../repositories/LocalStorageRepository';
import {
  Layers,
  UserCheck,
  GraduationCap,
  Sparkles,
  RefreshCw,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { Button } from '../common/Button';
import { Link, useNavigate } from 'react-router-dom';

interface NavbarProps {
  onToggleSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, isMobileSidebarOpen }) => {
  const { role, setRole, teacher, isAuthenticatedTeacher, studentSession, currentClass, logoutTeacher, logoutStudent } = useAuth();
  const { toastSuccess, toastInfo } = useToast();
  const navigate = useNavigate();
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleResetData = () => {
    if (window.confirm('Bạn có chắc muốn đặt lại toàn bộ dữ liệu mẫu ban đầu không?')) {
      resetAllDataToSeed();
      toastSuccess('Đã đặt lại dữ liệu demo thành công!');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  const handleSwitchToTeacher = () => {
    setRole('ROLE_TEACHER');
    setIsRoleDropdownOpen(false);
    if (!teacher) {
      toastInfo('Vui lòng đăng nhập tài khoản Giáo viên');
      navigate('/admin/login');
    } else {
      toastInfo('Đã chuyển sang vai trò Giáo viên');
      navigate('/admin/dashboard');
    }
  };

  const handleSwitchToStudent = () => {
    setRole('ROLE_STUDENT');
    setIsRoleDropdownOpen(false);
    toastInfo('Đã chuyển sang vai trò Học sinh');
    navigate('/app');
  };

  const handleTeacherLogout = async () => {
    await logoutTeacher();
    setIsUserMenuOpen(false);
    toastInfo('Đã đăng xuất tài khoản Giáo viên.');
    navigate('/admin/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Brand & Mobile Toggle */}
          <div className="flex items-center gap-3.5">
            {onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                aria-label="Toggle navigation menu"
              >
                {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}

            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-all">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900">
                    SMART BLENDED <span className="text-blue-600">LMS</span>
                  </span>
                  <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/70">
                    30% Online – 70% Trực tiếp
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden md:block">
                  Hệ thống Học tập Kết hợp Đổi mới Sư phạm
                </p>
              </div>
            </Link>
          </div>

          {/* Right Action Widgets */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* Fast Role Switcher for seamless testing */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-semibold transition cursor-pointer ${
                  role === 'ROLE_TEACHER'
                    ? 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100/70'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/70'
                }`}
              >
                {role === 'ROLE_TEACHER' ? (
                  <>
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    <span className="hidden xs:inline">Vai trò:</span> <span>Giáo viên</span>
                  </>
                ) : (
                  <>
                    <GraduationCap className="w-4 h-4 text-emerald-600" />
                    <span className="hidden xs:inline">Vai trò:</span> <span>Học sinh</span>
                  </>
                )}
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {/* Dropdown */}
              {isRoleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Chuyển đổi vai trò trải nghiệm
                    </p>
                  </div>
                  <div className="space-y-1 pt-1">
                    <button
                      onClick={handleSwitchToTeacher}
                      className={`w-full text-left p-2.5 rounded-xl text-sm flex items-center justify-between transition cursor-pointer ${
                        role === 'ROLE_TEACHER' ? 'bg-blue-50 text-blue-800 font-bold' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <UserCheck className="w-4 h-4 text-blue-600" />
                        <div>
                          <div>Giáo viên (Admin)</div>
                          <div className="text-[11px] text-slate-500 font-normal">Quản lý lớp, tạo bài, chấm điểm</div>
                        </div>
                      </div>
                      {role === 'ROLE_TEACHER' && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                    </button>

                    <button
                      onClick={handleSwitchToStudent}
                      className={`w-full text-left p-2.5 rounded-xl text-sm flex items-center justify-between transition cursor-pointer ${
                        role === 'ROLE_STUDENT' ? 'bg-emerald-50 text-emerald-800 font-bold' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <GraduationCap className="w-4 h-4 text-emerald-600" />
                        <div>
                          <div>Học sinh (Student)</div>
                          <div className="text-[11px] text-slate-500 font-normal">Học online, nộp bài, nhận chứng chỉ</div>
                        </div>
                      </div>
                      {role === 'ROLE_STUDENT' && <span className="w-2 h-2 rounded-full bg-emerald-600" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Reset Demo Button */}
            <button
              onClick={handleResetData}
              title="Đặt lại dữ liệu mẫu"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer hidden sm:flex items-center gap-1.5 text-xs font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Demo</span>
            </button>

            {/* User Profile display */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
              {role === 'ROLE_TEACHER' ? (
                teacher ? (
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-300 overflow-hidden flex items-center justify-center shrink-0">
                      <img
                        src={teacher.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={teacher.fullName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="hidden lg:block text-left">
                      <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[140px]">
                        {teacher.fullName}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                        {teacher.schoolName || 'Giáo viên bộ môn'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleTeacherLogout}
                      title="Đăng xuất tài khoản Giáo viên"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/admin/login"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold transition shadow-2xs"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Đăng nhập</span>
                  </Link>
                )
              ) : (
                studentSession ? (
                  <div className="flex items-center gap-2">
                    <Link
                      to="/app/profile"
                      className="flex items-center gap-2 group p-1 rounded-xl hover:bg-slate-100 transition"
                      title="Xem hồ sơ học sinh"
                    >
                      <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0 ring-2 ring-emerald-100">
                        {studentSession.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="hidden lg:block text-left">
                        <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[140px] group-hover:text-emerald-700 transition">
                          {studentSession.fullName}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                          {studentSession.email || (currentClass?.name || 'Học sinh')}
                        </div>
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={async () => {
                        await logoutStudent();
                        toastInfo('Đã đăng xuất tài khoản học sinh.');
                        navigate('/app/login');
                      }}
                      title="Đăng xuất tài khoản học sinh"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link
                      to="/app/login"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold transition shadow-2xs"
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Đăng nhập</span>
                    </Link>
                    <Link
                      to="/app/register"
                      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-bold transition shadow-2xs"
                    >
                      <span>Đăng ký</span>
                    </Link>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
