import React, { useState, useEffect } from 'react';
import { announcementService } from '../../services/announcementService';
import { classService } from '../../services/classService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Announcement, ClassEntity } from '../../types';
import { Card, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Bell,
  PlusCircle,
  Trash2,
  Calendar,
  School,
  Megaphone
} from 'lucide-react';

export const AdminAnnouncementsPage: React.FC = () => {
  const { teacher } = useAuth();
  const { toastSuccess, toastError } = useToast();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    classId: ''
  });

  useEffect(() => {
    loadData();
  }, [teacher]);

  const loadData = async () => {
    if (!teacher) return;
    try {
      const [aList, cList] = await Promise.all([
        announcementService.getAnnouncementsForTeacher(teacher.id),
        classService.getTeacherClasses(teacher.id)
      ]);
      setAnnouncements(aList);
      setClasses(cList);
      if (cList.length > 0) {
        setFormData(prev => ({ ...prev, classId: cList[0].id }));
      }
    } catch (err) {
      console.error(err);
      toastError('Lỗi tải thông báo');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher || !formData.title.trim() || !formData.content.trim()) return;

    try {
      await announcementService.createAnnouncement({
        classId: formData.classId,
        teacherId: teacher.id,
        title: formData.title,
        content: formData.content
      });
      toastSuccess('Đã đăng thông báo cho lớp học!');
      setIsModalOpen(false);
      setFormData({ title: '', content: '', classId: classes[0]?.id || '' });
      loadData();
    } catch (err) {
      toastError('Lỗi khi đăng thông báo');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await announcementService.deleteAnnouncement(id);
      toastSuccess('Đã xóa thông báo');
      loadData();
    } catch (err) {
      toastError('Lỗi khi xóa thông báo');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Bản Tin Thông Báo Lớp Học</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gửi thông báo nhắc nhở hạn nộp bài, chuẩn bị dụng cụ thực hành trước buổi học trực tiếp
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} leftIcon={<PlusCircle className="w-4 h-4" />}>
          Tạo Thông Báo Mới
        </Button>
      </div>

      {announcements.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-8 h-8" />}
          title="Chưa có thông báo nào"
          description="Đăng thông báo đầu tiên để nhắc học sinh chuẩn bị bài học 30% tại nhà."
          actionText="Tạo Thông Báo"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="space-y-4">
          {announcements.map(ann => {
            const cls = classes.find(c => c.id === ann.classId);
            return (
              <Card key={ann.id} className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      <Megaphone className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{ann.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span>Gửi tới: <strong className="text-slate-700">{cls?.name || 'Lớp học'}</strong></span>
                        <span>•</span>
                        <span>{new Date(ann.createdAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(ann.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Xóa thông báo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {ann.content}
                </p>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tạo Thông Báo Mới"
        maxWidth="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Gửi Tới Lớp Học <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.classId}
              onChange={e => setFormData({ ...formData, classId: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.grade})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Tiêu Đề Thông Báo <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Nhắc nhở hoàn thành Video lý thuyết trước thứ 5"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Nội Dung Thông Báo <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              required
              placeholder="Chi tiết thông báo, dặn dò học sinh..."
              value={formData.content}
              onChange={e => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit">Đăng Thông Báo</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
