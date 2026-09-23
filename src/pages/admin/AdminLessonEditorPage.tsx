import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { lessonService } from '../../services/lessonService';
import { taskService } from '../../services/taskService';
import { classService } from '../../services/classService';
import { Lesson, Task, TaskPhase, TaskType, QuizQuestion, ClassEntity, LessonLearningMode } from '../../types';
import { Card, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input, Textarea, Select } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Badge, TaskTypeBadge, LearningModeBadge, LessonStatusBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { useToast } from '../../contexts/ToastContext';
import {
  ArrowLeft,
  PlusCircle,
  Video,
  FileText,
  HelpCircle,
  Code,
  Users,
  CheckCircle2,
  Trash2,
  Edit2,
  Lock,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Monitor,
  MapPin,
  Calendar,
  ArrowUp,
  ArrowDown,
  Eye
} from 'lucide-react';

export const AdminLessonEditorPage: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { toastSuccess, toastError, toastWarning } = useToast();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [cls, setCls] = useState<ClassEntity | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Lesson Meta Form State
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDesc, setLessonDesc] = useState('');
  const [learningMode, setLearningMode] = useState<LessonLearningMode>('online');
  const [scheduledDate, setScheduledDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:30');
  const [location, setLocation] = useState('');
  const [onlineMeetingUrl, setOnlineMeetingUrl] = useState('');
  const [sequentialLock, setSequentialLock] = useState(true);
  const [status, setStatus] = useState<Lesson['status']>('scheduled');
  const [objectives, setObjectives] = useState<string[]>([]);
  const [newObjective, setNewObjective] = useState('');

  // Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteTargetTaskId, setDeleteTargetTaskId] = useState<string | null>(null);

  // Task Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('video');
  const [taskRequired, setTaskRequired] = useState(true);
  const [taskDuration, setTaskDuration] = useState(15);
  const [taskPoints, setTaskPoints] = useState(10);

  // Task-specific Settings
  const [videoUrl, setVideoUrl] = useState('');
  const [videoDuration, setVideoDuration] = useState(300);
  const [antiSeekEnabled, setAntiSeekEnabled] = useState(true);
  const [minWatchPercent, setMinWatchPercent] = useState(90);

  const [docContent, setDocContent] = useState('');

  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [minQuizPassScore, setMinQuizPassScore] = useState(70);

  const [submissionType, setSubmissionType] = useState<'url' | 'file' | 'text' | 'all'>('url');
  const [allowedDomains, setAllowedDomains] = useState('drive.google.com, docs.google.com, canva.com, scratch.mit.edu, github.com');

  useEffect(() => {
    if (lessonId) {
      loadLessonData(lessonId);
    }
  }, [lessonId]);

  const loadLessonData = async (id: string) => {
    setIsLoading(true);
    try {
      const l = await lessonService.getLessonById(id);
      if (!l) {
        toastError('Không tìm thấy bài học');
        navigate('/admin/classes');
        return;
      }
      setLesson(l);
      setLessonTitle(l.title);
      setLessonDesc(l.description || '');
      setLearningMode(l.learningMode || 'online');
      setScheduledDate(l.scheduledDate || '');
      setStartTime(l.startTime || '08:00');
      setEndTime(l.endTime || '09:30');
      setLocation(l.location || '');
      setOnlineMeetingUrl(l.onlineMeetingUrl || '');
      setSequentialLock(l.sequentialLock ?? true);
      setStatus(l.status || 'scheduled');
      setObjectives(l.objectives || []);

      const [classData, tList] = await Promise.all([
        classService.getClassById(l.classId),
        taskService.getTasksByLesson(id)
      ]);
      setCls(classData);
      setTasks(tList);
    } catch (err) {
      console.error(err);
      toastError('Lỗi tải dữ liệu bài học');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveLessonMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lesson) return;
    try {
      await lessonService.updateLesson(lesson.id, {
        title: lessonTitle.trim(),
        description: lessonDesc.trim(),
        learningMode,
        scheduledDate,
        startTime,
        endTime,
        location: learningMode === 'offline' ? location : undefined,
        onlineMeetingUrl: learningMode === 'online' ? onlineMeetingUrl : undefined,
        sequentialLock,
        status,
        objectives
      });
      toastSuccess('Đã cập nhật thông tin buổi học');
      loadLessonData(lesson.id);
    } catch (err: any) {
      console.error('[AdminLessonEditor] Error updating lesson:', err);
      toastError(err?.message || 'Lỗi lưu bài học');
    }
  };

  const handleAddObjective = () => {
    if (!newObjective.trim()) return;
    setObjectives([...objectives, newObjective.trim()]);
    setNewObjective('');
  };

  const handleRemoveObjective = (idx: number) => {
    setObjectives(objectives.filter((_, i) => i !== idx));
  };

  const handleOpenCreateTask = () => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskDesc('');
    setTaskType(learningMode === 'online' ? 'video' : 'assignment');
    setTaskRequired(true);
    setTaskDuration(learningMode === 'online' ? 15 : 45);
    setTaskPoints(10);

    setVideoUrl('');
    setVideoDuration(300);
    setAntiSeekEnabled(true);
    setMinWatchPercent(90);
    setDocContent('');
    setQuizQuestions([]);
    setMinQuizPassScore(70);
    setSubmissionType('url');
    setAllowedDomains('drive.google.com, docs.google.com, canva.com, scratch.mit.edu, github.com');

    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description);
    setTaskType(task.type);
    setTaskRequired(task.required);
    setTaskDuration(task.durationMinutes || 15);
    setTaskPoints(task.points || 10);

    setVideoUrl(task.settings?.videoUrl || '');
    setVideoDuration(task.settings?.videoDuration || 300);
    setAntiSeekEnabled(task.settings?.antiSeekEnabled ?? true);
    setMinWatchPercent(task.settings?.minWatchPercent || 90);
    setDocContent(task.settings?.documentContent || task.settings?.contentMarkdown || '');
    setQuizQuestions(task.settings?.quizQuestions || []);
    setMinQuizPassScore(task.settings?.minQuizPassScore || 70);
    setSubmissionType(task.settings?.submissionType || 'url');
    setAllowedDomains(task.settings?.allowedDomains?.join(', ') || 'drive.google.com, docs.google.com, canva.com, scratch.mit.edu, github.com');

    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lesson) return;

    if (!taskTitle.trim()) {
      toastWarning('Vui lòng nhập tên nhiệm vụ');
      return;
    }

    const settingsData: Record<string, any> = {
      maxScore: taskPoints,
      allowUrlSubmission: true,
      allowTextSubmission: true
    };

    if (taskType === 'video') {
      if (videoUrl) settingsData.videoUrl = videoUrl;
      if (videoDuration) {
        settingsData.videoDuration = videoDuration;
        settingsData.videoDurationSeconds = videoDuration;
      }
      settingsData.antiSeekEnabled = antiSeekEnabled;
      settingsData.minWatchPercent = minWatchPercent;
    } else if (taskType === 'document') {
      if (docContent) {
        settingsData.documentContent = docContent;
        settingsData.contentMarkdown = docContent;
      }
    } else if (taskType === 'quiz') {
      if (quizQuestions && quizQuestions.length > 0) {
        settingsData.quizQuestions = quizQuestions;
      }
      settingsData.minQuizPassScore = minQuizPassScore;
    } else if (taskType === 'assignment' || taskType === 'submission') {
      settingsData.submissionType = submissionType;
      const domains = allowedDomains.split(',').map(s => s.trim()).filter(Boolean);
      if (domains.length > 0) {
        settingsData.allowedDomains = domains;
      }
    }

    // Default phase matches the lesson's mode for database backwards compatibility
    const effectivePhase: TaskPhase = (learningMode === 'offline' ? 'offline' : 'online');

    try {
      if (editingTask) {
        await taskService.updateTask(editingTask.id, {
          title: taskTitle.trim(),
          description: taskDesc.trim(),
          type: taskType,
          phase: effectivePhase,
          required: taskRequired,
          durationMinutes: taskDuration,
          points: taskPoints,
          settings: settingsData
        });
        toastSuccess('Đã cập nhật nhiệm vụ');
      } else {
        await taskService.createTask({
          lessonId: lesson.id,
          title: taskTitle.trim(),
          description: taskDesc.trim(),
          type: taskType,
          phase: effectivePhase,
          required: taskRequired,
          settings: settingsData,
          order: tasks.length + 1,
          orderIndex: tasks.length + 1
        });
        toastSuccess('Đã thêm nhiệm vụ mới');
      }

      setIsTaskModalOpen(false);
      loadLessonData(lesson.id);
    } catch (err: any) {
      console.error('[AdminLessonEditor] Error saving task:', err);
      toastError(err?.message || 'Lỗi lưu nhiệm vụ');
    }
  };

  const handleDeleteTask = async () => {
    if (!deleteTargetTaskId || !lesson) return;
    try {
      await taskService.deleteTask(deleteTargetTaskId);
      toastSuccess('Đã xóa nhiệm vụ');
      setDeleteTargetTaskId(null);
      loadLessonData(lesson.id);
    } catch (err) {
      toastError('Lỗi khi xóa nhiệm vụ');
    }
  };

  const handleMoveTask = async (index: number, direction: 'up' | 'down') => {
    if (!lesson) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tasks.length) return;

    const newTasks = [...tasks];
    const temp = newTasks[index];
    newTasks[index] = newTasks[targetIndex];
    newTasks[targetIndex] = temp;

    const taskIds = newTasks.map(t => t.id);
    setTasks(newTasks);
    await taskService.reorderTasks(lesson.id, taskIds);
    toastSuccess('Đã đổi thứ tự nhiệm vụ');
  };

  if (isLoading || !lesson) {
    return <div className="p-8 text-center text-slate-500">Đang tải trình thiết kế buổi học...</div>;
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header & Back Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/admin/classes/${lesson.classId}`}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition text-slate-600"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-slate-500">{cls?.name}</span>
              <span className="text-xs text-slate-300">•</span>
              <LearningModeBadge mode={lesson.learningMode} />
              <LessonStatusBadge status={lesson.status} />
              {lesson.scheduledDate && (
                <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  {lesson.scheduledDate} ({lesson.startTime} - {lesson.endTime})
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{lesson.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/app/lessons/${lesson.id}`)}
            leftIcon={<Eye className="w-4 h-4 text-blue-600" />}
          >
            Xem Giao Diện Học Sinh
          </Button>
        </div>
      </div>

      {/* Lesson Settings Form */}
      <Card className="p-6">
        <CardHeader
          title="Thông Tin & Lịch Trình Buổi Học"
          subtitle="Mỗi buổi học là một phiên duy nhất: Online hoặc Trực tiếp"
        />

        <form onSubmit={handleSaveLessonMeta} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Tên Buổi Học"
              required
              value={lessonTitle}
              onChange={e => setLessonTitle(e.target.value)}
            />
            <Input
              label="Mô Tả Ngắn / Hướng Dẫn"
              value={lessonDesc}
              onChange={e => setLessonDesc(e.target.value)}
            />
          </div>

          {/* Mode selector */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
              Hình Thức Học Của Buổi Này <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
              <button
                type="button"
                onClick={() => setLearningMode('online')}
                className={`p-3 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  learningMode === 'online'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>ONLINE (Trực tuyến)</span>
              </button>

              <button
                type="button"
                onClick={() => setLearningMode('offline')}
                className={`p-3 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  learningMode === 'offline'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>TRỰC TIẾP (Tại phòng Lab)</span>
              </button>
            </div>
          </div>

          {/* Schedule Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Ngày Học</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Giờ Bắt Đầu</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Giờ Kết Thúc</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Conditional Location / Online Meeting Url */}
          {learningMode === 'online' ? (
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Link Phòng Học Online (Google Meet, Zoom, Teams...)
              </label>
              <input
                type="url"
                placeholder="https://meet.google.com/abc-defg-hij"
                value={onlineMeetingUrl}
                onChange={e => setOnlineMeetingUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Địa Điểm / Phòng Học Trực Tiếp
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Phòng thực hành Tin học 01"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
              />
            </div>
          )}

          {/* Sequential Lock Toggle */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">Bật Chế Độ Mở Khóa Tuần Tự (Sequential Lock)</div>
                <div className="text-xs text-slate-500 leading-relaxed">
                  Học sinh bắt buộc phải hoàn thành lần lượt từng nhiệm vụ trước khi mở khóa nhiệm vụ tiếp theo.
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={sequentialLock}
                onChange={e => setSequentialLock(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Objectives List */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
              Mục Tiêu Buổi Học (Objectives)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Thêm mục tiêu cần đạt được..."
                value={newObjective}
                onChange={e => setNewObjective(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddObjective();
                  }
                }}
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
              />
              <Button type="button" variant="outline" onClick={handleAddObjective}>
                Thêm
              </Button>
            </div>

            {objectives.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {objectives.map((obj, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{obj}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveObjective(i)}
                      className="ml-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit">Lưu Cấu Hình Buổi Học</Button>
          </div>
        </form>
      </Card>

      {/* Single Unified Task List (Section X) */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Danh Sách Nhiệm Vụ ({tasks.length})
              </h2>
              <LearningModeBadge mode={lesson.learningMode} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tất cả nhiệm vụ được hoàn thành theo thứ tự tuần tự trong buổi học này
            </p>
          </div>

          <Button
            onClick={handleOpenCreateTask}
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            + Thêm Nhiệm Vụ
          </Button>
        </div>

        {tasks.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="w-8 h-8" />}
            title="Chưa có nhiệm vụ nào"
            description="Hãy thêm video, tài liệu, mini quiz hoặc bài tập thực hành cho buổi học này."
            actionText="+ Thêm Nhiệm Vụ Đầu Tiên"
            onAction={handleOpenCreateTask}
          />
        ) : (
          <div className="space-y-3">
            {tasks.map((t, idx) => (
              <div
                key={t.id}
                className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-400 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="flex items-start gap-3.5">
                  {/* Reorder arrows and index pill */}
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="flex flex-col items-center">
                      <button
                        disabled={idx === 0}
                        onClick={() => handleMoveTask(idx, 'up')}
                        className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                        title="Lên"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        disabled={idx === tasks.length - 1}
                        onClick={() => handleMoveTask(idx, 'down')}
                        className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                        title="Xuống"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs border border-blue-100">
                      {idx + 1}
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <TaskTypeBadge type={t.type} />
                      {t.required && (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                          Bắt buộc
                        </span>
                      )}
                      {t.durationMinutes && (
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {t.durationMinutes} phút
                        </span>
                      )}
                      {t.points && (
                        <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                          {t.points} điểm
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm mt-1">{t.title}</h4>
                    {t.description && (
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{t.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => handleOpenEditTask(t)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                    title="Chỉnh sửa"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTargetTaskId(t.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="Xóa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Task Creation & Edit Modal */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title={editingTask ? 'Chỉnh Sửa Nhiệm Vụ' : 'Thêm Nhiệm Vụ Mới'}
        subtitle={`Buổi học: ${lesson.title} (${learningMode === 'online' ? 'Online' : 'Trực tiếp'})`}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveTask} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Loại Nhiệm Vụ"
              value={taskType}
              onChange={e => setTaskType(e.target.value as TaskType)}
              options={[
                { value: 'video', label: '🎬 Video Bài Giảng (Có Chống Tua)' },
                { value: 'document', label: '📄 Tài Liệu Đọc / Bài Viết' },
                { value: 'quiz', label: '❓ Trắc Nghiệm Nhanh (Mini Quiz)' },
                { value: 'assignment', label: '💻 Bài Tập Thực Hành / Nộp Link' },
                { value: 'teacher_confirmation', label: '🏆 Nghiệm Thu Trực Tiếp Tại Lớp' }
              ]}
            />

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Thời Lượng (phút)"
                type="number"
                min="1"
                value={taskDuration}
                onChange={e => setTaskDuration(parseInt(e.target.value) || 15)}
              />
              <Input
                label="Điểm Thưởng"
                type="number"
                min="0"
                value={taskPoints}
                onChange={e => setTaskPoints(parseInt(e.target.value) || 10)}
              />
            </div>
          </div>

          <Input
            label="Tiêu Đề Nhiệm Vụ"
            required
            placeholder="Ví dụ: Xem Video Giới Thiệu Cấu Trúc Lặp"
            value={taskTitle}
            onChange={e => setTaskTitle(e.target.value)}
          />

          <Textarea
            label="Mô Tả / Hướng Dẫn Thực Hiện"
            rows={2}
            placeholder="Ghi chú chi tiết cho học sinh..."
            value={taskDesc}
            onChange={e => setTaskDesc(e.target.value)}
          />

          {/* Conditional Sub-settings by Type */}
          {taskType === 'video' && (
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-4">
              <div className="font-bold text-xs text-blue-900 uppercase">Cấu Hình Video & Chống Tua</div>
              <Input
                label="Đường Dẫn Video (Hỗ trợ YouTube, Google Drive, Vimeo, hoặc file MP4)"
                placeholder="https://www.youtube.com/watch?v=... hoặc https://drive.google.com/file/d/... hoặc MP4"
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
              />
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>Gợi ý nguồn mẫu:</span>
                <button
                  type="button"
                  onClick={() => setVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4')}
                  className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 hover:bg-blue-200 font-semibold cursor-pointer"
                >
                  Video MP4 Chuẩn
                </button>
                <button
                  type="button"
                  onClick={() => setVideoUrl('https://vjs.zencdn.net/v/oceans.mp4')}
                  className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 hover:bg-blue-200 font-semibold cursor-pointer"
                >
                  Video CDN Dự Phòng
                </button>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Kích hoạt chặn tua vượt quá thời gian đã xem:</span>
                <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Bật (≥90%)</span>
              </div>
            </div>
          )}

          {taskType === 'document' && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="block text-xs font-bold uppercase text-slate-600">Nội Dung Tài Liệu (Hỗ trợ Markdown)</label>
              <textarea
                rows={6}
                placeholder="# Tiêu đề tài liệu\n\nNội dung chi tiết bài học..."
                value={docContent}
                onChange={e => setDocContent(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono focus:border-blue-500 outline-none"
              />
            </div>
          )}

          {taskType === 'quiz' && (
            <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-xs text-purple-900 uppercase">
                  Câu Hỏi Trắc Nghiệm ({quizQuestions.length} câu)
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const newQ: QuizQuestion = {
                      id: `q_${Date.now()}`,
                      question: 'Câu hỏi mới?',
                      type: 'multiple_choice',
                      options: [
                        { id: 'opt_1', text: 'Đáp án A', isCorrect: true },
                        { id: 'opt_2', text: 'Đáp án B', isCorrect: false },
                        { id: 'opt_3', text: 'Đáp án C', isCorrect: false },
                        { id: 'opt_4', text: 'Đáp án D', isCorrect: false }
                      ],
                      points: 10
                    };
                    setQuizQuestions([...quizQuestions, newQ]);
                  }}
                >
                  + Thêm Câu Hỏi
                </Button>
              </div>

              {quizQuestions.map((q, qIndex) => (
                <div key={q.id} className="p-3 bg-white rounded-xl border border-purple-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={q.question}
                      onChange={e => {
                        const updated = [...quizQuestions];
                        updated[qIndex].question = e.target.value;
                        setQuizQuestions(updated);
                      }}
                      className="font-bold text-slate-800 w-full p-1 border-b outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setQuizQuestions(quizQuestions.filter((_, i) => i !== qIndex))}
                      className="text-rose-500 hover:text-rose-700 ml-2 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1 pl-2">
                    {q.options?.map((opt, optIndex) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct_${q.id}`}
                          checked={opt.isCorrect}
                          onChange={() => {
                            const updated = [...quizQuestions];
                            updated[qIndex].options = updated[qIndex].options?.map((o, idx) => ({
                              ...o,
                              isCorrect: idx === optIndex
                            }));
                            setQuizQuestions(updated);
                          }}
                        />
                        <input
                          type="text"
                          value={opt.text}
                          onChange={e => {
                            const updated = [...quizQuestions];
                            if (updated[qIndex].options) {
                              updated[qIndex].options![optIndex].text = e.target.value;
                              setQuizQuestions(updated);
                            }
                          }}
                          className="flex-1 p-1 rounded border border-slate-100 outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {taskType === 'assignment' && (
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
              <div className="font-bold text-xs text-amber-900 uppercase">Cấu Hình Nộp Bài Thực Hành</div>
              <Input
                label="Tên Miền Cho Phép (Phân tách bằng dấu phẩy)"
                value={allowedDomains}
                onChange={e => setAllowedDomains(e.target.value)}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsTaskModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit">Lưu Nhiệm Vụ</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTargetTaskId}
        onClose={() => setDeleteTargetTaskId(null)}
        onConfirm={handleDeleteTask}
        title="Xóa Nhiệm Vụ"
        message="Bạn có chắc chắn muốn xóa nhiệm vụ này? Hành động này không thể hoàn tác."
        confirmText="Xóa Ngay"
        isDestructive
      />
    </div>
  );
};
