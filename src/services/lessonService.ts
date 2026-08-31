import { lessonRepo, taskRepo } from '../repositories';
import { Lesson, LessonStatus } from '../types';

export const lessonService = {
  async getLessonsByClass(classId: string): Promise<Lesson[]> {
    return lessonRepo.getByClassId(classId);
  },

  async getLessonById(id: string): Promise<Lesson | null> {
    return lessonRepo.getById(id);
  },

  async createLesson(data: {
    teacherId: string;
    classId: string;
    title: string;
    description: string;
    objectives: string[];
    coverImage?: string;
    status?: LessonStatus;
    openAt?: string;
    dueAt?: string;
    sequentialLock?: boolean;
    scoringEnabled?: boolean;
  }): Promise<Lesson> {
    const existing = await lessonRepo.getByClassId(data.classId);
    return lessonRepo.create({
      teacherId: data.teacherId,
      classId: data.classId,
      title: data.title.trim(),
      description: data.description.trim(),
      objectives: data.objectives,
      coverImage: data.coverImage || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
      status: data.status || 'draft',
      openAt: data.openAt,
      dueAt: data.dueAt,
      sequentialLock: data.sequentialLock ?? true,
      scoringEnabled: data.scoringEnabled ?? true,
      order: existing.length + 1
    });
  },

  async updateLesson(id: string, data: Partial<Lesson>): Promise<Lesson | null> {
    return lessonRepo.update(id, data);
  },

  async deleteLesson(id: string): Promise<boolean> {
    // Also delete all tasks for this lesson
    const tasks = await taskRepo.getByLessonId(id);
    for (const t of tasks) {
      await taskRepo.delete(t.id);
    }
    return lessonRepo.delete(id);
  },

  async duplicateLesson(lessonId: string, targetClassId?: string): Promise<Lesson | null> {
    return lessonRepo.duplicate(lessonId, targetClassId);
  },

  async saveAsTemplate(lessonId: string): Promise<Lesson | null> {
    return lessonRepo.update(lessonId, { isTemplate: true });
  },

  async getTemplates(teacherId: string): Promise<Lesson[]> {
    return lessonRepo.getTemplatesByTeacher(teacherId);
  }
};
