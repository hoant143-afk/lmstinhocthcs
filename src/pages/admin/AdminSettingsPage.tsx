import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { resetAllDataToSeed } from '../../repositories/LocalStorageRepository';
import { Card, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  Settings,
  Database,
  RefreshCw,
  UserCheck,
  ShieldAlert,
  Sparkles,
  Layers,
  Save
} from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const { teacher, updateTeacherProfile } = useAuth();
  const { toastSuccess, toastInfo } = useToast();

  const [fullName, setFullName] = useState(teacher?.fullName || 'Thầy Nguyễn Văn Hoàng');
  const [email, setEmail] = useState(teacher?.email || 'hoang.nv@school.edu.vn');
  const [schoolName, setSchoolName] = useState(teacher?.schoolName || 'THPT Chuyên Lê Hồng Phong');
  const [subject, setSubject] = useState(teacher?.subject || 'Tin học');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateTeacherProfile({
      fullName,
      email,
      schoolName,
      subject
    });
    toastSuccess('Đã cập nhật thông tin Giáo viên!');
  };

  const handleResetDatabase = () => {
    resetAllDataToSeed();
    toastSuccess('Đã khôi phục toàn bộ cơ sở dữ liệu mẫu ban đầu!');
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cài Đặt Hệ Thống & Hồ Sơ</h1>
        <p className="text-sm text-slate-500 mt-1">
          Quản lý thông tin tài khoản Giáo viên và kiểm soát cơ sở dữ liệu lưu trữ
        </p>
      </div>

      {/* Teacher Profile */}
      <Card className="p-6">
        <CardHeader
          title="Thông Tin Giáo Viên Phụ Trách"
          subtitle="Hiển thị trên tiêu đề chứng chỉ và lớp học của học sinh"
        />

        <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Họ và Tên Giáo Viên <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Email Liên Hệ <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Tên Trường Học / Đơn Vị
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={e => setSchoolName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Bộ Môn Giảng Dạy
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button type="submit" leftIcon={<Save className="w-4 h-4" />}>
              Lưu Thông Tin
            </Button>
          </div>
        </form>
      </Card>

      {/* Database & Architecture Layer */}
      <Card className="p-6 border-rose-100 bg-rose-50/20">
        <CardHeader
          title="Quản Trị Cơ Sở Dữ Liệu Demo"
          subtitle="Đặt lại toàn bộ trạng thái bài học, dữ liệu tiến độ và chứng chỉ mẫu ban đầu"
        />

        <div className="space-y-4 max-w-xl text-sm text-slate-600 mt-2">
          <p className="text-xs text-slate-500 leading-relaxed">
            Hệ thống đang hoạt động với lớp dữ liệu <strong>LocalStorage Repository Pattern</strong>. Bạn có thể khôi phục các lớp mẫu, bài nộp và học sinh bất kỳ lúc nào để thực hiện kiểm thử trơn tru.
          </p>

          <Button
            variant="danger"
            onClick={() => setIsResetConfirmOpen(true)}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Đặt Lại Dữ Liệu Demo Gốc
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetDatabase}
        title="Khôi Phục Dữ Liệu Mẫu"
        message="Hành động này sẽ xóa các lớp hoặc bài học tùy biến mà bạn đã tạo và nạp lại toàn bộ bộ bài học THCS/THPT mẫu 30/70 ban đầu."
        confirmText="Xác Nhận Khôi Phục"
        isDestructive
      />
    </div>
  );
};
