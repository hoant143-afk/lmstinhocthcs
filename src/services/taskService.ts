import { taskRepo, assignmentRepo } from '../repositories';
import { Task, TaskPhase, TaskType, TaskSettings } from '../types';

export const taskService = {
  async getTasksByLesson(lessonId: string): Promise<Task[]> {
    return taskRepo.getByLessonId(lessonId);
  },

  async getTaskById(id: string): Promise<Task | null> {
    return taskRepo.getById(id);
  },

  async createTask(data: {
    lessonId: string;
    title: string;
    description: string;
    type: TaskType;
    phase: TaskPhase;
    required: boolean;
    settings: TaskSettings;
    order?: number;
  }): Promise<Task> {
    const existing = await taskRepo.getByLessonId(data.lessonId);
    const order = data.order !== undefined ? data.order : existing.length + 1;

    const newTask = await taskRepo.create({
      lessonId: data.lessonId,
      title: data.title.trim(),
      description: data.description.trim(),
      type: data.type,
      phase: data.phase,
      required: data.required,
      order,
      settings: data.settings
    });

    // If it's an assignment task, automatically create a linked assignment record
    if (data.type === 'assignment' || data.type === 'submission') {
      await assignmentRepo.create({
        lessonId: data.lessonId,
        taskId: newTask.id,
        title: data.title,
        instructions: data.description || 'Nộp đường dẫn sản phẩm hoặc bài làm theo yêu cầu.',
        maxScore: data.settings.maxScore || 10,
        allowText: data.settings.allowTextSubmission ?? true,
        allowUrl: data.settings.allowUrlSubmission ?? true
      });
    }

    return newTask;
  },

  async updateTask(id: string, data: Partial<Task>): Promise<Task | null> {
    const updated = await taskRepo.update(id, data);
    if (updated && (updated.type === 'assignment' || updated.type === 'submission')) {
      const existingAssignment = await assignmentRepo.getByTaskId(id);
      if (existingAssignment) {
        await assignmentRepo.update(existingAssignment.id, {
          title: updated.title,
          instructions: updated.description,
          maxScore: updated.settings.maxScore || 10,
          allowText: updated.settings.allowTextSubmission ?? true,
          allowUrl: updated.settings.allowUrlSubmission ?? true
        });
      }
    }
    return updated;
  },

  async deleteTask(id: string): Promise<boolean> {
    const assignment = await assignmentRepo.getByTaskId(id);
    if (assignment) {
      await assignmentRepo.delete(assignment.id);
    }
    return taskRepo.delete(id);
  },

  async reorderTasks(lessonId: string, taskIds: string[]): Promise<boolean> {
    return taskRepo.reorder(lessonId, taskIds);
  }
};
