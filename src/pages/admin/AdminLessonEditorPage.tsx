import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { lessonService } from '../../services/lessonService';
import { taskService } from '../../services/taskService';
import { classService } from '../../services/classService';
import { Lesson, Task, TaskPhase, TaskType, QuizQuestion, QuizOption, ClassEntity } from '../../types';
import { Card, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input, Textarea, Select } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Badge, TaskTypeBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { useToast } from '../../contexts/ToastContext';
import {
  ArrowLeft,
  PlusCircle,
  GripVertical,
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
  ChevronUp
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
  const [sequentialLock, setSequentialLock] = useState(true);
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
  const [taskPhase, setTaskPhase] = useState<TaskPhase>('online');
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
      setLessonDesc(l.description);
      setSequentialLock(l.sequentialLock);
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
        title: lessonTitle,
        description: lessonDesc,
        sequentialLock,
        objectives
      });
      toastSuccess('Đã cập nhật thông tin bài học');
    } catch (err) {
      toastError('Lỗi lưu bài học');
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

  const handleOpenCreateTask = (phase: TaskPhase = 'online') => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskDesc('');
    setTaskPhase(phase);
    setTaskType(phase === 'online' ? 'video' : 'assignment');
    setTaskRequired(true);
    setTaskDuration(phase === 'online' ? 15 : 45);
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
    setTaskPhase(task.phase);
    setTaskRequired(task.required);
    setTaskDuration(task.durationMinutes || 15);
    setTaskPoints(task.points || 10);

    setVideoUrl(task.settings.videoUrl || '');
    setVideoDuration(task.settings.videoDuration || 300);
    setAntiSeekEnabled(task.settings.antiSeekEnabled ?? true);
    setMinWatchPercent(task.settings.minWatchPercent || 90);
    setDocContent(task.settings.documentContent || task.settings.contentMarkdown || '');
    setQuizQuestions(task.settings.quizQuestions || []);
    setMinQuizPassScore(task.settings.minQuizPassScore || 70);
    setSubmissionType(task.settings.submissionType || 'url');
    setAllowedDomains(task.settings.allowedDomains?.join(', ') || 'drive.google.com, docs.google.com, canva.com, scratch.mit.edu, github.com');

    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lesson) return;

    if (!taskTitle.trim()) {
      toastWarning('Vui lòng nhập tên nhiệm vụ');
      return;
    }

    const settingsData = {
      videoUrl: taskType === 'video' ? videoUrl : undefined,
      videoDuration: taskType === 'video' ? videoDuration : undefined,
      videoDurationSeconds: taskType === 'video' ? videoDuration : undefined,
      antiSeekEnabled: taskType === 'video' ? antiSeekEnabled : undefined,
      minWatchPercent: taskType === 'video' ? minWatchPercent : undefined,
      documentContent: taskType === 'document' ? docContent : undefined,
      contentMarkdown: taskType === 'document' ? docContent : undefined,
      quizQuestions: taskType === 'quiz' ? quizQuestions : undefined,
      minQuizPassScore: taskType === 'quiz' ? minQuizPassScore : undefined,
      submissionType: (taskType === 'assignment' || taskType === 'submission') ? submissionType : undefined,
      allowedDomains: (taskType === 'assignment' || taskType === 'submission')
        ? allowedDomains.split(',').map(s => s.trim()).filter(Boolean)
        : undefined,
      maxScore: taskPoints,
      allowUrlSubmission: true,
      allowTextSubmission: true
    };

    try {
      if (editingTask) {
        await taskService.updateTask(editingTask.id, {
          title: taskTitle,
          description: taskDesc,
          type: taskType,
          phase: taskPhase,
          required: taskRequired,
          durationMinutes: taskDuration,
          points: taskPoints,
          settings: settingsData
        });
        toastSuccess('Đã cập nhật nhiệm vụ');
      } else {
        await taskService.createTask({
          lessonId: lesson.id,
          title: taskTitle,
          description: taskDesc,
          type: taskType,
          phase: taskPhase,
          required: taskRequired,
          settings: settingsData,
          order: tasks.length + 1
        });
        toastSuccess('Đã thêm nhiệm vụ mới');
      }

      setIsTaskModalOpen(false);
      loadLessonData(lesson.id);
    } catch (err) {
      toastError('Lỗi lưu nhiệm vụ');
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
  };

  if (isLoading || !lesson) {
    return <div className="p-8 text-center text-slate-500">Đang tải trình thiết kế bài học...</div>;
  }

  const onlineTasks = tasks.filter(t => t.phase === 'online');
  const offlineTasks = tasks.filter(t => t.phase === 'offline');

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
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">{cls?.name}</span>
              <span className="text-xs text-slate-300">•</span>
              <Badge variant="blue">Mô hình 30/70</Badge>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{lesson.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/app/lesson/${lesson.id}`)}
            leftIcon={<ExternalLink className="w-4 h-4" />}
          >
            Xem Với Tư Cách Học Sinh
          </Button>
        </div>
      </div>

      {/* Lesson Settings Form */}
      <Card className="p-6">
        <CardHeader
          title="Cấu Hình Bài Học & Khóa Tuần Tự"
          subtitle="Quy tắc mở khóa nội dung 30% Online trước khi chuyển sang 70% Thực hành"
        />

        <form onSubmit={handleSaveLessonMeta} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Tên Bài Học"
              required
              value={lessonTitle}
              onChange={e => setLessonTitle(e.target.value)}
            />
            <Input
              label="Mô Tả Ngắn / Hướng Dẫn Chung"
              value={lessonDesc}
              onChange={e => setLessonDesc(e.target.value)}
            />
          </div>

          {/* Sequential Lock Toggle */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">Bật Chế Độ Mở Khóa Tuần Tự (Sequential Lock)</div>
                <div className="text-xs text-slate-500 leading-relaxed">
                  Học sinh bắt buộc phải xem xong video chống tua & vượt qua mini quiz trước khi mở khóa bài tập thực hành trên lớp.
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
              Mục Tiêu Bài Học (Objectives)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ví dụ: Hiểu cú pháp vòng lặp for và while trong Python"
                value={newObjective}
                onChange={e => setNewObjective(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddObjective(); } }}
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
              />
              <Button type="button" variant="outline" onClick={handleAddObjective}>
                Thêm Mục Tiêu
              </Button>
            </div>

            {objectives.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
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
                      className="ml-1 text-slate-400 hover:text-rose-600"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit">Lưu Cấu Hình</Button>
          </div>
        </form>
      </Card>

      {/* Two Column Blended Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: 30% Online Phase */}
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-blue-50 p-4 rounded-2xl border border-blue-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                  30%
                </span>
                <h3 className="font-bold text-slate-900 text-base">Giai Đoạn 1: Tự Học Online</h3>
              </div>
              <p className="text-xs text-blue-800 mt-0.5">Video chống tua, tài liệu lý thuyết, trắc nghiệm nhanh</p>
            </div>

            <Button
              size="sm"
              onClick={() => handleOpenCreateTask('online')}
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              Thêm Nhiệm Vụ
            </Button>
          </div>

          {onlineTasks.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs">
              Chưa có nhiệm vụ online nào. Nhấn "+ Thêm Nhiệm Vụ" để tạo video hoặc trắc nghiệm.
            </div>
          ) : (
            <div className="space-y-3">
              {onlineTasks.map((t, idx) => (
                <Card key={t.id} className="p-4 flex items-center justify-between gap-3 group hover:border-blue-400 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <TaskTypeBadge type={t.type} />
                        {t.required && (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                            Bắt buộc
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">{t.title}</h4>
                      <p className="text-xs text-slate-500 line-clamp-1">{t.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditTask(t)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                      title="Chỉnh sửa"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTargetTaskId(t.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: 70% Offline Phase */}
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-amber-50 p-4 rounded-2xl border border-amber-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-500 text-white text-xs font-black flex items-center justify-center">
                  70%
                </span>
                <h3 className="font-bold text-slate-900 text-base">Giai Đoạn 2: Thực Hành Trực Tiếp</h3>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">Dự án nhóm, bài tập phòng Lab, nghiệm thu tại lớp</p>
            </div>

            <Button
              size="sm"
              variant="amber"
              onClick={() => handleOpenCreateTask('offline')}
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              Thêm Hoạt Động
            </Button>
          </div>

          {offlineTasks.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs">
              Chưa có hoạt động thực hành nào. Nhấn "+ Thêm Hoạt Động" để tạo bài thực hành phòng Lab.
            </div>
          ) : (
            <div className="space-y-3">
              {offlineTasks.map((t, idx) => (
                <Card key={t.id} className="p-4 flex items-center justify-between gap-3 group hover:border-amber-400 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <TaskTypeBadge type={t.type} />
                        {t.required && (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                            Bắt buộc
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">{t.title}</h4>
                      <p className="text-xs text-slate-500 line-clamp-1">{t.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditTask(t)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                      title="Chỉnh sửa"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTargetTaskId(t.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Task Creation & Edit Modal */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title={editingTask ? 'Chỉnh Sửa Nhiệm Vụ' : 'Thêm Nhiệm Vụ Mới'}
        subtitle={`Giai đoạn: ${taskPhase === 'online' ? '30% Tự học Online' : '70% Thực hành Trực tiếp'}`}
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
                { value: 'assignment', label: '💻 Bài Tập Thực Hành / Nộp Link Drive' },
                { value: 'teacher_confirmation', label: '🏆 Nghiệm Thu Trực Tiếp Tại Lớp' }
              ]}
            />

            <Select
              label="Giai Đoạn"
              value={taskPhase}
              onChange={e => setTaskPhase(e.target.value as TaskPhase)}
              options={[
                { value: 'online', label: '30% Tự Học Online' },
                { value: 'offline', label: '70% Thực Hành Trực Tiếp' }
              ]}
            />
          </div>

          <Input
            label="Tiêu Đề Nhiệm Vụ"
            required
            placeholder="Ví dụ: Xem Video Giới Thiệu Cấu Trúc Rẽ Nhánh"
            value={taskTitle}
            onChange={e => setTaskTitle(e.target.value)}
          />

          <Textarea
            label="Mô Tả / Hướng Dẫn Thực Hiện"
            rows={3}
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
                      className="text-rose-500 hover:text-rose-700 ml-2"
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
