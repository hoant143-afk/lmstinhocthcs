import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Award,
  PlusCircle,
  TrendingUp,
  Sparkles,
  School
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface StudentSidebarProps {
  onItemClick?: () => void;
}

export const StudentSidebar: React.FC<StudentSidebarProps> = ({ onItemClick }) => {
  const { currentClass, studentSession } = useAuth();

  const navItems = [
    {
      id: 'student-desk',
      to: '/app',
      label: 'Bàn học của tôi',
      icon: <LayoutDashboard className="w-4 h-4" />
    },
    {
      id: 'student-current-class',
      to: currentClass ? `/app/class/${currentClass.id}` : '/app',
      label: currentClass ? `Lớp: ${currentClass.name.split('-')[0]}` : 'Lớp học hiện tại',
      icon: <BookOpen className="w-4 h-4" />
    },
    {
      id: 'student-progress',
      to: '/app/progress',
      label: 'Tiến độ học tập',
      icon: <TrendingUp className="w-4 h-4" />
    },
    {
      id: 'student-join-class',
      to: '/app/join',
      label: 'Tham gia Lớp khác',
      icon: <PlusCircle className="w-4 h-4" />
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 border-r border-slate-800 shrink-0">
      <div className="p-4 space-y-6 overflow-y-auto">
        {/* Student Active Session Card */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-800/40">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <School className="w-3.5 h-3.5" />
            <span>HỌC SINH THAM GIA</span>
          </div>
          <div className="mt-2">
            <h4 className="text-sm font-bold text-white truncate">
              {studentSession?.fullName || 'Học sinh'}
            </h4>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {currentClass ? currentClass.name : 'Chưa chọn lớp'}
            </p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Khu vực Học tập
          </div>
          {navItems.map(item => (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.to === '/app'}
              onClick={onItemClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white font-semibold shadow-xs'
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

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-400">
        <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Tự học hiệu quả</span>
        </div>
        <p className="text-[11px] text-slate-400">
          Hoàn thành 30% online để mở khóa các hoạt động thực hành trên lớp.
        </p>
      </div>
    </aside>
  );
};
