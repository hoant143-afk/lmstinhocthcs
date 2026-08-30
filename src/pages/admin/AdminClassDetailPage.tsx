import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { classService } from '../../services/classService';
import { lessonService } from '../../services/lessonService';
import { studentService } from '../../services/studentService';
import { submissionService } from '../../services/submissionService';
import { progressService } from '../../services/progressService';
import { taskRepo } from '../../repositories/LocalStorageRepository';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ClassEntity, Lesson, Student, Submission, Task } from '../../types';
import { Card, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge, LessonStatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import {
  GraduationCap,
  BookOpen,
  Users,
  FileCheck,
  TrendingUp,
  Settings,
  PlusCircle,
  Copy,
  Check,
  ArrowLeft,
  Edit2,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Clock,
  Sparkles,
  Award,
  CheckCircle2
} from 'lucide-react';

export const AdminClassDetailPage: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const { teacher } = useAuth();
  const { toastSuccess, toastError } = useToast();
  const navigate = useNavigate();

  const [cls, setCls] = useState<ClassEntity | null>(null);
  const [activeTab, setActiveTab] = useState<'lessons' | 'students' | 'offline_confirm' | 'submissions' | 'settings'>('lessons');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [studentProgressMap, setStudentProgressMap] = useState<Record<string, Record<string, number>>>({});
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Create Lesson Modal
  const [isLessonModalOpen, setIsLessonModalOpen] = useState<boolean>(false);
  const [lessonFormData, setLessonFormData] = useState({
    title: '',
    description: '',
    objectives: '',
    sequentialLock: true,
    scoringEnabled: true,
    status: 'active' as Lesson['status']
  });

  // Grading Modal
  const [gradingSub, setGradingSub] = useState<Submission | null>(null);
  const [gradeScore, setGradeScore] = useState<number>(10);
  const [gradeFeedback, setGradeFeedback] = useState<string>('');

  // Delete Lesson
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);

  useEffect(() => {
    if (classId) {
      loadClassData(classId);
    }
  }, [classId]);

  const loadClassData = async (cId: string) => {
    setIsLoading(true);
    try {
      const classData = await classService.getClassById(cId);
      if (!classData) {
        toastError('Không tìm thấy lớp học');
        navigate('/admin/classes');
        return;
      }
      setCls(classData);

      const [lessonList, studentList, subList] = await Promise.all([
        lessonService.getLessonsByClass(cId),
        studentService.getStudentsByClass(cId),
        submissionService.getSubmissionsByClass(cId)
      ]);

      setLessons(lessonList);
      setStudents(studentList);
      setSubmissions(subList);

      // Load progress and all tasks
      let allTasks: Task[] = [];
      const progMap: Record<string, Record<string, number>> = {};

      for (const l of lessonList) {
        const tList = await taskRepo.getByLessonId(l.id);
        allTasks = [...allTasks, ...tList];

        for (const st of studentList) {
          const summary = await progressService.getLessonProgressSummary(st.id, l.id);
          if (!progMap[st.id]) progMap[st.id] = {};
          progMap[st.id][l.id] = summary.percent;
        }
      }

      setTasks(allTasks);
      setStudentProgressMap(progMap);
    } catch (err) {
      console.error(err);
      toastError('Lỗi khi tải dữ liệu lớp');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!cls) return;
    navigator.clipboard.writeText(cls.classCode);
    setCopiedCode(true);
    toastSuccess(`Đã sao chép mã lớp: ${cls.classCode}`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cls || !teacher) return;
    if (!lessonFormData.title.trim()) {
      toastError('Vui lòng nhập tên bài học');
      return;
    }

    try {
      const objectives = lessonFormData.objectives
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);

      const created = await lessonService.createLesson({
        teacherId: teacher.id,
        classId: cls.id,
        title: lessonFormData.title,
        description: lessonFormData.description,
        objectives,
        sequentialLock: lessonFormData.sequentialLock,
        scoringEnabled: lessonFormData.scoringEnabled,
        status: lessonFormData.status
      });

      toastSuccess('Đã tạo bài học mới! Bây giờ bạn có thể thêm các nhiệm vụ 30/70.');
      setIsLessonModalOpen(false);
      navigate(`/admin/lessons/${created.id}/edit`);
    } catch (err: any) {
      toastError(err.message || 'Lỗi tạo bài học');
    }
  };

  const handleDeleteLessonConfirm = async () => {
    if (!lessonToDelete) return;
    try {
      await lessonService.deleteLesson(lessonToDelete.id);
      toastSuccess(`Đã xóa bài học "${lessonToDelete.title}"`);
      setLessonToDelete(null);
      if (classId) loadClassData(classId);
    } catch (err) {
      toastError('Không thể xóa bài học');
    }
  };

  const handleOfflineConfirm = async (studentId: string, lessonId: string, taskId: string) => {
    if (!teacher) return;
    try {
      await progressService.confirmTeacherOfflineActivity(studentId, lessonId, taskId, teacher.id);
      toastSuccess('Đã xác nhận hoàn thành hoạt động thực hành trực tiếp tại lớp!');
      if (classId) loadClassData(classId);
    } catch (err) {
      toastError('Lỗi xác nhận hoạt động');
    }
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSub || !teacher) return;
    try {
      await submissionService.gradeSubmission(
        gradingSub.id,
        gradeScore,
        gradeFeedback,
        teacher.id
      );
      toastSuccess('Đã lưu điểm và nhận xét cho học sinh!');
      setGradingSub(null);
      if (classId) loadClassData(classId);
    } catch (err) {
      toastError('Lỗi khi lưu điểm');
    }
  };

  if (isLoading || !cls) {
    return <div className="p-8 text-center text-slate-500">Đang tải dữ liệu lớp học...</div>;
  }

  const offlineConfirmationTasks = tasks.filter(
    t => t.type === 'teacher_confirmation' || t.settings.requiresTeacherSignOff
  );

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Class Header */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link to="/admin/classes" className="hover:text-blue-600 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Danh sách Lớp
        </Link>
        <span>/</span>
        <span className="text-slate-800">{cls.name}</span>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
              {cls.grade} • {cls.subject}
            </span>
            <span className="text-xs text-slate-400 font-medium">{cls.schoolYear}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{cls.name}</h1>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">{cls.description}</p>
        </div>

        {/* Class Code Badge & Copy */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex items-center gap-4 shrink-0">
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Mã Tham Gia Lớp</div>
            <div className="text-xl font-black font-mono tracking-wider text-slate-900">
              {cls.classCode}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyCode}
            leftIcon={copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {copiedCode ? 'Đã chép' : 'Sao chép'}
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        {[
          { id: 'lessons', label: `Bài Học (${lessons.length})`, icon: <BookOpen className="w-4 h-4" /> },
          { id: 'students', label: `Học Sinh (${students.length})`, icon: <Users className="w-4 h-4" /> },
          { id: 'offline_confirm', label: 'Nghiệm Thu Trực Tiếp (70%)', icon: <CheckCircle2 className="w-4 h-4" /> },
          { id: 'submissions', label: `Bài Nộp (${submissions.length})`, icon: <FileCheck className="w-4 h-4" /> },
          { id: 'settings', label: 'Cài Đặt Lớp', icon: <Settings className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB CONTENT: Lessons */}
      {activeTab === 'lessons' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Danh Sách Bài Học Trong Lớp</h2>
            <Button
              size="sm"
              onClick={() => {
                setLessonFormData({
                  title: '',
                  description: '',
                  objectives: '',
                  sequentialLock: true,
                  scoringEnabled: true,
                  status: 'active'
                });
                setIsLessonModalOpen(true);
              }}
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              Thêm Bài Học Mới
            </Button>
          </div>

          {lessons.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-8 h-8" />}
              title="Chưa có bài học nào"
              description="Hãy tạo bài học đầu tiên với mô hình 30% Online và 70% Trực tiếp."
              actionText="Tạo Bài Học"
              onAction={() => setIsLessonModalOpen(true)}
            />
          ) : (
            <div className="space-y-3">
              {lessons.map((lesson, idx) => (
                <Card
                  key={lesson.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-blue-300 transition"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center shrink-0 border border-blue-100">
                      {idx + 1}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <LessonStatusBadge status={lesson.status} />
                        {lesson.sequentialLock && (
                          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md">
                            <ShieldCheck className="w-3 h-3 text-blue-600" />
                            Khóa tuần tự
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-900">{lesson.title}</h3>
                      <p className="text-xs text-slate-500 line-clamp-1">{lesson.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/admin/lessons/${lesson.id}/edit`)}
                      leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                    >
                      Soạn Nhiệm Vụ 30/70
                    </Button>
                    <button
                      onClick={() => setLessonToDelete(lesson)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Xóa bài học"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Students */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">Danh Sách Học Sinh Đã Tham Gia ({students.length})</h2>
          {students.length === 0 ? (
            <EmptyState
              icon={<Users className="w-8 h-8" />}
              title="Chưa có học sinh nào tham gia"
              description={`Chia sẻ mã lớp "${cls.classCode}" để học sinh tham gia học tập.`}
              actionText="Sao chép Mã Lớp"
              onAction={handleCopyCode}
            />
          ) : (
            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3.5">Học Sinh</th>
                      <th className="px-5 py-3.5">Ngày Tham Gia</th>
                      <th className="px-5 py-3.5">Trạng Thái</th>
                      {lessons.map(l => (
                        <th key={l.id} className="px-5 py-3.5 text-center truncate max-w-[120px]">
                          {l.title.split(':')[0] || l.title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map(st => (
                      <tr key={st.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-4 font-bold text-slate-800 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                            {st.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <span>{st.fullName}</span>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-500">
                          {new Date(st.joinedAt).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant="emerald" size="sm">Đang học</Badge>
                        </td>
                        {lessons.map(l => {
                          const pct = studentProgressMap[st.id]?.[l.id] || 0;
                          return (
                            <td key={l.id} className="px-5 py-4 text-center">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                                  pct === 100
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : pct > 0
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {pct}%
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* TAB CONTENT: Offline Confirmation (70% Real-world Labs) */}
      {activeTab === 'offline_confirm' && (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-900 text-sm">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              <strong>Bảng Nghiệm Thu Trực Tiếp:</strong> Giáo viên xác nhận khi học sinh hoàn thành thuyết trình, thực hành lập trình hoặc dự án nhóm tại phòng Lab để mở khóa chứng nhận.
            </span>
          </div>

          <div className="space-y-4">
            {students.map(st => (
              <Card key={st.id} className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs">
                      {st.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{st.fullName}</h4>
                      <p className="text-xs text-slate-500">Mã học sinh: {st.id}</p>
                    </div>
                  </div>
                </div>

                {/* Offline Tasks for each lesson */}
                <div className="space-y-2">
                  {lessons.map(lesson => {
                    const lessonOfflineTasks = tasks.filter(
                      t => t.lessonId === lesson.id && (t.type === 'teacher_confirmation' || t.phase === 'offline')
                    );

                    return (
                      <div key={lesson.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                        <div className="text-xs font-bold text-slate-700">{lesson.title}</div>
                        {lessonOfflineTasks.length === 0 ? (
                          <div className="text-xs text-slate-400 italic">Chưa có nhiệm vụ offline nào.</div>
                        ) : (
                          <div className="space-y-2">
                            {lessonOfflineTasks.map(t => (
                              <div
                                key={t.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-lg border border-slate-200"
                              >
                                <div>
                                  <div className="text-xs font-semibold text-slate-800">{t.title}</div>
                                  <div className="text-[11px] text-slate-500">{t.description}</div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="success"
                                  onClick={() => handleOfflineConfirm(st.id, lesson.id, t.id)}
                                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                                >
                                  Xác Nhận Đạt (Tại Lớp)
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Submissions */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">Danh Sách Bài Nộp Của Lớp ({submissions.length})</h2>
          {submissions.length === 0 ? (
            <EmptyState
              icon={<FileCheck className="w-8 h-8" />}
              title="Chưa có bài nộp nào"
              description="Khi học sinh nộp bài tập qua link Google Docs, Drive, Canva, Github sẽ xuất hiện tại đây."
            />
          ) : (
            <div className="space-y-3">
              {submissions.map(sub => {
                const student = students.find(s => s.id === sub.studentId);
                const task = tasks.find(t => t.id === sub.taskId);

                return (
                  <Card key={sub.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {student?.fullName || 'Học sinh'}
                        </span>
                        {sub.status === 'graded' ? (
                          <Badge variant="emerald">Điểm: {sub.score} / {sub.maxScore || 10}</Badge>
                        ) : (
                          <Badge variant="amber">Chờ chấm</Badge>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-blue-600">{task?.title || 'Bài tập thực hành'}</div>
                      {sub.url && (
                        <a
                          href={sub.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-slate-600 hover:text-blue-600 underline flex items-center gap-1 truncate"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span>{sub.url}</span>
                        </a>
                      )}
                      {sub.text && <p className="text-xs text-slate-600 italic">"{sub.text}"</p>}
                      {sub.feedback && (
                        <p className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg mt-2">
                          <strong>Nhận xét của Thầy:</strong> {sub.feedback}
                        </p>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant={sub.status === 'graded' ? 'outline' : 'primary'}
                      onClick={() => {
                        setGradingSub(sub);
                        setGradeScore(sub.score ?? 10);
                        setGradeFeedback(sub.feedback || '');
                      }}
                    >
                      {sub.status === 'graded' ? 'Sửa Điểm' : 'Chấm Điểm & Nhận Xét'}
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Class Settings */}
      {activeTab === 'settings' && (
        <Card className="p-6 max-w-2xl space-y-6">
          <CardHeader title="Cài Đặt & Cấu Hình Lớp Học" subtitle="Quản lý chứng chỉ và mã lớp" />
          <div className="space-y-4 text-sm text-slate-700">
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <div className="font-bold text-slate-900">Mã Lớp Học</div>
                <div className="text-xs text-slate-500 font-mono mt-0.5">{cls.classCode}</div>
              </div>
              <Button size="sm" variant="outline" onClick={handleCopyCode}>
                Sao chép mã
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <div className="font-bold text-slate-900">Cấp Chứng Nhận Tự Động</div>
                <div className="text-xs text-slate-500">
                  {cls.certificateEnabled ? 'Đang bật (Cấp khi học sinh đạt 100%)' : 'Đang tắt'}
                </div>
              </div>
              <Badge variant={cls.certificateEnabled ? 'emerald' : 'slate'}>
                {cls.certificateEnabled ? 'Bật' : 'Tắt'}
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Create Lesson Modal */}
      <Modal
        isOpen={isLessonModalOpen}
        onClose={() => setIsLessonModalOpen(false)}
        title="Thêm Bài Học Mới"
        subtitle="Soạn bài học theo cấu trúc 30% Online và 70% Trực tiếp"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateLesson} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Tên Bài Học <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Bài 4: Lập trình Ứng dụng Quản lý Thông minh"
              value={lessonFormData.title}
              onChange={e => setLessonFormData({ ...lessonFormData, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Mô Tả Bài Học</label>
            <textarea
              rows={2}
              placeholder="Mô tả mục đích và nội dung cốt lõi của bài học..."
              value={lessonFormData.description}
              onChange={e => setLessonFormData({ ...lessonFormData, description: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Mục Tiêu Bài Học (Mỗi dòng một mục tiêu)
            </label>
            <textarea
              rows={3}
              placeholder="Hiểu nguyên lý cơ bản...&#10;Thực hành xây dựng sản phẩm tại lớp...&#10;Báo cáo và nghiệm thu..."
              value={lessonFormData.objectives}
              onChange={e => setLessonFormData({ ...lessonFormData, objectives: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-700">
              <input
                type="checkbox"
                checked={lessonFormData.sequentialLock}
                onChange={e => setLessonFormData({ ...lessonFormData, sequentialLock: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded-sm"
              />
              <span>
                <strong>Khóa tuần tự (Sequential Unlock):</strong> Yêu cầu hoàn thành video / quiz trước khi mở khóa bài tập thực hành.
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsLessonModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit">Tạo & Soạn Nhiệm Vụ</Button>
          </div>
        </form>
      </Modal>

      {/* Grading Modal */}
      <Modal
        isOpen={!!gradingSub}
        onClose={() => setGradingSub(null)}
        title="Chấm Điểm & Nhận Xét Bài Nộp"
        maxWidth="md"
      >
        <form onSubmit={handleSaveGrade} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Điểm số (Thang điểm {gradingSub?.maxScore || 10}) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.25"
              min="0"
              max={gradingSub?.maxScore || 10}
              required
              value={gradeScore}
              onChange={e => setGradeScore(parseFloat(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Nhận xét của Giáo viên
            </label>
            <textarea
              rows={3}
              placeholder="Nhận xét ưu điểm, điểm cần khắc phục và lời khuyên..."
              value={gradeFeedback}
              onChange={e => setGradeFeedback(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setGradingSub(null)}>
              Hủy
            </Button>
            <Button type="submit">Lưu Kết Quả</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Lesson Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!lessonToDelete}
        onClose={() => setLessonToDelete(null)}
        onConfirm={handleDeleteLessonConfirm}
        title="Xóa Bài Học"
        message={`Bạn có chắc chắn muốn xóa bài học "${lessonToDelete?.title}" cùng tất cả các nhiệm vụ đính kèm?`}
        confirmText="Xóa Bài Học"
        isDestructive
      />
    </div>
  );
};
