import { announcementRepo } from '../repositories';
import { Announcement } from '../types';

export function sanitizeGeneralText(text?: string): string {
  if (!text) return '';
  return text
    .replace(/30\s*%\s*(tự\s*học\s*)?(online|trực\s*tuyến)?/gi, '')
    .replace(/70\s*%\s*(thực\s*hành\s*)?(trực\s*tiếp|trên\s*lớp|phòng\s*lab)?/gi, '')
    .replace(/30\s*\/\s*70/gi, '')
    .replace(/\b30\s*%\b/gi, '')
    .replace(/\b70\s*%\b/gi, '')
    .replace(/mô\s*hình\s*blended\s*(learning)?\s*30\/70/gi, '')
    .replace(/mô\s*hình\s*blended\s*learning\s*linh\s*hoạt\s*\(online\s*&\s*trực\s*tiếp\)\.?/gi, '')
    .replace(/mô\s*hình\s*blended\s*learning\s*linh\s*hoạt/gi, '')
    .replace(/tự\s*học\s*online\s*\+\s*thực\s*hành\s*trên\s*lớp/gi, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s\-\–—:,•/]+|[\s\-\–—:,•/]+$/g, '')
    .trim();
}

function cleanAnnouncement(a: Announcement): Announcement {
  return {
    ...a,
    title: sanitizeGeneralText(a.title),
    content: sanitizeGeneralText(a.content)
  };
}

export const announcementService = {
  async getAnnouncementsForTeacher(teacherId: string): Promise<Announcement[]> {
    const list = await announcementRepo.getByTeacherId(teacherId);
    return list.map(cleanAnnouncement);
  },

  async getAnnouncementsForClass(classId: string): Promise<Announcement[]> {
    const list = await announcementRepo.getByClassId(classId);
    return list.map(cleanAnnouncement);
  },

  async getAnnouncementsForStudent(classId: string): Promise<Announcement[]> {
    const list = await announcementRepo.getForStudent(classId);
    return list.map(cleanAnnouncement);
  },

  async createAnnouncement(data: {
    teacherId: string;
    classId: string;
    title: string;
    content: string;
    isPinned?: boolean;
  }): Promise<Announcement> {
    const cleanTitle = sanitizeGeneralText(data.title.trim()) || data.title.trim();
    const cleanContent = sanitizeGeneralText(data.content.trim()) || data.content.trim();
    const created = await announcementRepo.create({
      teacherId: data.teacherId,
      classId: data.classId,
      title: cleanTitle,
      content: cleanContent,
      isPinned: data.isPinned ?? false
    });
    return cleanAnnouncement(created);
  },

  async deleteAnnouncement(id: string): Promise<boolean> {
    return announcementRepo.delete(id);
  }
};

