import { announcementRepo } from '../repositories/LocalStorageRepository';
import { Announcement } from '../types';

export const announcementService = {
  async getAnnouncementsForTeacher(teacherId: string): Promise<Announcement[]> {
    return announcementRepo.getByTeacherId(teacherId);
  },

  async getAnnouncementsForClass(classId: string): Promise<Announcement[]> {
    return announcementRepo.getByClassId(classId);
  },

  async getAnnouncementsForStudent(classId: string): Promise<Announcement[]> {
    return announcementRepo.getForStudent(classId);
  },

  async createAnnouncement(data: {
    teacherId: string;
    classId: string;
    title: string;
    content: string;
    isPinned?: boolean;
  }): Promise<Announcement> {
    return announcementRepo.create({
      teacherId: data.teacherId,
      classId: data.classId,
      title: data.title.trim(),
      content: data.content.trim(),
      isPinned: data.isPinned ?? false
    });
  },

  async deleteAnnouncement(id: string): Promise<boolean> {
    return announcementRepo.delete(id);
  }
};
