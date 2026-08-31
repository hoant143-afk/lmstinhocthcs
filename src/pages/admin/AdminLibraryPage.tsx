import React, { useState, useEffect } from 'react';
import { classService } from '../../services/classService';
import { lessonService } from '../../services/lessonService';
import { lessonRepo } from '../../repositories';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ClassEntity, Lesson } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { BookOpen, Copy } from 'lucide-react';

export const AdminLibraryPage: React.FC = () => {
  const { teacher } = useAuth();
  const { toastSuccess, toastError } = useToast();

  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [targetClassId, setTargetClassId] = useState<string>('');
  const [selectedLessonToCopy, setSelectedLessonToCopy] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
      }
    } catch (err) {
      console.error(err);
      toastError('Lỗi khi tải thư viện bài học');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLessonToClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLessonToCopy || !targetClassId || !teacher) return;

    try {
      await lessonService.duplicateLesson(selectedLessonToCopy.id, targetClassId);
      toastSuccess(`Đã nhân bản bài học "${selectedLessonToCopy.title}" sang lớp được chọn!`);
      setSelectedLessonToCopy(null);
    } catch (err) {
      toastError('Lỗi khi sao chép bài học');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Ngân Hàng Bài Học Mẫu Chuẩn Blended 30/70
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Kho bài học mẫu đã cấu hình sẵn video chống tua, trắc nghiệm và kịch bản thực hành phòng Lab. Dễ dàng sao chép sang lớp học của bạn.
        </p>
      </div>

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

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedLessonToCopy(lesson)}
                leftIcon={<Copy className="w-3.5 h-3.5" />}
              >
                Nhân Bản Sang Lớp...
              </Button>
            </div>
          </Card>
        ))}
      </div>

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
