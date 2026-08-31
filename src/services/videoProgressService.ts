import { VideoProgress } from '../types';
import { progressService } from './progressService';

const SEEK_TOLERANCE_SECONDS = 2.5; // Allow small natural jumps / buffer tolerance

export const videoProgressService = {
  /**
   * Evaluates if user seek to targetTime is allowed.
   * If targetTime > maxWatchedTime + SEEK_TOLERANCE:
   *  Disallow seek and enforce return to maxWatchedTime.
   */
  validateSeek(
    maxWatchedTime: number,
    requestedTime: number
  ): { allowed: boolean; fallbackTime: number; message?: string } {
    const allowedCeiling = maxWatchedTime + SEEK_TOLERANCE_SECONDS;
    if (requestedTime > allowedCeiling) {
      return {
        allowed: false,
        fallbackTime: maxWatchedTime,
        message: 'Chức năng chống tua bài học: Bạn cần theo dõi tuần tự video để nắm vững kiến thức trước khi tua tiếp.'
      };
    }
    return {
      allowed: true,
      fallbackTime: requestedTime
    };
  },

  /**
   * Records ongoing playback time and checks completion threshold (>= 90%).
   */
  async updatePlayback(
    studentId: string,
    lessonId: string,
    taskId: string,
    currentTime: number,
    duration: number,
    currentMaxWatched: number
  ): Promise<VideoProgress> {
    const newMaxWatched = Math.max(currentMaxWatched, currentTime);
    const validDuration = duration > 0 ? duration : 1;
    const percent = Math.min(100, Math.round((newMaxWatched / validDuration) * 100));
    const isCompleted = percent >= 90 || newMaxWatched >= validDuration * 0.90;

    const videoProg: VideoProgress = {
      studentId,
      taskId,
      currentTime,
      maxWatchedTime: newMaxWatched,
      duration: validDuration,
      percent,
      completed: isCompleted,
      lastUpdatedAt: new Date().toISOString()
    };

    // Save to task progress
    await progressService.updateTaskProgress(
      studentId,
      lessonId,
      taskId,
      isCompleted ? 'completed' : 'in_progress',
      percent,
      { videoProgress: videoProg }
    );

    return videoProg;
  }
};
