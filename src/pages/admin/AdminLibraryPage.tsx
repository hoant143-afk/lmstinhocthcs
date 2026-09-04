import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { classService } from '../../services/classService';
import { lessonService } from '../../services/lessonService';
import { lessonRepo } from '../../repositories';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ClassEntity, Lesson } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { BookOpen, Copy, Plus, Edit2 } from 'lucide-react';

export const AdminLibraryPage: React.FC = () => {
  const { teacher } = useAuth();
  const { toastSuccess, toastError } = useToast();
  const navigate = useNavigate();

  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [targetClassId, setTargetClassId] = useState<string>('');
  const [selectedLessonToCopy, setSelectedLessonToCopy] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Create Lesson Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createClassId, setCreateClassId] = useState<string>('');
  const [createTitle, setCreateTitle] = useState<string>('');
  const [createDescription, setCreateDescription] = useState<string>('');
  const [createObjectives, setCreateObjectives] = useState<string>('');
  const [createSequentialLock, setCreateSequentialLock] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    loadLibrary();
  }, [teacher]);

  const loadLibrary = async () => {
    if (!teacher) return;
    setIsLoading(true);
    try {
      const [lList, cList] = await Promise.all([
        lessonRepo.getAll(),
        classService.getTeacherClasses(teacher.id)
      ]);
      setAllLessons(lList);
      setClasses(cList);
      if (cList.length > 0) {
        setTargetClassId(cList[0].id);
        setCreateClassId(cList[0].id);
      }
    } catch (err) {
      console.error(err);
      toastError('Lỗi khi tải thư viện bài học');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    if (classes.length === 0) {
      navigate('/admin/classes');
      return;
    }
    setCreateTitle('');
    setCreateDescription('');
    setCreateObjectives('');
    setCreateSequentialLock(true);
    if (!createClassId && classes.length > 0) {
      setCreateClassId(classes[0].id);
    }
    setIsCreateModalOpen(true);
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher || !createTitle.trim() || !createClassId) {
      toastError('Vui lòng điền tiêu đề bài học và chọn lớp.');
      return;
    }

    setIsSubmitting(true);
    try {
      const objectives = createObjectives
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);

      const created = await lessonService.createLesson({
        teacherId: teacher.id,
        classId: createClassId,
        title: createTitle.trim(),
        description: createDescription.trim(),
        objectives,
        sequentialLock: createSequentialLock,
        scoringEnabled: true,
        status: 'active'
      });

      toastSuccess('Đã tạo bài học mới! Đang chuyển đến trang chỉnh sửa nhiệm vụ...');
      setIsCreateModalOpen(false);
      navigate(`/admin/lessons/${created.id}/edit`);
    } catch (err: any) {
      toastError(err.message || 'Lỗi khi tạo bài học');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLessonToClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLessonToCopy || !targetClassId || !teacher) return;

    try {
      await lessonService.duplicateLesson(selectedLessonToCopy.id, targetClassId);
      toastSuccess(`Đã nhân bản bài học "${selectedLessonToCopy.title}" sang lớp được chọn!`);
      setSelectedLessonToCopy(null);
      await loadLibrary();
    } catch (err) {
      toastError('Lỗi khi sao chép bài học');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Thư Viện Bài Học & Giáo Án
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Quản lý và thiết kế các bài học theo mô hình Blended Learning 30/70 (Video chống tua, Trắc nghiệm, Thực hành phòng Lab).
          </p>
        </div>

        {classes.length > 0 && (
          <Button
            onClick={handleOpenCreateModal}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Tạo Bài Học Mới
          </Button>
        )}
      </div>

      {allLessons.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-slate-300">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Bạn chưa có bài học nào</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
            Hãy bắt đầu tạo bài học mới cho lớp học của bạn với cấu hình Blended Learning (Video tự học chống tua, Quiz ôn tập và Kịch bản thực hành phòng Lab).
          </p>
          <Button
            onClick={handleOpenCreateModal}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            {classes.length > 0 ? 'Tạo bài học đầu tiên' : 'Tạo lớp học đầu tiên'}
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allLessons.map(lesson => (
            <Card key={lesson.id} className="p-5 flex flex-col justify-between hover:border-blue-400 transition">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                    Mô hình 30/70
                  </span>
                  {lesson.sequentialLock && (
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      Khóa tuần tự
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">{lesson.title}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{lesson.description}</p>

                {lesson.objectives && lesson.objectives.length > 0 && (
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Mục tiêu:</div>
                    <ul className="text-xs text-slate-600 space-y-0.5 list-disc list-inside">
                      {lesson.objectives.slice(0, 2).map((obj, i) => (
                        <li key={i} className="line-clamp-1">{obj}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate(`/admin/lessons/${lesson.id}/edit`)}
                  leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                >
                  Chỉnh sửa
                </Button>
                {classes.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedLessonToCopy(lesson)}
                    leftIcon={<Copy className="w-3.5 h-3.5" />}
                  >
                    Nhân Bản Sang Lớp...
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Lesson Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Tạo Bài Học Mới"
        subtitle="Thiết lập tiêu đề và phân lớp cho bài học Blended Learning"
        maxWidth="md"
      >
        <form onSubmit={handleCreateLesson} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Chọn Lớp Học Tiếp Nhận <span className="text-rose-500">*</span>
            </label>
            <select
              value={createClassId}
              onChange={e => setCreateClassId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white outline-none focus:border-blue-500"
              required
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.grade})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Tiêu Đề Bài Học <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Bài 1: Nhập môn và Cấu trúc Điều khiển"
              value={createTitle}
              onChange={e => setCreateTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Mô Tả Bài Học
            </label>
            <textarea
              rows={2}
              placeholder="Mô tả tóm tắt nội dung bài học..."
              value={createDescription}
              onChange={e => setCreateDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Mục Tiêu Đạt Được (Mỗi mục tiêu 1 dòng)
            </label>
            <textarea
              rows={2}
              placeholder="Hiểu được cú pháp cơ bản&#10;Viết được chương trình tính tổng"
              value={createObjectives}
              onChange={e => setCreateObjectives(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="seqLock"
              checked={createSequentialLock}
              onChange={e => setCreateSequentialLock(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600"
            />
            <label htmlFor="seqLock" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Bắt buộc học tuần tự (Học sinh phải hoàn thành nhiệm vụ trước mới mở nhiệm vụ sau)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Tạo & Cấu Hình Nhiệm Vụ
            </Button>
          </div>
        </form>
      </Modal>

      {/* Copy Modal */}
      <Modal
        isOpen={!!selectedLessonToCopy}
        onClose={() => setSelectedLessonToCopy(null)}
        title="Sao Chép Bài Học Sang Lớp Học"
        subtitle={`Bài học: "${selectedLessonToCopy?.title}"`}
        maxWidth="md"
      >
        <form onSubmit={handleCopyLessonToClass} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Chọn Lớp Đích Để Sao Chép <span className="text-rose-500">*</span>
            </label>
            <select
              value={targetClassId}
              onChange={e => setTargetClassId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.grade})</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Toàn bộ cấu hình 30% video chống tua, câu hỏi mini quiz và bài tập thực hành 70% sẽ được nhân bản sang lớp được chọn.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setSelectedLessonToCopy(null)}>
              Hủy
            </Button>
            <Button type="submit">Sao Chép Ngay</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
