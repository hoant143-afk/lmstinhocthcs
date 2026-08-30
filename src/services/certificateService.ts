import { certificateRepo, classRepo, lessonRepo, studentRepo, teacherRepo, progressRepo, taskRepo } from '../repositories/LocalStorageRepository';
import { Certificate } from '../types';

export const certificateService = {
  async getStudentCertificates(studentId: string): Promise<Certificate[]> {
    return certificateRepo.getByStudentId(studentId);
  },

  async getCertificateById(id: string): Promise<Certificate | null> {
    return certificateRepo.getById(id);
  },

  /**
   * Evaluates if student has finished required lessons in class and creates a certificate if class has certificateEnabled
   */
  async checkAndIssueCertificate(studentId: string, classId: string): Promise<Certificate | null> {
    const cls = await classRepo.getById(classId);
    if (!cls || !cls.certificateEnabled) return null;

    // Check if already issued
    const existingCerts = await certificateRepo.getByStudentId(studentId);
    const hasClassCert = existingCerts.find(c => c.classId === classId);
    if (hasClassCert) return hasClassCert;

    const lessons = await lessonRepo.getByClassId(classId);
    if (lessons.length === 0) return null;

    // Check completion of all active lessons in class
    let allLessonsCompleted = true;
    for (const l of lessons) {
      const tasks = await taskRepo.getByLessonId(l.id);
      const reqTasks = tasks.filter(t => t.required);
      if (reqTasks.length === 0) continue;

      const progressList = await progressRepo.getByStudentAndLesson(studentId, l.id);
      const completedCount = progressList.filter(p => p.status === 'completed' && reqTasks.some(rt => rt.id === p.taskId)).length;

      if (completedCount < reqTasks.length) {
        allLessonsCompleted = false;
        break;
      }
    }

    if (!allLessonsCompleted) return null;

    const student = await studentRepo.getById(studentId);
    const teacher = await teacherRepo.getCurrentTeacher();
    if (!student) return null;

    const certCode = `CERT-${cls.subject.slice(0, 3).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date().toISOString();

    const newCert = await certificateRepo.create({
      studentId: student.id,
      studentName: student.fullName,
      classId: cls.id,
      teacherId: cls.teacherId,
      teacherName: teacher.fullName,
      courseName: cls.name,
      grade: cls.grade,
      completionRate: 100,
      completedAt: now,
      certificateCode: certCode
    });

    return newCert;
  }
};
