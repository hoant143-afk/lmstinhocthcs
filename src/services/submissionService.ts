import { submissionRepo, assignmentRepo, studentRepo, lessonRepo, classRepo } from '../repositories/LocalStorageRepository';
import { Submission, SubmissionStatus } from '../types';
import { progressService } from './progressService';

export const submissionService = {
  async getSubmissionsByAssignment(assignmentId: string): Promise<Submission[]> {
    return submissionRepo.getByAssignmentId(assignmentId);
  },

  async getSubmissionsByClass(classId: string): Promise<Submission[]> {
    return submissionRepo.getByClassId(classId);
  },

  async getSubmissionsByLesson(lessonId: string): Promise<Submission[]> {
    return submissionRepo.getByLessonId(lessonId);
  },

  async getStudentSubmissions(studentId: string): Promise<Submission[]> {
    return submissionRepo.getByStudentId(studentId);
  },

  async getStudentSubmissionForTask(studentId: string, taskId: string): Promise<Submission | null> {
    return submissionRepo.getByStudentAndTask(studentId, taskId);
  },

  async submitAssignment(data: {
    assignmentId?: string;
    taskId: string;
    lessonId: string;
    studentId: string;
    classId: string;
    text?: string;
    url?: string;
    maxScore?: number;
  }): Promise<Submission> {
    // Detect URL provider type for nice badge display
    let urlType: Submission['urlType'] = 'other';
    if (data.url) {
      const u = data.url.toLowerCase();
      if (u.includes('drive.google.com')) urlType = 'google_drive';
      else if (u.includes('docs.google.com')) urlType = 'google_docs';
      else if (u.includes('canva.com')) urlType = 'canva';
      else if (u.includes('scratch.mit.edu')) urlType = 'scratch';
      else if (u.includes('github.com')) urlType = 'github';
      else if (u.startsWith('http://') || u.startsWith('https://')) urlType = 'website';
    }

    const assignment = await assignmentRepo.getByTaskId(data.taskId);
    const resolvedAssignmentId = data.assignmentId || assignment?.id || `assign_default_${data.taskId}`;

    const submission = await submissionRepo.create({
      assignmentId: resolvedAssignmentId,
      taskId: data.taskId,
      lessonId: data.lessonId,
      studentId: data.studentId,
      classId: data.classId,
      text: data.text?.trim(),
      url: data.url?.trim(),
      urlType,
      status: 'submitted',
      maxScore: data.maxScore || assignment?.maxScore || 10
    });

    // Mark task as completed for student
    await progressService.completeTask(data.studentId, data.lessonId, data.taskId, {
      submissionId: submission.id,
      studentNotes: data.text
    });

    return submission;
  },

  async gradeSubmission(
    submissionId: string,
    score: number,
    feedback: string,
    teacherId: string
  ): Promise<Submission | null> {
    const updated = await submissionRepo.grade(submissionId, score, feedback, teacherId);
    return updated;
  }
};
