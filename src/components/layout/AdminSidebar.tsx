import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  FileCheck,
  TrendingUp,
  Bell,
  Settings,
  PlusCircle,
  Sparkles,
  LogOut,
  UserCheck
} from 'lucide-react';

interface AdminSidebarProps {
  onItemClick?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ onItemClick }) => {
  const { teacher, logoutTeacher } = useAuth();
  const { toastInfo } = useToast();
  const navigate = useNavigate();

  const navItems = [
    {
      to: '/admin/dashboard',
      label: 'Bảng điều khiển',
      icon: <LayoutDashboard className="w-4 h-4" />
    },
    {
      to: '/admin/classes',
      label: 'Quản lý Lớp học',
      icon: <GraduationCap className="w-4 h-4" />
    },
    {
      to: '/admin/library',
      label: 'Ngân hàng Bài học',
      icon: <BookOpen className="w-4 h-4" />
    },
    {
      to: '/admin/submissions',
      label: 'Chấm bài nộp',
      icon: <FileCheck className="w-4 h-4" />
    },
    {
      to: '/admin/progress',
      label: 'Tiến độ & Nghiệm thu',
      icon: <TrendingUp className="w-4 h-4" />
    },
    {
      to: '/admin/announcements',
      label: 'Bản tin Thông báo',
      icon: <Bell className="w-4 h-4" />
    },
    {
      to: '/admin/settings',
      label: 'Cài đặt & Dữ liệu',
      icon: <Settings className="w-4 h-4" />
    }
  ];

  const handleLogout = async () => {
    await logoutTeacher();
    toastInfo('Đã đăng xuất tài khoản Giáo viên.');
    navigate('/admin/login');
  };

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 border-r border-slate-800 shrink-0">
      <div className="p-4 space-y-6 overflow-y-auto">
        {/* Model Badge */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-900/40 to-indigo-900/30 border border-blue-800/50">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>MÔ HÌNH BLENDED 30/70</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            30% Tự học & Video chống tua + 70% Thực hành & Nghiệm thu tại lớp.
          </p>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Dành cho Giáo viên
          </div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onItemClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Teacher Account & Logout */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 space-y-2">
        {teacher && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={teacher.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={teacher.fullName}
                className="w-8 h-8 rounded-full object-cover border border-slate-600 shrink-0"
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-200 truncate">{teacher.fullName}</div>
                <div className="text-[10px] text-slate-400 truncate">{teacher.email}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Đăng xuất"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex items-center justify-between px-2 text-[11px] text-slate-400">
          <span>Phiên bản v1.0.0 Pro</span>
          <span className="text-blue-400 font-medium">Blended LMS</span>
        </div>
      </div>
    </aside>
  );
};
