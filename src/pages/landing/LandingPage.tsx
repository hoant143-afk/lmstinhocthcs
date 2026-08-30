import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Layers,
  GraduationCap,
  UserCheck,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Video,
  CheckCircle2,
  Users,
  Award,
  BookOpen,
  Code
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';

export const LandingPage: React.FC = () => {
  const { setRole, teacher } = useAuth();
  const navigate = useNavigate();

  const handleEnterAsTeacher = () => {
    setRole('ROLE_TEACHER');
    if (teacher) {
      navigate('/admin/dashboard');
    } else {
      navigate('/admin/login');
    }
  };

  const handleEnterAsStudent = () => {
    setRole('ROLE_STUDENT');
    navigate('/app');
  };

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24 border-b border-slate-200/70 bg-gradient-to-b from-blue-50/50 via-white to-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/70 border border-blue-200 text-blue-800 text-xs sm:text-sm font-semibold shadow-2xs">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Mô hình Giáo dục Hiện đại: 30% Online – 70% Trực tiếp</span>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              SMART BLENDED <span className="text-blue-600">LMS</span>
            </h1>
            <p className="text-base sm:text-xl text-slate-600 leading-relaxed">
              Giải pháp học tập kết hợp toàn diện cho trường học: Tự học trực tuyến chuẩn hóa với cơ chế
              <span className="font-semibold text-slate-800"> chống tua video thông minh</span>, mở khóa tuần tự và
              <span className="font-semibold text-slate-800"> 70% thời lượng thực hành, dự án thực tế trên lớp</span>.
            </p>
          </div>

          {/* Role CTA Portals */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              size="lg"
              onClick={handleEnterAsTeacher}
              leftIcon={<UserCheck className="w-5 h-5" />}
              rightIcon={<ArrowRight className="w-5 h-5" />}
              className="w-full sm:w-auto text-base shadow-md"
            >
              Vào Bảng Điều Khiển Giáo Viên
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={handleEnterAsStudent}
              leftIcon={<GraduationCap className="w-5 h-5 text-emerald-600" />}
              className="w-full sm:w-auto text-base border-slate-300"
            >
              Vào Bàn Học Sinh / Nhập Mã Lớp
            </Button>
          </div>

          {/* Quick Demo Credentials Info */}
          <div className="pt-6 flex items-center justify-center gap-6 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Dữ liệu mẫu THCS & THPT có sẵn</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>Lưu trữ LocalStorage độc lập</span>
            </div>
          </div>
        </div>
      </section>

      {/* Core Architectural Pillars: 30% Online vs 70% Offline */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Cấu Trúc Khóa Học Chuẩn Sư Phạm Đổi Mới
          </h2>
          <p className="text-slate-500 mt-2 text-sm sm:text-base">
            Tối ưu hóa thời gian tự học và nâng cao hiệu quả tương tác trực tiếp giữa Thầy và Trò.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Phase 30% Online */}
          <div className="bg-white rounded-3xl border border-blue-100 shadow-sm p-6 sm:p-8 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                30%
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Giai đoạn Tự học Online</h3>
                <p className="text-xs text-blue-600 font-semibold">Chuẩn bị bài học tại nhà</p>
              </div>
            </div>

            <ul className="space-y-3.5 text-sm text-slate-600">
              <li className="flex items-start gap-3">
                <div className="p-1 rounded-md bg-blue-50 text-blue-600 mt-0.5 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span>
                  <strong className="text-slate-800">Cơ chế Video Anti-Seek:</strong> Giám sát thời lượng xem thực tế, ngăn tua vượt bài giảng khi chưa học.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="p-1 rounded-md bg-blue-50 text-blue-600 mt-0.5 shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <span>
                  <strong className="text-slate-800">Tài liệu & Học liệu số:</strong> Đọc hiểu các khái niệm nền tảng, bài giảng lý thuyết ngắn gọn.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="p-1 rounded-md bg-blue-50 text-blue-600 mt-0.5 shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span>
                  <strong className="text-slate-800">Mini Quiz & Mở khóa tuần tự:</strong> Hoàn thành bài kiểm tra ngắn để mở khóa nội dung kế tiếp.
                </span>
              </li>
            </ul>
          </div>

          {/* Phase 70% Offline */}
          <div className="bg-white rounded-3xl border border-amber-100 shadow-sm p-6 sm:p-8 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                70%
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Giai đoạn Thực hành Trực tiếp</h3>
                <p className="text-xs text-amber-600 font-semibold">Tương tác thực tế tại phòng Lab / Lớp học</p>
              </div>
            </div>

            <ul className="space-y-3.5 text-sm text-slate-600">
              <li className="flex items-start gap-3">
                <div className="p-1 rounded-md bg-amber-50 text-amber-600 mt-0.5 shrink-0">
                  <Code className="w-4 h-4" />
                </div>
                <span>
                  <strong className="text-slate-800">Thực hành & Dự án nhóm:</strong> Lập trình, thiết kế slide, sản phẩm thực tế kết nối Google Drive, Canva, Github.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="p-1 rounded-md bg-amber-50 text-amber-600 mt-0.5 shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <span>
                  <strong className="text-slate-800">Thảo luận & Báo cáo:</strong> Trình bày trước lớp, nhận phản hồi trực tiếp từ Thầy cô và bạn bè.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="p-1 rounded-md bg-amber-50 text-amber-600 mt-0.5 shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <span>
                  <strong className="text-slate-800">Giáo viên Nghiệm thu & Cấp chứng nhận:</strong> Xác nhận hoàn thành tại chỗ và xuất Giấy chứng nhận số.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Feature Matrix Highlights */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Layers className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800">Kiến Trúc Repository Tách Biệt</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Thiết kế data layer chuẩn abstraction. Dễ dàng cắm Supabase, Firebase hoặc Apps Script API mà không sửa UI.
            </p>
          </Card>

          <Card className="p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800">Mã Lớp Tự Sinh & Độc Lập</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Học sinh tham gia lớp nhanh chóng bằng Họ tên và Mã lớp. Không xung đột dữ liệu giữa các lớp học.
            </p>
          </Card>

          <Card className="p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Award className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800">Chứng Nhận Chuẩn Bản In</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tự động phát hành Giấy chứng nhận hoàn thành khóa học đạt chuẩn in trực tiếp từ trình duyệt.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
};
