import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { classService } from '../../services/classService';
import { ClassEntity } from '../../types';
import { Card, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import {
  GraduationCap,
  PlusCircle,
  Copy,
  Check,
  RefreshCw,
  Edit2,
  Trash2,
  Users,
  BookOpen,
  ArrowRight,
  Sparkles,
  Award
} from 'lucide-react';

export const AdminClassesPage: React.FC = () => {
  const { teacher } = useAuth();
  const { toastSuccess, toastError } = useToast();
  const navigate = useNavigate();

  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingClass, setEditingClass] = useState<ClassEntity | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    subject: 'Tin học',
    grade: 'Lớp 10',
    schoolYear: '2025 - 2026',
    description: '',
    customCode: '',
    certificateEnabled: true,
    scoringEnabled: true
  });

  // Delete Confirm State
  const [classToDelete, setClassToDelete] = useState<ClassEntity | null>(null);

  useEffect(() => {
    loadClasses();
  }, [teacher]);

  const loadClasses = async () => {
    if (!teacher) return;
    setIsLoading(true);
    try {
      const list = await classService.getTeacherClasses(teacher.id);
      setClasses(list);
    } catch (err) {
      console.error(err);
      toastError('Không thể tải danh sách lớp học');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingClass(null);
    setFormData({
      name: '',
      subject: 'Tin học',
      grade: 'Lớp 10',
      schoolYear: '2025 - 2026',
      description: 'Mô hình Blended Learning: 30% Tự học Online + 70% Thực hành trên lớp.',
      customCode: '',
      certificateEnabled: true,
      scoringEnabled: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cls: ClassEntity) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name,
      subject: cls.subject,
      grade: cls.grade,
      schoolYear: cls.schoolYear,
      description: cls.description,
      customCode: cls.classCode,
      certificateEnabled: cls.certificateEnabled,
      scoringEnabled: cls.scoringEnabled
    });
    setIsModalOpen(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher) return;

    if (!formData.name.trim()) {
      toastError('Vui lòng nhập tên lớp học');
      return;
    }

    try {
      if (editingClass) {
        await classService.updateClass(editingClass.id, {
          name: formData.name,
          subject: formData.subject,
          grade: formData.grade,
          schoolYear: formData.schoolYear,
          description: formData.description,
          certificateEnabled: formData.certificateEnabled,
          scoringEnabled: formData.scoringEnabled
        });
        toastSuccess('Đã cập nhật thông tin lớp học!');
      } else {
        await classService.createClass(teacher.id, formData);
        toastSuccess('Đã tạo lớp học mới thành công!');
      }
      setIsModalOpen(false);
      loadClasses();
    } catch (err: any) {
      toastError(err.message || 'Lỗi khi lưu lớp học');
    }
  };

  const handleRegenerateCode = async (classId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const newCode = await classService.regenerateCode(classId);
      if (newCode) {
        toastSuccess(`Mã lớp mới: ${newCode}`);
        loadClasses();
      }
    } catch (err) {
      toastError('Không thể tạo lại mã lớp');
    }
  };

  const handleCopyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toastSuccess(`Đã sao chép mã lớp: ${code}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDeleteConfirm = async () => {
    if (!classToDelete) return;
    try {
      await classService.deleteClass(classToDelete.id);
      toastSuccess(`Đã xóa lớp ${classToDelete.name}`);
      setClassToDelete(null);
      loadClasses();
    } catch (err) {
      toastError('Không thể xóa lớp học');
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Quản Lý Lớp Học</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tạo và phân bổ các lớp học áp dụng mô hình Blended Learning (30% Online - 70% Trực tiếp)
          </p>
        </div>

        <Button
          id="btn-open-create-class"
          onClick={handleOpenCreateModal}
          size="md"
          leftIcon={<PlusCircle className="w-4 h-4" />}
        >
          Tạo Lớp Học Mới
        </Button>
      </div>

      {/* Classes Grid */}
      {classes.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="w-8 h-8" />}
          title="Chưa có lớp học nào"
          description="Hãy tạo lớp học đầu tiên để bắt đầu tạo bài học và mời học sinh tham gia."
          actionText="Tạo Lớp Ngay"
          onAction={handleOpenCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map(cls => (
            <Card
              key={cls.id}
              className="flex flex-col justify-between hover:border-blue-400 hover:shadow-md transition group"
            >
              <div>
                {/* Card Top badges */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                    {cls.grade} • {cls.subject}
                  </span>

                  {cls.certificateEnabled && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      <Award className="w-3 h-3 text-amber-600" />
                      Có Chứng chỉ
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition leading-snug">
                  {cls.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                  {cls.description}
                </p>

                {/* Class Code Box */}
                <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Mã Lớp Học</div>
                    <div className="text-base font-black font-mono tracking-wider text-slate-800">
                      {cls.classCode}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={e => handleCopyCode(cls.classCode, e)}
                      className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                      title="Sao chép mã lớp"
                    >
                      {copiedCode === cls.classCode ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={e => handleRegenerateCode(cls.id, e)}
                      className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 transition cursor-pointer"
                      title="Tạo lại mã lớp ngẫu nhiên"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditModal(cls)}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                    title="Chỉnh sửa lớp"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setClassToDelete(cls)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Xóa lớp"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => navigate(`/admin/classes/${cls.id}`)}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Chi tiết Lớp
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Class Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClass ? 'Chỉnh Sửa Lớp Học' : 'Tạo Lớp Học Mới'}
        subtitle="Hệ thống sẽ tự sinh mã lớp độc lập để học sinh tham gia dễ dàng"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveClass} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Tên Lớp Học <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Lớp 10A1 - Tin học & Sáng tạo Số"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Môn Học <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Tin học"
                value={formData.subject}
                onChange={e => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Khối Lớp <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.grade}
                onChange={e => setFormData({ ...formData, grade: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none bg-white"
              >
                <option value="Lớp 6">Lớp 6</option>
                <option value="Lớp 7">Lớp 7</option>
                <option value="Lớp 8">Lớp 8</option>
                <option value="Lớp 9">Lớp 9</option>
                <option value="Lớp 10">Lớp 10</option>
                <option value="Lớp 11">Lớp 11</option>
                <option value="Lớp 12">Lớp 12</option>
                <option value="CLB / Khóa Kỹ Năng">CLB / Khóa Kỹ Năng</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Năm Học</label>
            <input
              type="text"
              placeholder="2025 - 2026"
              value={formData.schoolYear}
              onChange={e => setFormData({ ...formData, schoolYear: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Mô Tả Lớp Học</label>
            <textarea
              rows={3}
              placeholder="Mô tả mục tiêu, yêu cầu và quy trình học kết hợp..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
            />
          </div>

          {/* Optional custom code on create */}
          {!editingClass && (
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Tùy chỉnh Mã Lớp (Để trống sẽ tự động sinh)
              </label>
              <input
                type="text"
                placeholder="Ví dụ: TIN10-A1"
                value={formData.customCode}
                onChange={e => setFormData({ ...formData, customCode: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono uppercase focus:border-blue-500 outline-none"
              />
            </div>
          )}

          {/* Settings checkboxes */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-700">
              <input
                type="checkbox"
                checked={formData.certificateEnabled}
                onChange={e => setFormData({ ...formData, certificateEnabled: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded-sm"
              />
              <span>Cấp Giấy chứng nhận hoàn thành khóa học khi học sinh đạt 100%</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-700">
              <input
                type="checkbox"
                checked={formData.scoringEnabled}
                onChange={e => setFormData({ ...formData, scoringEnabled: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded-sm"
              />
              <span>Bật hệ thống tính điểm & thang điểm chấm bài tập</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit">
              {editingClass ? 'Lưu Thay Đổi' : 'Tạo Lớp Học'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!classToDelete}
        onClose={() => setClassToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Xóa Lớp Học"
        message={`Bạn có chắc chắn muốn xóa lớp "${classToDelete?.name}"? Tất cả bài học và dữ liệu học sinh trong lớp sẽ bị xóa.`}
        confirmText="Xóa Lớp"
        isDestructive
      />
    </div>
  );
};
