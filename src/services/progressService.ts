import { progressRepo, lessonRepo, taskRepo, classRepo } from '../repositories';
import { TaskProgress, LessonProgressSummary } from '../types';
import { certificateService } from './certificateService';

export const progressService = {
  /**
   * Centralized Sequential Unlock Rule:
   * canAccessTask(studentId, lessonId, taskId)
   * - If sequentialLock === false: Always accessible.
   * - If sequentialLock === true:
   *     The first task is always unlocked.
   *     Task N is unlocked ONLY if all previous required tasks (order < currentTask.order) have status === 'completed'.
   */
  async canAccessTask(studentId: string, lessonId: string, taskId: string): Promise<{ canAccess: boolean; reason?: string; lockedByTaskTitle?: string }> {
    const lesson = await lessonRepo.getById(lessonId);
    if (!lesson) {
      return { canAccess: false, reason: 'Không tìm thấy bài học.' };
    }

    // If sequentialLock is turned off for this lesson, access is open
    if (!lesson.sequentialLock) {
      return { canAccess: true };
    }

    const tasks = await taskRepo.getByLessonId(lessonId);
    const targetTask = tasks.find(t => t.id === taskId);
    if (!targetTask) {
      return { canAccess: false, reason: 'Không tìm thấy nhiệm vụ.' };
    }

    // First task is always unlocked
    if (targetTask.order === 1 || tasks.findIndex(t => t.id === taskId) === 0) {
      return { canAccess: true };
    }

    // Get all previous tasks that are required
    const previousRequiredTasks = tasks.filter(t => t.order < targetTask.order && t.required);
    if (previousRequiredTasks.length === 0) {
      return { canAccess: true };
    }

    // Fetch progress for this student in this lesson
    const studentProgress = await progressRepo.getByStudentAndLesson(studentId, lessonId);
    const progressMap = new Map<string, TaskProgress>();
    studentProgress.forEach(p => progressMap.set(p.taskId, p));

    for (const prevTask of previousRequiredTasks) {
      const prog = progressMap.get(prevTask.id);
      if (!prog || prog.status !== 'completed') {
        return {
          canAccess: false,
          reason: `Bạn cần hoàn thành nhiệm vụ "${prevTask.title}" trước khi mở khóa nhiệm vụ này.`,
          lockedByTaskTitle: prevTask.title
        };
      }
    }

    return { canAccess: true };
  },

  async getTaskProgress(studentId: string, taskId: string): Promise<TaskProgress | null> {
    return progressRepo.getByStudentAndTask(studentId, taskId);
  },

  async getLessonProgressList(studentId: string, lessonId: string): Promise<TaskProgress[]> {
    return progressRepo.getByStudentAndLesson(studentId, lessonId);
  },

  async getLessonProgressSummary(studentId: string, lessonId: string): Promise<LessonProgressSummary> {
    const tasks = await taskRepo.getByLessonId(lessonId);
    const progressList = await progressRepo.getByStudentAndLesson(studentId, lessonId);
    const progressMap = new Map<string, TaskProgress>();
    progressList.forEach(p => progressMap.set(p.taskId, p));

    const totalTasks = tasks.length;
    const requiredTasks = tasks.filter(t => t.required);
    const totalRequiredTasks = requiredTasks.length;

    let completedTasks = 0;
    let completedRequiredTasks = 0;

    tasks.forEach(t => {
      const p = progressMap.get(t.id);
      if (p && p.status === 'completed') {
        completedTasks++;
        if (t.required) {
          completedRequiredTasks++;
        }
      }
    });

    const percent = totalRequiredTasks > 0
      ? Math.round((completedRequiredTasks / totalRequiredTasks) * 100)
      : totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

    let statusLabel: LessonProgressSummary['statusLabel'] = 'Chưa bắt đầu';
    if (percent === 100) {
      statusLabel = 'Đã hoàn thành';
    } else if (percent > 0) {
      statusLabel = 'Đang học';
    }

    return {
      lessonId,
      studentId,
      totalTasks,
      totalRequiredTasks,
      completedTasks,
      completedRequiredTasks,
      percent,
      isCompleted: percent >= 100 && totalRequiredTasks > 0,
      statusLabel
    };
  },

  async updateTaskProgress(
    studentId: string,
    lessonId: string,
    taskId: string,
    status: TaskProgress['status'],
    percent: number,
    metadata?: TaskProgress['metadata']
  ): Promise<TaskProgress> {
    const now = new Date().toISOString();
    const existing = await progressRepo.getByStudentAndTask(studentId, taskId);
    
    const updated = await progressRepo.upsert({
      studentId,
      lessonId,
      taskId,
      status,
      percent: Math.min(100, Math.max(0, percent)),
      completedAt: status === 'completed' ? (existing?.completedAt || now) : undefined,
      metadata: {
        ...(existing?.metadata || {}),
        ...(metadata || {})
      }
    });

    // Check if whole class certificate is triggered
    if (status === 'completed') {
      const lesson = await lessonRepo.getById(lessonId);
      if (lesson) {
        await certificateService.checkAndIssueCertificate(studentId, lesson.classId);
      }
    }

    return updated;
  },

  async completeTask(studentId: string, lessonId: string, taskId: string, metadata?: TaskProgress['metadata']): Promise<TaskProgress> {
    return this.updateTaskProgress(studentId, lessonId, taskId, 'completed', 100, metadata);
  },

  async confirmTeacherOfflineActivity(
    studentId: string,
    lessonId: string,
    taskId: string,
    teacherId: string
  ): Promise<TaskProgress> {
    const now = new Date().toISOString();
    return this.updateTaskProgress(studentId, lessonId, taskId, 'completed', 100, {
      confirmedByTeacherId: teacherId,
      confirmedAt: now
    });
  },

  async saveQuizResult(
    studentId: string,
    lessonId: string,
    taskId: string,
    score: number,
    maxScore: number,
    minPassScorePercent: number = 70
  ): Promise<{ progress: TaskProgress; passed: boolean; scorePercent: number }> {
    const scorePercent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 100;
    const passed = scorePercent >= minPassScorePercent;
    const status: TaskProgress['status'] = passed ? 'completed' : 'in_progress';
    const percent = passed ? 100 : scorePercent;

    const progress = await this.updateTaskProgress(studentId, lessonId, taskId, status, percent, {
      quizScore: score,
      quizMaxScore: maxScore
    });

    return { progress, passed, scorePercent };
  }
};
