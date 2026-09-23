import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { classService } from '../../services/classService';
import { lessonService } from '../../services/lessonService';
import { ClassEntity, CourseModeStats } from '../../types';
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
  Award,
  Calendar,
  Monitor,
  MapPin,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

export const AdminClassesPage: React.FC = () => {
  const { teacher } = useAuth();
  const { toastSuccess, toastError } = useToast();
  const navigate = useNavigate();

  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [classStatsMap, setClassStatsMap] = useState<Record<string, CourseModeStats>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingClass, setEditingClass] = useState<ClassEntity | null>(null);
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1);

  const [formData, setFormData] = useState({
    name: '',
    subject: 'Tin học',
    grade: 'Lớp 10',
    schoolYear: '2025 - 2026',
    description: '',
    customCode: '',
    plannedLessonCount: 15,
    courseStartDate: '',
    courseEndDate: '',
    certificateEnabled: true,
    scoringEnabled: true,
    // Step 3 initial first lesson (optional)
    createFirstLesson: false,
    firstLessonTitle: '',
    firstLessonMode: 'online' as 'online' | 'offline',
    firstLessonDate: '',
    firstLessonStartTime: '08:00',
    firstLessonEndTime: '09:30',
    firstLessonLocation: ''
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

      // Load mode stats for all classes
      const statsMap: Record<string, CourseModeStats> = {};
      for (const cls of list) {
        statsMap[cls.id] = await classService.getLearningModeStats(cls.id);
      }
      setClassStatsMap(statsMap);
    } catch (err) {
      console.error(err);
      toastError('Không thể tải danh sách lớp học');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingClass(null);
    setCreateStep(1);
    const today = new Date().toISOString().split('T')[0];
    const end = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    setFormData({
      name: '',
      subject: 'Tin học',
      grade: 'Lớp 10',
      schoolYear: '2025 - 2026',
      description: 'Lớp học theo mô hình Blended Learning linh hoạt (Online & Trực tiếp).',
      customCode: '',
      plannedLessonCount: 15,
      courseStartDate: today,
      courseEndDate: end,
      certificateEnabled: true,
      scoringEnabled: true,
      createFirstLesson: false,
      firstLessonTitle: 'Bài 01: Giới thiệu khóa học & Thiết lập môi trường',
      firstLessonMode: 'online',
      firstLessonDate: today,
      firstLessonStartTime: '08:00',
      firstLessonEndTime: '09:30',
      firstLessonLocation: 'Phòng máy 01'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cls: ClassEntity) => {
    setEditingClass(cls);
    setCreateStep(1);
    setFormData({
      name: cls.name,
      subject: cls.subject,
      grade: cls.grade,
      schoolYear: cls.schoolYear,
      description: cls.description,
      customCode: cls.classCode,
      plannedLessonCount: cls.plannedLessonCount || 15,
      courseStartDate: cls.courseStartDate || '',
      courseEndDate: cls.courseEndDate || '',
      certificateEnabled: cls.certificateEnabled,
      scoringEnabled: cls.scoringEnabled,
      createFirstLesson: false,
      firstLessonTitle: '',
      firstLessonMode: 'online',
      firstLessonDate: '',
      firstLessonStartTime: '08:00',
      firstLessonEndTime: '09:30',
      firstLessonLocation: ''
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
          plannedLessonCount: Number(formData.plannedLessonCount) || 15,
          courseStartDate: formData.courseStartDate,
          courseEndDate: formData.courseEndDate,
          certificateEnabled: formData.certificateEnabled,
          scoringEnabled: formData.scoringEnabled
        });
        toastSuccess('Đã cập nhật thông tin lớp học!');
      } else {
        const created = await classService.createClass(teacher.id, {
          name: formData.name,
          subject: formData.subject,
          grade: formData.grade,
          schoolYear: formData.schoolYear,
          description: formData.description,
          customCode: formData.customCode,
          plannedLessonCount: Number(formData.plannedLessonCount) || 15,
          courseStartDate: formData.courseStartDate,
          courseEndDate: formData.courseEndDate,
          certificateEnabled: formData.certificateEnabled,
          scoringEnabled: formData.scoringEnabled
        });

        // Optionally create first scheduled lesson if requested in Step 3
        if (formData.createFirstLesson && formData.firstLessonTitle.trim()) {
          await lessonService.createLesson({
            teacherId: teacher.id,
            classId: created.id,
            title: formData.firstLessonTitle.trim(),
            description: 'Buổi học mở đầu khóa học',
            objectives: ['Làm quen phương pháp học', 'Xác định mục tiêu học tập'],
            learningMode: formData.firstLessonMode,
            scheduledDate: formData.firstLessonDate,
            startTime: formData.firstLessonStartTime,
            endTime: formData.firstLessonEndTime,
            location: formData.firstLessonMode === 'offline' ? formData.firstLessonLocation : undefined,
            status: 'scheduled'
          });
        }

        toastSuccess('Đã tạo lớp học mới thành công!');
        setIsModalOpen(false);
        navigate(`/admin/classes/${created.id}`);
        return;
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
            Quản lý kế hoạch khóa học và thời khóa biểu theo từng buổi Online hoặc Trực tiếp linh hoạt
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
          description="Hãy tạo lớp học đầu tiên để lập kế hoạch khóa học và xếp lịch các buổi học Online / Trực tiếp."
          actionText="Tạo Lớp Ngay"
          onAction={handleOpenCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map(cls => {
            const stats = classStatsMap[cls.id] || {
              totalLessons: 0,
              scheduledCount: 0,
              plannedCount: cls.plannedLessonCount || 0,
              onlineCount: 0,
              offlineCount: 0,
              unassignedCount: 0,
              onlinePercent: 0,
              offlinePercent: 0
            };

            const plannedTotal = cls.plannedLessonCount || stats.totalLessons || 0;

            return (
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

                  {/* Course Plan & Blended Ratio Breakdown */}
                  <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Kế hoạch khóa học:</span>
                      <span className="font-bold text-slate-800">
                        {stats.totalLessons} / {plannedTotal} buổi đã xếp
                      </span>
                    </div>

                    {/* Progress Bar of Scheduled vs Planned */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                      {stats.totalLessons > 0 ? (
                        <>
                          <div
                            style={{ width: `${stats.onlinePercent}%` }}
                            className="bg-blue-600 h-full transition-all"
                            title={`Online: ${stats.onlineCount} buổi (${stats.onlinePercent}%)`}
                          />
                          <div
                            style={{ width: `${stats.offlinePercent}%` }}
                            className="bg-emerald-500 h-full transition-all"
                            title={`Trực tiếp: ${stats.offlineCount} buổi (${stats.offlinePercent}%)`}
                          />
                        </>
                      ) : (
                        <div className="w-full bg-slate-200 h-full" />
                      )}
                    </div>

                    {/* Ratio indicators */}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 font-bold text-blue-700">
                        <Monitor className="w-3 h-3 text-blue-600" />
                        Online: {stats.onlineCount} ({stats.onlinePercent}%)
                      </span>
                      <span className="flex items-center gap-1 font-bold text-emerald-700">
                        <MapPin className="w-3 h-3 text-emerald-600" />
                        Trực tiếp: {stats.offlineCount} ({stats.offlinePercent}%)
                      </span>
                    </div>
                  </div>

                  {/* Class Code Box */}
                  <div className="mt-4 p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Mã Lớp Học</div>
                      <div className="text-base font-black font-mono tracking-wider text-slate-800">
                        {cls.classCode}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={e => handleCopyCode(cls.classCode, e)}
                        className="p-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
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
                        className="p-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-500 transition cursor-pointer"
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
                      title="Chỉnh sửa thông tin lớp"
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
                    Vào Quản Lý Lớp
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Class Multi-step Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClass ? 'Chỉnh Sửa Lớp Học' : 'Tạo Lớp Học Mới'}
        subtitle={
          editingClass
            ? 'Cập nhật thông tin và kế hoạch khóa học'
            : `Bước ${createStep}/3: ${
                createStep === 1
                  ? 'Thông tin lớp'
                  : createStep === 2
                  ? 'Kế hoạch khóa học'
                  : 'Lịch trình ban đầu'
              }`
        }
        maxWidth="lg"
      >
        <form onSubmit={handleSaveClass} className="space-y-4">
          {/* Step Navigation Indicator (if creating new) */}
          {!editingClass && (
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setCreateStep(1)}
                className={`flex items-center gap-1.5 pb-1 border-b-2 transition ${
                  createStep === 1
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-400'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[10px]">
                  1
                </span>
                <span>Thông tin lớp</span>
              </button>

              <button
                type="button"
                onClick={() => setCreateStep(2)}
                className={`flex items-center gap-1.5 pb-1 border-b-2 transition ${
                  createStep === 2
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-400'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[10px]">
                  2
                </span>
                <span>Kế hoạch khóa học</span>
              </button>

              <button
                type="button"
                onClick={() => setCreateStep(3)}
                className={`flex items-center gap-1.5 pb-1 border-b-2 transition ${
                  createStep === 3
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-400'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[10px]">
                  3
                </span>
                <span>Lịch trình ban đầu</span>
              </button>
            </div>
          )}

          {/* STEP 1: Thông tin lớp */}
          {(editingClass || createStep === 1) && (
            <div className="space-y-4">
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
                  rows={2}
                  placeholder="Mô tả mục tiêu và hình thức học kết hợp..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
                />
              </div>

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
            </div>
          )}

          {/* STEP 2: Kế hoạch khóa học */}
          {(editingClass || createStep === 2) && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900 leading-relaxed">
                <strong>Kế hoạch khóa học:</strong> Xác định số buổi học dự kiến và thời gian khóa học. Tỷ lệ Online / Trực tiếp sẽ được hệ thống tính toán động dựa trên các buổi học bạn xếp lịch.
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Số Buổi Học Dự Kiến Trong Khóa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  placeholder="Ví dụ: 15 hoặc 20"
                  value={formData.plannedLessonCount}
                  onChange={e => setFormData({ ...formData, plannedLessonCount: parseInt(e.target.value) || 1 })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Ngày Bắt Đầu Khóa
                  </label>
                  <input
                    type="date"
                    value={formData.courseStartDate}
                    onChange={e => setFormData({ ...formData, courseStartDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Ngày Kết Thúc Khóa
                  </label>
                  <input
                    type="date"
                    value={formData.courseEndDate}
                    onChange={e => setFormData({ ...formData, courseEndDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

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
            </div>
          )}

          {/* STEP 3: Lịch trình ban đầu (Only for Create flow) */}
          {!editingClass && createStep === 3 && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-900 leading-relaxed">
                Bạn có thể tạo ngay buổi học đầu tiên hoặc chọn <strong>"Thiết lập lịch sau"</strong> để vào trang quản lý lớp xếp toàn bộ lịch trình.
              </div>

              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={formData.createFirstLesson}
                  onChange={e => setFormData({ ...formData, createFirstLesson: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded-sm"
                />
                <span className="font-bold text-sm text-slate-800">
                  Tạo buổi học đầu tiên ngay bây giờ
                </span>
              </label>

              {formData.createFirstLesson && (
                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                      Tên Buổi Học Đầu Tiên
                    </label>
                    <input
                      type="text"
                      value={formData.firstLessonTitle}
                      onChange={e => setFormData({ ...formData, firstLessonTitle: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                      Hình Thức Học (Learning Mode)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, firstLessonMode: 'online' })}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                          formData.firstLessonMode === 'online'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        <Monitor className="w-3.5 h-3.5" />
                        ONLINE
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, firstLessonMode: 'offline' })}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                          formData.firstLessonMode === 'offline'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        TRỰC TIẾP
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Ngày học</label>
                      <input
                        type="date"
                        value={formData.firstLessonDate}
                        onChange={e => setFormData({ ...formData, firstLessonDate: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Giờ bắt đầu</label>
                      <input
                        type="time"
                        value={formData.firstLessonStartTime}
                        onChange={e => setFormData({ ...formData, firstLessonStartTime: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Giờ kết thúc</label>
                      <input
                        type="time"
                        value={formData.firstLessonEndTime}
                        onChange={e => setFormData({ ...formData, firstLessonEndTime: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                      />
                    </div>
                  </div>

                  {formData.firstLessonMode === 'offline' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Địa điểm phòng học</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Phòng máy 01 / Tầng 2"
                        value={formData.firstLessonLocation}
                        onChange={e => setFormData({ ...formData, firstLessonLocation: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div>
              {!editingClass && createStep > 1 && (
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setCreateStep((createStep - 1) as any)}
                  leftIcon={<ChevronLeft className="w-4 h-4" />}
                >
                  Quay lại
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
                Hủy
              </Button>

              {!editingClass && createStep < 3 ? (
                <Button
                  type="button"
                  onClick={() => {
                    if (createStep === 1 && !formData.name.trim()) {
                      toastError('Vui lòng nhập tên lớp học');
                      return;
                    }
                    setCreateStep((createStep + 1) as any);
                  }}
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                >
                  Tiếp theo
                </Button>
              ) : (
                <Button type="submit">
                  {editingClass ? 'Lưu Thay Đổi' : 'Hoàn Tất & Tạo Lớp'}
                </Button>
              )}
            </div>
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
