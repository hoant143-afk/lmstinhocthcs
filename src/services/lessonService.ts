import { lessonRepo, taskRepo } from '../repositories';
import { Lesson, LessonStatus, LessonLearningMode } from '../types';

export const lessonService = {
  async getLessonsByClass(classId: string): Promise<Lesson[]> {
    const list = await lessonRepo.getByClassId(classId);
    return list.sort((a, b) => {
      // Sort by orderIndex / order, or scheduledDate
      if (a.orderIndex !== undefined && b.orderIndex !== undefined) {
        return a.orderIndex - b.orderIndex;
      }
      if (a.scheduledDate && b.scheduledDate && a.scheduledDate !== b.scheduledDate) {
        return a.scheduledDate.localeCompare(b.scheduledDate);
      }
      return (a.order || 0) - (b.order || 0);
    });
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
    learningMode?: LessonLearningMode | null;
    scheduledDate?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    onlineMeetingUrl?: string;
    orderIndex?: number;
    openAt?: string;
    dueAt?: string;
    sequentialLock?: boolean;
    scoringEnabled?: boolean;
  }): Promise<Lesson> {
    const existing = await lessonRepo.getByClassId(data.classId);
    const order = data.orderIndex !== undefined ? data.orderIndex : existing.length + 1;
    const lessonPayload: any = {
      teacherId: data.teacherId,
      classId: data.classId,
      title: data.title.trim(),
      description: data.description.trim(),
      objectives: data.objectives,
      coverImage: data.coverImage || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
      status: data.status || 'scheduled',
      learningMode: data.learningMode || 'online',
      sequentialLock: data.sequentialLock ?? true,
      scoringEnabled: data.scoringEnabled ?? true,
      order,
      orderIndex: order
    };

    if (data.scheduledDate) lessonPayload.scheduledDate = data.scheduledDate;
    if (data.startTime) lessonPayload.startTime = data.startTime;
    if (data.endTime) lessonPayload.endTime = data.endTime;
    if (data.location) lessonPayload.location = data.location;
    if (data.onlineMeetingUrl) lessonPayload.onlineMeetingUrl = data.onlineMeetingUrl;
    if (data.openAt) lessonPayload.openAt = data.openAt;
    if (data.dueAt) lessonPayload.dueAt = data.dueAt;

    return lessonRepo.create(lessonPayload);
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
  },

  async reorderLessons(classId: string, lessonIds: string[]): Promise<boolean> {
    for (let i = 0; i < lessonIds.length; i++) {
      await lessonRepo.update(lessonIds[i], { order: i + 1, orderIndex: i + 1 });
    }
    return true;
  },

  async getSchedule(classId: string): Promise<Lesson[]> {
    return this.getLessonsByClass(classId);
  }
};
