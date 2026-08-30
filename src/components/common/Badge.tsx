import React from 'react';
import { Sparkles, Users, Lock, CheckCircle, Clock, FileText, Video, HelpCircle, Code, Award, Link2 } from 'lucide-react';
import { TaskPhase, TaskProgressStatus, LessonStatus, TaskType } from '../../types';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'slate' | 'indigo';
  size?: 'sm' | 'md';
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'blue',
  size = 'md',
  className = '',
  icon
}) => {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs'
  };

  const variantStyles = {
    blue: 'bg-blue-50 text-blue-700 border border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border border-rose-200',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200',
    slate: 'bg-slate-100 text-slate-700 border border-slate-200',
    indigo: 'bg-indigo-50 text-indigo-700 border border-indigo-200'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-lg whitespace-nowrap ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
};

export const TaskTypeBadge: React.FC<{ type: TaskType; size?: 'sm' | 'md'; className?: string }> = ({
  type,
  size = 'sm',
  className = ''
}) => {
  switch (type) {
    case 'video':
      return (
        <Badge variant="blue" size={size} icon={<Video className="w-3 h-3" />} className={className}>
          Video chống tua
        </Badge>
      );
    case 'document':
      return (
        <Badge variant="indigo" size={size} icon={<FileText className="w-3 h-3" />} className={className}>
          Tài liệu đọc
        </Badge>
      );
    case 'quiz':
    case 'question':
      return (
        <Badge variant="purple" size={size} icon={<HelpCircle className="w-3 h-3" />} className={className}>
          Mini Quiz
        </Badge>
      );
    case 'assignment':
    case 'submission':
      return (
        <Badge variant="amber" size={size} icon={<Code className="w-3 h-3" />} className={className}>
          Thực hành / Nộp link
        </Badge>
      );
    case 'offline_activity':
    case 'teacher_confirmation':
      return (
        <Badge variant="emerald" size={size} icon={<Award className="w-3 h-3" />} className={className}>
          Nghiệm thu tại lớp
        </Badge>
      );
    default:
      return (
        <Badge variant="slate" size={size} className={className}>
          Nhiệm vụ
        </Badge>
      );
  }
};

export const PhaseBadge: React.FC<{ phase: TaskPhase; className?: string }> = ({ phase, className = '' }) => {
  if (phase === 'online') {
    return (
      <Badge variant="blue" icon={<Sparkles className="w-3 h-3 text-blue-600" />} className={className}>
        30% Online (Tự học)
      </Badge>
    );
  }
  return (
    <Badge variant="amber" icon={<Users className="w-3 h-3 text-amber-600" />} className={className}>
      70% Trực tiếp (Phòng Lab)
    </Badge>
  );
};

export const TaskStatusBadge: React.FC<{ status: TaskProgressStatus; className?: string }> = ({ status, className = '' }) => {
  switch (status) {
    case 'completed':
      return (
        <Badge variant="emerald" icon={<CheckCircle className="w-3 h-3 text-emerald-600" />} className={className}>
          Đã hoàn thành
        </Badge>
      );
    case 'in_progress':
      return (
        <Badge variant="amber" icon={<Clock className="w-3 h-3 text-amber-600" />} className={className}>
          Đang thực hiện
        </Badge>
      );
    case 'locked':
      return (
        <Badge variant="slate" icon={<Lock className="w-3 h-3 text-slate-500" />} className={className}>
          Chưa mở khóa
        </Badge>
      );
    default:
      return (
        <Badge variant="slate" className={className}>
          Chưa bắt đầu
        </Badge>
      );
  }
};

export const LessonStatusBadge: React.FC<{ status: LessonStatus; className?: string }> = ({ status, className = '' }) => {
  switch (status) {
    case 'active':
      return <Badge variant="emerald">Đang diễn ra</Badge>;
    case 'published':
      return <Badge variant="blue">Đã xuất bản</Badge>;
    case 'ended':
      return <Badge variant="slate">Đã kết thúc</Badge>;
    case 'draft':
    default:
      return <Badge variant="amber">Bản nháp</Badge>;
  }
};
