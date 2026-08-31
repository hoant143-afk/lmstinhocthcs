import { teacherRepo, classRepo, lessonRepo, taskRepo } from '../repositories';
import { Teacher, TeacherLoginDto, TeacherRegisterDto, ClassEntity } from '../types';
import { generateClassCode } from './classService';

export const authService = {
  async getAllTeachers(): Promise<Teacher[]> {
    return teacherRepo.getAll();
  },

  async getCurrentTeacher(): Promise<Teacher | null> {
    return teacherRepo.getCurrentTeacher();
  },

  async loginTeacher(dto: TeacherLoginDto): Promise<Teacher> {
    const emailInput = dto.email.trim().toLowerCase();
    const teachers = await teacherRepo.getAll();

    // Allow lookup by exact email or prefix
    const teacher = teachers.find(
      t => t.email.toLowerCase() === emailInput || t.email.toLowerCase().startsWith(emailInput)
    );

    if (!teacher) {
      throw new Error('Không tìm thấy tài khoản Giáo viên với Email/Tên đăng nhập này.');
    }

    if (dto.password && teacher.password && teacher.password !== dto.password) {
      throw new Error('Mật khẩu không chính xác. Vui lòng kiểm tra lại.');
    }

    await teacherRepo.setCurrentTeacher(teacher);
    return teacher;
  },

  async registerTeacher(dto: TeacherRegisterDto): Promise<Teacher> {
    const fullName = dto.fullName.trim();
    const email = dto.email.trim().toLowerCase();
    const password = dto.password?.trim() || 'password123';

    if (!fullName) {
      throw new Error('Vui lòng nhập Họ và tên giáo viên.');
    }

    if (!email) {
      throw new Error('Vui lòng nhập địa chỉ Email.');
    }

    // Check existing
    const existing = await teacherRepo.getByEmail(email);
    if (existing) {
      throw new Error('Email này đã được sử dụng. Vui lòng đăng nhập hoặc chọn email khác.');
    }

    // Create teacher
    const newTeacher = await teacherRepo.create({
      fullName,
      email,
      password,
      schoolName: dto.schoolName?.trim() || 'Trường THPT & THCS',
      subject: dto.subject?.trim() || 'Tin học & STEM',
      title: dto.title?.trim() || 'Giáo viên bộ môn',
      avatarUrl: dto.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    });

    // Auto provision starter class for this new teacher so their dashboard has rich interactive sample content
    try {
      const subjectName = dto.subject?.trim() || 'Tin học & STEM';
      const classCode = generateClassCode(subjectName.slice(0, 4) || 'BLN');
      const now = new Date().toISOString();

      const starterClass: ClassEntity = await classRepo.create({
        teacherId: newTeacher.id,
        name: `Lớp 10A1 - ${subjectName}`,
        subject: subjectName,
        grade: 'Lớp 10',
        schoolYear: '2025 - 2026',
        description: 'Lớp học thí điểm mô hình Blended: 30% Tự học Online chống tua + 70% Thực hành sáng tạo tại phòng máy/phòng học.',
        classCode,
        certificateEnabled: true,
        scoringEnabled: true,
        onlineRatio: 30,
        offlineRatio: 70
      });

      // Create starter lesson
      const starterLesson = await lessonRepo.create({
        teacherId: newTeacher.id,
        classId: starterClass.id,
        title: 'Bài 1: Khởi động Dự án Sáng tạo Số & Trí tuệ Nhân tạo',
        description: 'Nghiên cứu nguyên lý hoạt động, hoàn thành video tự học và thực hành nhóm trực tiếp tại lớp.',
        objectives: [
          'Hiểu nguyên lý cơ bản của hệ thống thông tin',
          'Hoàn thành bài tập trắc nghiệm tự kiểm tra kiến thức',
          'Nộp liên kết sản phẩm dự án thực hành nhóm'
        ],
        status: 'published',
        order: 1,
        sequentialLock: true,
        scoringEnabled: true
      });

      // Task 1: Video (Online 30%)
      await taskRepo.create({
        lessonId: starterLesson.id,
        title: 'Video Bài Giảng: Tổng quan Kiến thức Trọng tâm',
        description: 'Xem toàn bộ video bài giảng. Chế độ Anti-seek chống tua đang bật.',
        type: 'video',
        phase: 'online',
        required: true,
        order: 1,
        durationMinutes: 10,
        settings: {
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          antiSeekEnabled: true,
          minWatchPercent: 90
        }
      });

      // Task 2: Quiz (Online 30%)
      await taskRepo.create({
        lessonId: starterLesson.id,
        title: 'Trắc nghiệm Nhanh Tự Đánh Giá Kiến Thức',
        description: 'Đạt từ 70% điểm để mở khóa phần bài tập thực hành trên lớp.',
        type: 'quiz',
        phase: 'online',
        required: true,
        order: 2,
        durationMinutes: 5,
        settings: {
          minQuizPassScore: 70,
          quizQuestions: [
            {
              id: 'q1',
              question: 'Mô hình học tập kết hợp (Blended Learning) phân bổ tỷ lệ chuẩn gồm:',
              type: 'multiple_choice',
              options: [
                { id: 'opt_1', text: '30% Tự học Online chuẩn bị trước + 70% Thực hành trực tiếp tại lớp', isCorrect: true },
                { id: 'opt_2', text: '100% Học online không cần gặp giáo viên', isCorrect: false },
                { id: 'opt_3', text: '100% Thuyết giảng lý thuyết truyền thống trên lớp', isCorrect: false }
              ],
              explanation: 'Mô hình Blended 30/70 dành 30% online cho video và trắc nghiệm, 70% cho thực hành nhóm trên lớp.',
              points: 10
            }
          ]
        }
      });

      // Task 3: Assignment (Offline 70%)
      await taskRepo.create({
        lessonId: starterLesson.id,
        title: 'Thực Hành Nhóm: Thiết Kế & Nộp Sản Phẩm Dự Án',
        description: 'Làm việc theo nhóm trên lớp, dán link Google Drive/Canva/GitHub và chờ Thầy cô nghiệm thu.',
        type: 'submission',
        phase: 'offline',
        required: true,
        order: 3,
        durationMinutes: 45,
        settings: {
          maxScore: 10,
          allowUrlSubmission: true,
          allowTextSubmission: true
        }
      });
    } catch (e) {
      console.warn('Could not seed initial starter class for new teacher', e);
    }

    await teacherRepo.setCurrentTeacher(newTeacher);
    return newTeacher;
  },

  async logoutTeacher(): Promise<void> {
    await teacherRepo.setCurrentTeacher(null);
  }
};
