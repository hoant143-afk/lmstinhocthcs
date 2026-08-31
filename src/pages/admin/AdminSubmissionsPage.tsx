import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { submissionService } from '../../services/submissionService';
import { classService } from '../../services/classService';
import { studentRepo, taskRepo, lessonRepo } from '../../repositories';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Submission, ClassEntity, Student, Task, Lesson } from '../../types';
import { Card, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import {
  FileCheck,
  Filter,
  ExternalLink,
  Edit2,
  CheckCircle2,
  Clock,
  Search,
  Award
} from 'lucide-react';

export const AdminSubmissionsPage: React.FC = () => {
  const { teacher } = useAuth();
  const { toastSuccess, toastError } = useToast();
  const [searchParams] = useSearchParams();
  const targetSubId = searchParams.get('subId');

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [students, setStudents] = useState<Record<string, Student>>({});
  const [tasks, setTasks] = useState<Record<string, Task>>({});
  const [lessons, setLessons] = useState<Record<string, Lesson>>({});

  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'graded'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Grading Modal
  const [activeSub, setActiveSub] = useState<Submission | null>(null);
  const [gradeScore, setGradeScore] = useState<number>(10);
  const [gradeFeedback, setGradeFeedback] = useState<string>('');

  useEffect(() => {
    loadAllData();
  }, [teacher]);

  const loadAllData = async () => {
    if (!teacher) return;
    setIsLoading(true);
    try {
      const clsList = await classService.getTeacherClasses(teacher.id);
      setClasses(clsList);

      let allSubs: Submission[] = [];
      const studentMap: Record<string, Student> = {};
      const taskMap: Record<string, Task> = {};
      const lessonMap: Record<string, Lesson> = {};

      for (const c of clsList) {
        const subs = await submissionService.getSubmissionsByClass(c.id);
        allSubs = [...allSubs, ...subs];

        const stds = await studentRepo.getByClassId(c.id);
        stds.forEach(s => { studentMap[s.id] = s; });

        const lList = await lessonRepo.getByClassId(c.id);
        for (const l of lList) {
          lessonMap[l.id] = l;
          const tList = await taskRepo.getByLessonId(l.id);
          tList.forEach(t => { taskMap[t.id] = t; });
        }
      }

      setSubmissions(allSubs);
      setStudents(studentMap);
      setTasks(taskMap);
      setLessons(lessonMap);

      if (targetSubId) {
        const found = allSubs.find(s => s.id === targetSubId);
        if (found) {
          setActiveSub(found);
          setGradeScore(found.score ?? 10);
          setGradeFeedback(found.feedback || '');
        }
      }
    } catch (err) {
      console.error(err);
      toastError('Lỗi tải dữ liệu bài nộp');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenGrade = (sub: Submission) => {
    setActiveSub(sub);
    setGradeScore(sub.score ?? 10);
    setGradeFeedback(sub.feedback || '');
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSub || !teacher) return;

    try {
      await submissionService.gradeSubmission(
        activeSub.id,
        gradeScore,
        gradeFeedback,
        teacher.id
      );
      toastSuccess('Đã lưu kết quả chấm điểm!');
      setActiveSub(null);
      loadAllData();
    } catch (err) {
      toastError('Lỗi khi chấm bài');
    }
  };

  const filteredSubmissions = submissions.filter(s => {
    if (selectedClassId !== 'all' && s.classId !== selectedClassId) return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (searchQuery) {
      const studentName = students[s.studentId]?.fullName?.toLowerCase() || '';
      const taskName = tasks[s.taskId]?.title?.toLowerCase() || '';
      const q = searchQuery.toLowerCase();
      if (!studentName.includes(q) && !taskName.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Chấm Điểm & Nhận Xét Bài Nộp</h1>
        <p className="text-sm text-slate-500 mt-1">
          Đánh giá sản phẩm thực hành 70% trên lớp (Google Drive, Canva, Github) và gửi phản hồi cho học sinh
        </p>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Class Filter */}
          <select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
          >
            <option value="all">Tất cả Lớp học</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="submitted">Chờ chấm điểm</option>
            <option value="graded">Đã chấm điểm</option>
          </select>
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm theo học sinh, bài tập..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-blue-500 outline-none"
          />
        </div>
      </Card>

      {/* Submissions List */}
      {filteredSubmissions.length === 0 ? (
        <EmptyState
          icon={<FileCheck className="w-8 h-8" />}
          title="Không tìm thấy bài nộp nào"
          description="Hiện tại không có bài nộp nào phù hợp với bộ lọc đã chọn."
        />
      ) : (
        <div className="space-y-3">
          {filteredSubmissions.map(sub => {
            const student = students[sub.studentId];
            const task = tasks[sub.taskId];
            const lesson = lessons[sub.lessonId];
            const cls = classes.find(c => c.id === sub.classId);

            return (
              <Card key={sub.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-slate-900 text-base">
                      {student?.fullName || 'Học sinh'}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold px-2 py-0.5 rounded bg-slate-100">
                      {cls?.name || 'Lớp'}
                    </span>
                    {sub.status === 'graded' ? (
                      <Badge variant="emerald">Đã chấm: {sub.score}/{sub.maxScore || 10}đ</Badge>
                    ) : (
                      <Badge variant="amber">Chờ chấm điểm</Badge>
                    )}
                  </div>

                  <div className="text-xs font-semibold text-blue-700">
                    {lesson?.title} • <span className="text-slate-700">{task?.title}</span>
                  </div>

                  {sub.url && (
                    <div className="pt-1">
                      <a
                        href={sub.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 underline font-mono break-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span>{sub.url}</span>
                      </a>
                    </div>
                  )}

                  {sub.text && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                      "{sub.text}"
                    </p>
                  )}

                  {sub.feedback && (
                    <p className="text-xs text-emerald-800 bg-emerald-50/70 p-2 rounded-lg border border-emerald-100">
                      <strong>Nhận xét:</strong> {sub.feedback}
                    </p>
                  )}

                  <div className="text-[11px] text-slate-400">
                    Nộp lúc: {new Date(sub.submittedAt).toLocaleString('vi-VN')}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <Button
                    size="sm"
                    variant={sub.status === 'graded' ? 'outline' : 'primary'}
                    onClick={() => handleOpenGrade(sub)}
                    leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                  >
                    {sub.status === 'graded' ? 'Sửa Điểm' : 'Chấm Điểm'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Grading Modal */}
      <Modal
        isOpen={!!activeSub}
        onClose={() => setActiveSub(null)}
        title="Chấm Điểm & Phản Hồi Học Sinh"
        subtitle="Hệ thống tự động cập nhật tiến độ học tập của học sinh khi hoàn thành chấm điểm"
        maxWidth="md"
      >
        <form onSubmit={handleSaveGrade} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Điểm Số (Thang điểm {activeSub?.maxScore || 10}) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.25"
              min="0"
              max={activeSub?.maxScore || 10}
              required
              value={gradeScore}
              onChange={e => setGradeScore(parseFloat(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Nhận Xét Chi Tiết Của Giáo Viên
            </label>
            <textarea
              rows={4}
              placeholder="Đánh giá kỹ năng lập trình, tính sáng tạo của sản phẩm, mức độ hoàn thiện..."
              value={gradeFeedback}
              onChange={e => setGradeFeedback(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setActiveSub(null)}>
              Hủy
            </Button>
            <Button type="submit">Lưu Kết Quả Chấm</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
