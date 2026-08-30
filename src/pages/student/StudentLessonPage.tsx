import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { lessonService } from '../../services/lessonService';
import { taskService } from '../../services/taskService';
import { progressService } from '../../services/progressService';
import { submissionService } from '../../services/submissionService';
import { Lesson, Task, TaskProgress, Submission } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { TaskTypeBadge } from '../../components/common/Badge';
import { AntiSeekVideoPlayer } from '../../components/video/AntiSeekVideoPlayer';
import { QuizPlayer } from '../../components/quiz/QuizPlayer';
import { SubmissionForm } from '../../components/submission/SubmissionForm';
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  ChevronRight,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

export const StudentLessonPage: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { studentSession } = useAuth();
  const { toastSuccess, toastWarning } = useToast();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [taskProgressList, setTaskProgressList] = useState<TaskProgress[]>([]);
  const [currentSubmission, setCurrentSubmission] = useState<Submission | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!studentSession) {
      navigate('/app/join');
      return;
    }
    if (lessonId) {
      loadLesson(lessonId);
    }
  }, [lessonId, studentSession]);

  const loadLesson = async (id: string) => {
    if (!studentSession) return;
    setIsLoading(true);
    try {
      const l = await lessonService.getLessonById(id);
      if (!l) {
        toastWarning('Không tìm thấy bài học');
        navigate('/app');
        return;
      }
      setLesson(l);

      const tList = await taskService.getTasksByLesson(id);
      setTasks(tList);

      const pList = await progressService.getLessonProgressList(studentSession.studentId, id);
      setTaskProgressList(pList);

      // Select default task: first unfinished task or first task
      if (tList.length > 0) {
        let defaultTask = tList[0];
        for (const t of tList) {
          const prog = pList.find(p => p.taskId === t.id);
          if (!prog || prog.status !== 'completed') {
            defaultTask = t;
            break;
          }
        }
        setActiveTask(defaultTask);
        loadTaskSubmission(studentSession.studentId, defaultTask.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTaskSubmission = async (studentId: string, taskId: string) => {
    try {
      const sub = await submissionService.getStudentSubmissionForTask(studentId, taskId);
      setCurrentSubmission(sub);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectTask = async (task: Task) => {
    if (!studentSession || !lesson) return;

    // Check lock permission
    const access = await progressService.canAccessTask(studentSession.studentId, lesson.id, task.id);
    if (!access.canAccess) {
      toastWarning(access.reason || 'Bạn cần hoàn thành nhiệm vụ trước theo đúng lộ trình!');
      return;
    }

    setActiveTask(task);
    loadTaskSubmission(studentSession.studentId, task.id);
  };

  // Video Complete Callback
  const handleVideoCompleted = async () => {
    if (!studentSession || !lesson || !activeTask) return;
    try {
      await progressService.completeTask(studentSession.studentId, lesson.id, activeTask.id);
      toastSuccess('Đã hoàn thành xem video bài giảng! Đã mở khóa nhiệm vụ tiếp theo.');
      refreshProgress();
    } catch (err) {
      console.error(err);
    }
  };

  // Quiz Complete Callback
  const handleQuizPassed = async () => {
    refreshProgress();
  };

  // Document Read Complete
  const handleMarkDocumentAsRead = async () => {
    if (!studentSession || !lesson || !activeTask) return;
    await progressService.completeTask(studentSession.studentId, lesson.id, activeTask.id);
    toastSuccess('Đã hoàn thành đọc tài liệu!');
    refreshProgress();
  };

  // Assignment Submitted Callback
  const handleAssignmentSubmitted = async (sub: Submission) => {
    setCurrentSubmission(sub);
    toastSuccess('Nộp bài thành công! Thầy cô sẽ sớm xem và chấm điểm bài của bạn.');
    refreshProgress();
  };

  const refreshProgress = async () => {
    if (!studentSession || !lesson) return;
    const pList = await progressService.getLessonProgressList(studentSession.studentId, lesson.id);
    setTaskProgressList(pList);
  };

  if (isLoading || !lesson || !studentSession) {
    return <div className="p-8 text-center text-slate-500">Đang chuẩn bị phòng học...</div>;
  }

  const activeProgress = taskProgressList.find(p => p.taskId === activeTask?.id);
  const isCurrentTaskCompleted = activeProgress?.status === 'completed';

  return (
    <div className="space-y-6 pb-16">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/app"
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition text-slate-600"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="text-xs font-semibold text-emerald-700">Mô hình Blended LMS 30/70</div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{lesson.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">
            Tiến độ: <strong className="text-slate-800">{taskProgressList.filter(p => p.status === 'completed').length} / {tasks.length} nhiệm vụ</strong>
          </span>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Col (8 cols): Main Content Player Area */}
        <div className="lg:col-span-8 space-y-6">
          {activeTask ? (
            <Card className="p-6 space-y-6 shadow-xs border-slate-200">
              {/* Task Header Details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        activeTask.phase === 'online'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {activeTask.phase === 'online' ? '30% Tự học Online' : '70% Thực hành Trực tiếp'}
                    </span>
                    <TaskTypeBadge type={activeTask.type} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">{activeTask.title}</h2>
                  <p className="text-xs text-slate-500">{activeTask.description}</p>
                </div>

                {isCurrentTaskCompleted && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Đã Hoàn Thành</span>
                  </div>
                )}
              </div>

              {/* Player by Task Type */}
              {activeTask.type === 'video' && (
                <div className="space-y-4">
                  <AntiSeekVideoPlayer
                    studentId={studentSession.studentId}
                    lessonId={lesson.id}
                    taskId={activeTask.id}
                    videoUrl={activeTask.settings.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'}
                    initialVideoProgress={activeProgress?.metadata?.videoProgress}
                    onCompleted={handleVideoCompleted}
                  />
                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Hệ thống áp dụng cơ chế <strong>Anti-Seek (chống tua nhanh)</strong>. Hãy xem tối thiểu 90% thời lượng để mở khóa câu hỏi kế tiếp.</span>
                  </div>
                </div>
              )}

              {activeTask.type === 'quiz' && (
                <div className="space-y-4">
                  <QuizPlayer
                    questions={activeTask.settings.quizQuestions || []}
                    minPassScorePercent={activeTask.settings.minQuizPassScore || 70}
                    studentId={studentSession.studentId}
                    lessonId={lesson.id}
                    taskId={activeTask.id}
                    initialScore={activeProgress?.metadata?.quizScore}
                    initialMaxScore={activeProgress?.metadata?.quizMaxScore}
                    onPassed={handleQuizPassed}
                  />
                </div>
              )}

              {activeTask.type === 'document' && (
                <div className="space-y-6">
                  <div className="prose prose-sm max-w-none p-6 bg-slate-50 rounded-2xl border border-slate-200 text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                    {activeTask.settings.documentContent || activeTask.settings.contentMarkdown || 'Chưa có nội dung tài liệu.'}
                  </div>

                  {!isCurrentTaskCompleted && (
                    <div className="flex justify-end">
                      <Button onClick={handleMarkDocumentAsRead} leftIcon={<CheckCircle2 className="w-4 h-4" />}>
                        Đã Đọc Xong & Đánh Dấu Hoàn Thành
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {(activeTask.type === 'assignment' || activeTask.type === 'submission') && (
                <div className="space-y-6">
                  <SubmissionForm
                    taskId={activeTask.id}
                    lessonId={lesson.id}
                    classId={lesson.classId}
                    studentId={studentSession.studentId}
                    existingSubmission={currentSubmission}
                    onSubmitted={handleAssignmentSubmitted}
                  />
                </div>
              )}

              {activeTask.type === 'teacher_confirmation' && (
                <div className="p-6 rounded-2xl bg-amber-50/60 border border-amber-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">Hoạt Động Nghiệm Thu Trực Tiếp Tại Lớp</h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                    Em hãy chuẩn bị sản phẩm/bài thuyết trình theo nhóm. Thầy cô sẽ trực tiếp kiểm tra sản phẩm tại phòng học và xác nhận hoàn thành trên hệ thống của Thầy cô.
                  </p>
                  {isCurrentTaskCompleted ? (
                    <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      Đã được Thầy cô nghiệm thu đạt chuẩn!
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-amber-800 bg-amber-100/60 px-3 py-1.5 rounded-lg inline-block">
                      Đang chờ Thầy cô xác nhận tại lớp
                    </div>
                  )}
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-8 text-center text-slate-400">
              Chọn một nhiệm vụ từ danh sách bên phải để bắt đầu.
            </Card>
          )}
        </div>

        {/* Right Col (4 cols): Step-by-Step Pathway Playlist */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-5 space-y-4 shadow-xs">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Lộ Trình Nhiệm Vụ</h3>
              <p className="text-xs text-slate-500 mt-0.5">Hoàn thành lần lượt theo thứ tự</p>
            </div>

            <div className="space-y-2.5">
              {tasks.map((t, idx) => {
                const prog = taskProgressList.find(p => p.taskId === t.id);
                const isCompleted = prog?.status === 'completed';
                const isActive = activeTask?.id === t.id;

                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTask(t)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                      isActive
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                        : isCompleted
                        ? 'border-slate-200 bg-white hover:border-slate-300'
                        : 'border-slate-100 bg-slate-50/70 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-500 text-white'
                            : isActive
                            ? 'bg-emerald-700 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                              t.phase === 'online' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {t.phase === 'online' ? '30%' : '70%'}
                          </span>
                          <span className="text-xs font-bold text-slate-800 line-clamp-1">{t.title}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 capitalize">
                          {t.type.replace('_', ' ')}
                        </div>
                      </div>
                    </div>

                    <ChevronRight className={`w-4 h-4 text-slate-400 ${isActive ? 'text-emerald-700 font-bold' : ''}`} />
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
