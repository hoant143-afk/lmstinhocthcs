import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { classService } from '../../services/classService';
import { lessonService } from '../../services/lessonService';
import { studentService } from '../../services/studentService';
import { submissionService } from '../../services/submissionService';
import { progressService } from '../../services/progressService';
import { taskRepo } from '../../repositories';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ClassEntity, Lesson, Student, Submission, Task, CourseModeStats, LessonLearningMode } from '../../types';
import { Card, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge, LessonStatusBadge, LearningModeBadge } from '../../components/common/Badge';
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
  CheckCircle2,
  Calendar,
  Monitor,
  MapPin,
  ArrowUp,
  ArrowDown,
  Play,
  CalendarDays,
  Video
} from 'lucide-react';

export const AdminClassDetailPage: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const { teacher } = useAuth();
  const { toastSuccess, toastError } = useToast();
  const navigate = useNavigate();

  const [cls, setCls] = useState<ClassEntity | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'lessons' | 'students' | 'offline_confirm' | 'submissions' | 'settings'>('overview');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modeStats, setModeStats] = useState<CourseModeStats | null>(null);
  const [studentProgressMap, setStudentProgressMap] = useState<Record<string, Record<string, number>>>({});
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filter state for lessons tab
  const [lessonModeFilter, setLessonModeFilter] = useState<'all' | 'online' | 'offline'>('all');

  // Create Lesson Modal
  const [isLessonModalOpen, setIsLessonModalOpen] = useState<boolean>(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonFormData, setLessonFormData] = useState({
    title: '',
    description: '',
    objectives: '',
    learningMode: 'online' as LessonLearningMode,
    scheduledDate: '',
    startTime: '08:00',
    endTime: '09:30',
    location: '',
    onlineMeetingUrl: '',
    sequentialLock: true,
    scoringEnabled: true,
    status: 'scheduled' as Lesson['status']
  });

  // Edit Course Plan Modal
  const [isPlanModalOpen, setIsPlanModalOpen] = useState<boolean>(false);
  const [planFormData, setPlanFormData] = useState({
    plannedLessonCount: 15,
    courseStartDate: '',
    courseEndDate: ''
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

      const [lessonList, studentList, subList, stats] = await Promise.all([
        lessonService.getLessonsByClass(cId),
        studentService.getStudentsByClass(cId),
        submissionService.getSubmissionsByClass(cId),
        classService.getLearningModeStats(cId)
      ]);

      setLessons(lessonList);
      setStudents(studentList);
      setSubmissions(subList);
      setModeStats(stats);

      // Set initial plan form data
      setPlanFormData({
        plannedLessonCount: classData.plannedLessonCount || 15,
        courseStartDate: classData.courseStartDate || '',
        courseEndDate: classData.courseEndDate || ''
      });

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

  const handleOpenCreateLessonModal = () => {
    setEditingLessonId(null);
    const today = new Date().toISOString().split('T')[0];
    setLessonFormData({
      title: '',
      description: '',
      objectives: '',
      learningMode: 'online',
      scheduledDate: today,
      startTime: '08:00',
      endTime: '09:30',
      location: 'Phòng máy 01',
      onlineMeetingUrl: 'https://meet.google.com/',
      sequentialLock: true,
      scoringEnabled: true,
      status: 'scheduled'
    });
    setIsLessonModalOpen(true);
  };

  const handleOpenEditLessonModal = (lesson: Lesson) => {
    setEditingLessonId(lesson.id);
    setLessonFormData({
      title: lesson.title,
      description: lesson.description || '',
      objectives: (lesson.objectives || []).join('\n'),
      learningMode: lesson.learningMode || 'online',
      scheduledDate: lesson.scheduledDate || '',
      startTime: lesson.startTime || '08:00',
      endTime: lesson.endTime || '09:30',
      location: lesson.location || '',
      onlineMeetingUrl: lesson.onlineMeetingUrl || '',
      sequentialLock: lesson.sequentialLock ?? true,
      scoringEnabled: lesson.scoringEnabled ?? true,
      status: lesson.status || 'scheduled'
    });
    setIsLessonModalOpen(true);
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cls || !teacher) return;
    if (!lessonFormData.title.trim()) {
      toastError('Vui lòng nhập tên buổi học');
      return;
    }

    try {
      const objectives = lessonFormData.objectives
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);

      if (editingLessonId) {
        await lessonService.updateLesson(editingLessonId, {
          title: lessonFormData.title.trim(),
          description: lessonFormData.description.trim(),
          objectives,
          learningMode: lessonFormData.learningMode,
          scheduledDate: lessonFormData.scheduledDate,
          startTime: lessonFormData.startTime,
          endTime: lessonFormData.endTime,
          location: lessonFormData.learningMode === 'offline' ? lessonFormData.location : undefined,
          onlineMeetingUrl: lessonFormData.learningMode === 'online' ? lessonFormData.onlineMeetingUrl : undefined,
          sequentialLock: lessonFormData.sequentialLock,
          scoringEnabled: lessonFormData.scoringEnabled,
          status: lessonFormData.status
        });
        toastSuccess('Đã cập nhật buổi học!');
        setIsLessonModalOpen(false);
        if (classId) loadClassData(classId);
      } else {
        const created = await lessonService.createLesson({
          teacherId: teacher.id,
          classId: cls.id,
          title: lessonFormData.title.trim(),
          description: lessonFormData.description.trim(),
          objectives,
          learningMode: lessonFormData.learningMode,
          scheduledDate: lessonFormData.scheduledDate,
          startTime: lessonFormData.startTime,
          endTime: lessonFormData.endTime,
          location: lessonFormData.learningMode === 'offline' ? lessonFormData.location : undefined,
          onlineMeetingUrl: lessonFormData.learningMode === 'online' ? lessonFormData.onlineMeetingUrl : undefined,
          sequentialLock: lessonFormData.sequentialLock,
          scoringEnabled: lessonFormData.scoringEnabled,
          status: lessonFormData.status
        });

        toastSuccess('Đã tạo buổi học mới! Bây giờ bạn có thể soạn nhiệm vụ cho buổi học này.');
        setIsLessonModalOpen(false);
        navigate(`/admin/lessons/${created.id}/edit`);
      }
    } catch (err: any) {
      toastError(err.message || 'Lỗi lưu bài học');
    }
  };

  const handleSaveCoursePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cls) return;
    try {
      await classService.updateCoursePlan(cls.id, {
        plannedLessonCount: Number(planFormData.plannedLessonCount) || 15,
        courseStartDate: planFormData.courseStartDate,
        courseEndDate: planFormData.courseEndDate
      });
      toastSuccess('Đã cập nhật kế hoạch khóa học!');
      setIsPlanModalOpen(false);
      if (classId) loadClassData(classId);
    } catch (err) {
      toastError('Không thể cập nhật kế hoạch khóa học');
    }
  };

  const handleMoveLesson = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;

    const newLessons = [...lessons];
    const temp = newLessons[index];
    newLessons[index] = newLessons[targetIndex];
    newLessons[targetIndex] = temp;

    const ids = newLessons.map(l => l.id);
    await lessonService.reorderLessons(cls!.id, ids);
    setLessons(newLessons);
    toastSuccess('Đã cập nhật thứ tự các buổi học');
  };

  const handleDeleteLessonConfirm = async () => {
    if (!lessonToDelete) return;
    try {
      await lessonService.deleteLesson(lessonToDelete.id);
      toastSuccess(`Đã xóa buổi học "${lessonToDelete.title}"`);
      setLessonToDelete(null);
      if (classId) loadClassData(classId);
    } catch (err) {
      toastError('Không thể xóa buổi học');
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

  const filteredLessons = lessons.filter(l => {
    if (lessonModeFilter === 'all') return true;
    return l.learningMode === lessonModeFilter;
  });

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
          { id: 'overview', label: 'Tổng Quan & Kế Hoạch', icon: <GraduationCap className="w-4 h-4" /> },
          { id: 'schedule', label: `Thời Khóa Biểu (${lessons.length})`, icon: <CalendarDays className="w-4 h-4" /> },
          { id: 'lessons', label: `Quản Lý Buổi Học (${lessons.length})`, icon: <BookOpen className="w-4 h-4" /> },
          { id: 'students', label: `Học Sinh (${students.length})`, icon: <Users className="w-4 h-4" /> },
          { id: 'offline_confirm', label: 'Nghiệm Thu Tại Lớp', icon: <CheckCircle2 className="w-4 h-4" /> },
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

      {/* TAB CONTENT: Overview (Section VIII) */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 border-slate-200">
              <div className="text-xs font-bold uppercase text-slate-400 mb-1">Tiến Độ Kế Hoạch</div>
              <div className="text-2xl font-black text-slate-900">
                {lessons.length} / {cls.plannedLessonCount || lessons.length}
              </div>
              <div className="text-xs text-slate-500 mt-1">Buổi học đã xếp lịch</div>
            </Card>

            <Card className="p-4 border-slate-200">
              <div className="text-xs font-bold uppercase text-slate-400 mb-1">Buổi Trực Tuyến (Online)</div>
              <div className="text-2xl font-black text-blue-600">
                {modeStats?.onlineCount || 0} <span className="text-xs text-slate-500 font-semibold">({modeStats?.onlinePercent || 0}%)</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">Học qua video / link meeting</div>
            </Card>

            <Card className="p-4 border-slate-200">
              <div className="text-xs font-bold uppercase text-slate-400 mb-1">Buổi Trực Tiếp (Offline)</div>
              <div className="text-2xl font-black text-emerald-600">
                {modeStats?.offlineCount || 0} <span className="text-xs text-slate-500 font-semibold">({modeStats?.offlinePercent || 0}%)</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">Thực hành phòng máy & dự án</div>
            </Card>

            <Card className="p-4 border-slate-200">
              <div className="text-xs font-bold uppercase text-slate-400 mb-1">Tổng Số Học Sinh</div>
              <div className="text-2xl font-black text-slate-900">{students.length}</div>
              <div className="text-xs text-slate-500 mt-1">Đã tham gia bằng mã lớp</div>
            </Card>
          </div>

          {/* Course Plan & Blended Ratio Visualizer */}
          <Card className="p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Tỷ Lệ Học Tập Kết Hợp (Course Blended Ratio)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Được tự động tổng hợp từ toàn bộ các buổi học đã xếp lịch trong khóa.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPlanModalOpen(true)}
                leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              >
                Chỉnh Sửa Kế Hoạch Khóa
              </Button>
            </div>

            {/* Ratio Progress Bar */}
            <div className="space-y-2">
              <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden flex shadow-inner">
                {lessons.length > 0 ? (
                  <>
                    <div
                      style={{ width: `${modeStats?.onlinePercent || 0}%` }}
                      className="bg-blue-600 h-full transition-all flex items-center justify-center text-[10px] font-black text-white"
                    >
                      {modeStats && modeStats.onlinePercent > 10 ? `${modeStats.onlinePercent}%` : ''}
                    </div>
                    <div
                      style={{ width: `${modeStats?.offlinePercent || 0}%` }}
                      className="bg-emerald-500 h-full transition-all flex items-center justify-center text-[10px] font-black text-white"
                    >
                      {modeStats && modeStats.offlinePercent > 10 ? `${modeStats.offlinePercent}%` : ''}
                    </div>
                  </>
                ) : (
                  <div className="w-full bg-slate-200 h-full" />
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-bold pt-1">
                <span className="flex items-center gap-1.5 text-blue-700">
                  <Monitor className="w-4 h-4 text-blue-600" />
                  ONLINE: {modeStats?.onlineCount || 0} buổi ({modeStats?.onlinePercent || 0}%)
                </span>
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  TRỰC TIẾP: {modeStats?.offlineCount || 0} buổi ({modeStats?.offlinePercent || 0}%)
                </span>
              </div>
            </div>

            {/* Schedule Range Dates */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-slate-400" />
                <div>
                  <div className="text-slate-500 font-medium">Thời gian diễn ra khóa học:</div>
                  <div className="font-bold text-slate-800 text-sm">
                    {cls.courseStartDate ? new Date(cls.courseStartDate).toLocaleDateString('vi-VN') : 'Chưa đặt'} –{' '}
                    {cls.courseEndDate ? new Date(cls.courseEndDate).toLocaleDateString('vi-VN') : 'Chưa đặt'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setActiveTab('schedule')}
                  leftIcon={<CalendarDays className="w-3.5 h-3.5" />}
                >
                  Xem Thời Khóa Biểu
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenCreateLessonModal}
                  leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
                >
                  + Thêm Buổi Học
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB CONTENT: Schedule (Section IX) */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Thời Khóa Biểu Lớp Học</h2>
              <p className="text-xs text-slate-500">
                Toàn bộ các buổi học Online và Trực tiếp được sắp xếp theo trình tự thời gian
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleOpenCreateLessonModal}
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              + Thêm Buổi Học
            </Button>
          </div>

          {lessons.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="w-8 h-8" />}
              title="Thời khóa biểu chưa có buổi học nào"
              description="Hãy thêm các buổi học Online hoặc Trực tiếp để hoàn thiện thời khóa biểu khóa học."
              actionText="+ Thêm Buổi Học Ngay"
              onAction={handleOpenCreateLessonModal}
            />
          ) : (
            <div className="space-y-3">
              {lessons.map((lesson, idx) => {
                const lessonTasks = tasks.filter(t => t.lessonId === lesson.id);

                return (
                  <Card
                    key={lesson.id}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-blue-400 transition group"
                  >
                    <div className="flex items-start gap-4">
                      {/* Order and Move controls */}
                      <div className="flex flex-col items-center shrink-0">
                        <button
                          disabled={idx === 0}
                          onClick={() => handleMoveLesson(idx, 'up')}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                          title="Di chuyển lên"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>

                        <div className="w-10 h-10 rounded-2xl bg-slate-100 font-black text-slate-700 flex items-center justify-center text-sm border border-slate-200">
                          {idx + 1}
                        </div>

                        <button
                          disabled={idx === lessons.length - 1}
                          onClick={() => handleMoveLesson(idx, 'down')}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                          title="Di chuyển xuống"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Lesson details */}
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <LearningModeBadge mode={lesson.learningMode} />
                          <LessonStatusBadge status={lesson.status} />

                          {lesson.scheduledDate && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              {lesson.scheduledDate}
                              {lesson.startTime && ` • ${lesson.startTime} – ${lesson.endTime || ''}`}
                            </span>
                          )}

                          <span className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                            {lessonTasks.length} nhiệm vụ
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition">
                          {lesson.title}
                        </h3>

                        {lesson.description && (
                          <p className="text-xs text-slate-500 line-clamp-1">{lesson.description}</p>
                        )}

                        {/* Mode specifics */}
                        <div className="flex items-center gap-3 text-xs pt-1">
                          {lesson.learningMode === 'online' ? (
                            lesson.onlineMeetingUrl ? (
                              <a
                                href={lesson.onlineMeetingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                              >
                                <Video className="w-3.5 h-3.5 text-blue-600" />
                                <span>Phòng học online: {lesson.onlineMeetingUrl}</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 italic">Chưa gắn link phòng học online</span>
                            )
                          ) : (
                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                              Địa điểm: {lesson.location || 'Phòng thực hành Tin học'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/app/lessons/${lesson.id}`)}
                        leftIcon={<Play className="w-3.5 h-3.5 text-blue-600" />}
                      >
                        Vào Bài Học
                      </Button>

                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => navigate(`/admin/lessons/${lesson.id}/edit`)}
                        leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                      >
                        Soạn Nhiệm Vụ
                      </Button>

                      <button
                        onClick={() => handleOpenEditLessonModal(lesson)}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                        title="Chỉnh sửa thông tin buổi học"
                      >
                        <Settings className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setLessonToDelete(lesson)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Xóa buổi học"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Lessons List & Management (Section X) */}
      {activeTab === 'lessons' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase text-slate-500">Lọc theo hình thức:</span>
              <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs font-bold">
                <button
                  onClick={() => setLessonModeFilter('all')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    lessonModeFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Tất cả ({lessons.length})
                </button>
                <button
                  onClick={() => setLessonModeFilter('online')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    lessonModeFilter === 'online' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Online ({modeStats?.onlineCount || 0})
                </button>
                <button
                  onClick={() => setLessonModeFilter('offline')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    lessonModeFilter === 'offline' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Trực tiếp ({modeStats?.offlineCount || 0})
                </button>
              </div>
            </div>

            <Button
              size="sm"
              onClick={handleOpenCreateLessonModal}
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              + Thêm Buổi Học
            </Button>
          </div>

          {filteredLessons.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-8 h-8" />}
              title="Không tìm thấy bài học nào"
              description="Chưa có bài học phù hợp với bộ lọc hình thức đã chọn."
              actionText="+ Thêm Buổi Học"
              onAction={handleOpenCreateLessonModal}
            />
          ) : (
            <div className="space-y-3">
              {filteredLessons.map((lesson, idx) => (
                <Card
                  key={lesson.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-blue-300 transition"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center shrink-0 border border-blue-100">
                      {lesson.orderIndex || idx + 1}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <LearningModeBadge mode={lesson.learningMode} />
                        <LessonStatusBadge status={lesson.status} />
                        {lesson.scheduledDate && (
                          <span className="text-xs text-slate-500 font-medium">
                            {lesson.scheduledDate} ({lesson.startTime || ''} - {lesson.endTime || ''})
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
                      variant="primary"
                      onClick={() => navigate(`/admin/lessons/${lesson.id}/edit`)}
                      leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                    >
                      Soạn Nhiệm Vụ
                    </Button>
                    <button
                      onClick={() => handleOpenEditLessonModal(lesson)}
                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                      title="Chỉnh sửa thông tin buổi học"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setLessonToDelete(lesson)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
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
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Danh Sách Học Sinh Trong Lớp ({students.length})
            </h2>
          </div>

          {students.length === 0 ? (
            <EmptyState
              icon={<Users className="w-8 h-8" />}
              title="Chưa có học sinh nào"
              description="Hãy chia sẻ mã lớp học để học sinh đăng nhập và tham gia."
              actionText="Sao Chép Mã Lớp"
              onAction={handleCopyCode}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Học Sinh</th>
                      <th className="px-5 py-3">Email</th>
                      <th className="px-5 py-3">Tiến Độ Trung Bình</th>
                      <th className="px-5 py-3 text-right">Chi Tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map(student => {
                      const studentProg = studentProgressMap[student.id] || {};
                      const lessonPercents = Object.values(studentProg) as number[];
                      const avgPercent = lessonPercents.length > 0 && lessons.length > 0
                        ? Math.round(lessonPercents.reduce((a: number, b: number) => a + (Number(b) || 0), 0) / lessons.length)
                        : 0;

                      return (
                        <tr key={student.id} className="hover:bg-slate-50/80 transition">
                          <td className="px-5 py-4 font-bold text-slate-900">
                            {student.fullName}
                          </td>
                          <td className="px-5 py-4 text-slate-500 font-mono text-xs">
                            {student.email}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-32 bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-blue-600 h-full rounded-full transition-all"
                                  style={{ width: `${avgPercent}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-700">{avgPercent}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Badge variant={avgPercent === 100 ? 'emerald' : 'blue'}>
                              {avgPercent === 100 ? 'Hoàn thành 100%' : 'Đang học'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Offline Confirmation (In-Class Signoff) */}
      {activeTab === 'offline_confirm' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 leading-relaxed">
            <strong>Khu Vực Nghiệm Thu Tại Lớp:</strong> Giáo viên xác nhận khi học sinh hoàn thành các nhiệm vụ thực hành, sản phẩm tại lớp trực tiếp. Sau khi nhấn "Ký Duyệt", nhiệm vụ sẽ chuyển thành hoàn thành 100% cho học sinh.
          </div>

          <div className="space-y-4">
            {students.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="w-8 h-8" />}
                title="Chưa có học sinh nào"
                description="Mời học sinh vào lớp để thực hiện nghiệm thu sản phẩm."
              />
            ) : offlineConfirmationTasks.length === 0 ? (
              <EmptyState
                icon={<Award className="w-8 h-8" />}
                title="Chưa có nhiệm vụ nghiệm thu trực tiếp"
                description="Trong các buổi học Trực tiếp, bạn có thể thêm nhiệm vụ loại 'Nghiệm thu tại lớp' để kiểm tra sản phẩm học sinh."
              />
            ) : (
              offlineConfirmationTasks.map(task => (
                <Card key={task.id} className="p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <div className="text-xs font-bold uppercase text-emerald-600">Nhiệm Vụ Nghiệm Thu</div>
                      <h3 className="text-base font-bold text-slate-900">{task.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>
                    </div>
                    <Badge variant="emerald">Trực tiếp</Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {students.map(student => (
                      <div
                        key={student.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2"
                      >
                        <span className="font-bold text-xs text-slate-800 truncate">
                          {student.fullName}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOfflineConfirm(student.id, task.lessonId, task.id)}
                          leftIcon={<Check className="w-3.5 h-3.5 text-emerald-600" />}
                        >
                          Ký Duyệt
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              ))
            )}
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
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          <span>{sub.url}</span>
                        </a>
                      )}
                      {sub.text && <p className="text-xs text-slate-600 italic">"{sub.text}"</p>}
                      {sub.feedback && (
                        <p className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg mt-2">
                          <strong>Nhận xét của Thầy/Cô:</strong> {sub.feedback}
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
          <CardHeader title="Cài Đặt & Kế Hoạch Khóa Học" subtitle="Quản lý thông tin lớp, kế hoạch buổi học và chứng chỉ" />
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
                <div className="font-bold text-slate-900">Kế Hoạch Khóa Học</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Số buổi dự kiến: {cls.plannedLessonCount || 15} buổi
                  {cls.courseStartDate && ` (${cls.courseStartDate} – ${cls.courseEndDate || ''})`}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setIsPlanModalOpen(true)}>
                Chỉnh sửa
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

      {/* Create / Edit Lesson Modal (Section X) */}
      <Modal
        isOpen={isLessonModalOpen}
        onClose={() => setIsLessonModalOpen(false)}
        title={editingLessonId ? 'Chỉnh Sửa Buổi Học' : 'Thêm Buổi Học Mới'}
        subtitle="Mỗi buổi học là một phiên duy nhất: Online hoặc Trực tiếp với một danh sách nhiệm vụ"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveLesson} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Tên Buổi Học <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Buổi 02: Kỹ năng Giải thuật & Lập trình Cơ bản"
              value={lessonFormData.title}
              onChange={e => setLessonFormData({ ...lessonFormData, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Hình Thức Học (Learning Mode) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLessonFormData({ ...lessonFormData, learningMode: 'online' })}
                className={`p-3 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  lessonFormData.learningMode === 'online'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>ONLINE (Trực tuyến)</span>
              </button>

              <button
                type="button"
                onClick={() => setLessonFormData({ ...lessonFormData, learningMode: 'offline' })}
                className={`p-3 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  lessonFormData.learningMode === 'offline'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>TRỰC TIẾP (Tại lớp / Lab)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Ngày Học <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={lessonFormData.scheduledDate}
                onChange={e => setLessonFormData({ ...lessonFormData, scheduledDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Giờ Bắt Đầu <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                required
                value={lessonFormData.startTime}
                onChange={e => setLessonFormData({ ...lessonFormData, startTime: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Giờ Kết Thúc <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                required
                value={lessonFormData.endTime}
                onChange={e => setLessonFormData({ ...lessonFormData, endTime: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Conditional Location / Online Meeting Url */}
          {lessonFormData.learningMode === 'online' ? (
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Link Phòng Học Online (Google Meet, Zoom, Teams...)
              </label>
              <input
                type="url"
                placeholder="https://meet.google.com/xyz-abcd-efg"
                value={lessonFormData.onlineMeetingUrl}
                onChange={e => setLessonFormData({ ...lessonFormData, onlineMeetingUrl: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Địa Điểm / Phòng Học Trực Tiếp <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required={lessonFormData.learningMode === 'offline'}
                placeholder="Ví dụ: Phòng máy 02, Tầng 3 Nhà A"
                value={lessonFormData.location}
                onChange={e => setLessonFormData({ ...lessonFormData, location: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Mô Tả Buổi Học</label>
            <textarea
              rows={2}
              placeholder="Mục đích và nội dung chính của buổi học này..."
              value={lessonFormData.description}
              onChange={e => setLessonFormData({ ...lessonFormData, description: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Mục Tiêu Buổi Học (Mỗi dòng một mục tiêu)
            </label>
            <textarea
              rows={2}
              placeholder="Làm chủ cú pháp điều kiện...&#10;Tự xây dựng ứng dụng mẫu..."
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
                <strong>Khóa tuần tự (Sequential Unlock):</strong> Học sinh phải hoàn thành nhiệm vụ trước mới mở nhiệm vụ tiếp theo.
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsLessonModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit">
              {editingLessonId ? 'Lưu Thay Đổi' : 'Tạo & Soạn Nhiệm Vụ'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Course Plan Modal */}
      <Modal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        title="Chỉnh Sửa Kế Hoạch Khóa Học"
        subtitle="Cập nhật số buổi học dự kiến và thời gian tổ chức khóa"
        maxWidth="md"
      >
        <form onSubmit={handleSaveCoursePlan} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Số Buổi Học Dự Kiến Trong Khóa <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max="100"
              required
              value={planFormData.plannedLessonCount}
              onChange={e => setPlanFormData({ ...planFormData, plannedLessonCount: parseInt(e.target.value) || 1 })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Ngày Bắt Đầu</label>
              <input
                type="date"
                value={planFormData.courseStartDate}
                onChange={e => setPlanFormData({ ...planFormData, courseStartDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Ngày Kết Thúc</label>
              <input
                type="date"
                value={planFormData.courseEndDate}
                onChange={e => setPlanFormData({ ...planFormData, courseEndDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsPlanModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit">Lưu Kế Hoạch</Button>
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
        title="Xóa Buổi Học"
        message={`Bạn có chắc chắn muốn xóa buổi học "${lessonToDelete?.title}" cùng toàn bộ nhiệm vụ và bài nộp liên quan?`}
        confirmText="Xóa Buổi Học"
        isDestructive
      />
    </div>
  );
};
