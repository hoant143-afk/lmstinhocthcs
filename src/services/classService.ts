import { classRepo, studentRepo, lessonRepo, progressRepo, teacherRepo } from '../repositories';
import { ClassEntity, Teacher, CourseModeStats } from '../types';

export function generateClassCode(prefix: string = 'LMS'): string {
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5) || 'LMS';
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${cleanPrefix}-${randomNum}`;
}

export interface AvailableClassInfo {
  classEntity: ClassEntity;
  teacher: Teacher | null;
  lessonCount: number;
  studentCount: number;
}

export const classService = {
  async getAllClasses(): Promise<ClassEntity[]> {
    return classRepo.getAll();
  },

  async getAvailableClassesForStudent(): Promise<AvailableClassInfo[]> {
    const classes = await classRepo.getAll();
    const teachers = await teacherRepo.getAll();
    const teacherMap = new Map(teachers.map(t => [t.id, t]));

    const result: AvailableClassInfo[] = [];
    for (const c of classes) {
      const lessons = await lessonRepo.getByClassId(c.id);
      const students = await studentRepo.getByClassId(c.id);
      result.push({
        classEntity: c,
        teacher: teacherMap.get(c.teacherId) || null,
        lessonCount: lessons.length,
        studentCount: students.length
      });
    }
    return result;
  },

  async getTeacherClasses(teacherId: string): Promise<ClassEntity[]> {
    return classRepo.getAllByTeacher(teacherId);
  },

  async getClassById(id: string): Promise<ClassEntity | null> {
    return classRepo.getById(id);
  },

  async findByCode(classCode: string): Promise<ClassEntity | null> {
    return classRepo.getByCode(classCode);
  },

  async createClass(
    teacherId: string,
    data: {
      name: string;
      subject: string;
      grade: string;
      schoolYear: string;
      description: string;
      certificateEnabled?: boolean;
      scoringEnabled?: boolean;
      customCode?: string;
      plannedLessonCount?: number;
      courseStartDate?: string;
      courseEndDate?: string;
    }
  ): Promise<ClassEntity> {
    const classCode = data.customCode?.trim().toUpperCase() || generateClassCode(data.subject.slice(0, 4) || 'LMS');
    
    // Check if code is already used
    const existing = await classRepo.getByCode(classCode);
    const finalCode = existing ? generateClassCode(data.subject.slice(0, 4) || 'LMS') : classCode;

    const payload: any = {
      teacherId,
      name: data.name.trim(),
      subject: data.subject.trim(),
      grade: data.grade.trim(),
      schoolYear: data.schoolYear.trim() || '2025 - 2026',
      description: data.description.trim(),
      classCode: finalCode,
      certificateEnabled: data.certificateEnabled ?? true,
      scoringEnabled: data.scoringEnabled ?? true,
      plannedLessonCount: data.plannedLessonCount || 10,
      onlineRatio: 30, // backward compat
      offlineRatio: 70
    };

    if (data.courseStartDate) payload.courseStartDate = data.courseStartDate;
    if (data.courseEndDate) payload.courseEndDate = data.courseEndDate;

    return classRepo.create(payload);
  },

  async updateClass(id: string, data: Partial<ClassEntity>): Promise<ClassEntity | null> {
    return classRepo.update(id, data);
  },

  async updateCoursePlan(
    id: string,
    plan: { plannedLessonCount?: number; courseStartDate?: string; courseEndDate?: string }
  ): Promise<ClassEntity | null> {
    return classRepo.update(id, plan);
  },

  async regenerateCode(classId: string): Promise<string | null> {
    const cls = await classRepo.getById(classId);
    if (!cls) return null;
    const newCode = generateClassCode(cls.subject.slice(0, 4) || 'LMS');
    await classRepo.update(classId, { classCode: newCode });
    return newCode;
  },

  async deleteClass(id: string): Promise<boolean> {
    return classRepo.delete(id);
  },

  async getLearningModeStats(classId: string): Promise<CourseModeStats> {
    const cls = await classRepo.getById(classId);
    const lessons = await lessonRepo.getByClassId(classId);

    const totalLessons = lessons.length;
    const plannedCount = cls?.plannedLessonCount || totalLessons || 0;

    let onlineCount = 0;
    let offlineCount = 0;
    let unassignedCount = 0;

    for (const l of lessons) {
      if (l.learningMode === 'online') {
        onlineCount++;
      } else if (l.learningMode === 'offline') {
        offlineCount++;
      } else {
        unassignedCount++;
      }
    }

    const scheduledCount = onlineCount + offlineCount;
    const divisor = scheduledCount > 0 ? scheduledCount : totalLessons;
    const onlinePercent = divisor > 0 ? Math.round((onlineCount / divisor) * 1000) / 10 : 0;
    const offlinePercent = divisor > 0 ? Math.round((offlineCount / divisor) * 1000) / 10 : 0;

    return {
      totalLessons,
      scheduledCount,
      plannedCount,
      onlineCount,
      offlineCount,
      unassignedCount,
      onlinePercent,
      offlinePercent
    };
  },

  async getClassStats(classId: string) {
    const students = await studentRepo.getByClassId(classId);
    const lessons = await lessonRepo.getByClassId(classId);
    const allProgress = await progressRepo.getAllByClass(classId);
    const modeStats = await this.getLearningModeStats(classId);

    const activeLessons = lessons.filter(l => l.status === 'active' || l.status === 'published');
    
    // Average completion calculation
    let totalCompletedTasks = 0;
    allProgress.forEach(p => {
      if (p.status === 'completed') totalCompletedTasks++;
    });

    return {
      totalStudents: students.length,
      totalLessons: lessons.length,
      activeLessons: activeLessons.length,
      totalCompletedTasks,
      modeStats
    };
  }
};
