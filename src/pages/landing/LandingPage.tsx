import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  GraduationCap,
  UserCheck,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { Button } from '../../components/common/Button';

export const LandingPage: React.FC = () => {
  const { setRole, teacher, studentSession, isAuthenticatedStudent } = useAuth();
  const navigate = useNavigate();

  const handleEnterAsTeacher = () => {
    setRole('ROLE_TEACHER');
    if (teacher) {
      navigate('/admin/dashboard');
    } else {
      navigate('/admin/login');
    }
  };

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-10 pb-16 lg:pt-16 lg:pb-20 border-b border-slate-200/70 bg-gradient-to-b from-blue-50/50 via-white to-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              SMART BLENDED <span className="text-blue-600">LMS</span>
            </h1>
          </div>

          {/* Direct Student Join Box & Fast Portals Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-5xl mx-auto">
            {/* Student Fast Entry Card (Left 7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-emerald-200/80 shadow-md p-6 sm:p-7 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <GraduationCap className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Cổng Học Tập Dành Cho Học Sinh</h2>
                    <p className="text-xs text-slate-500">Đăng nhập tài khoản cá nhân & tham gia lớp bằng mã lớp</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                  Học sinh
                </span>
              </div>

              {isAuthenticatedStudent ? (
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Đang đăng nhập: {studentSession?.fullName}</span>
                    </div>
                    <p className="text-xs text-emerald-700">
                      Tài khoản: <strong>{studentSession?.email}</strong>. Bạn đã sẵn sàng tham gia bài học hoặc thêm lớp học mới.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                    <Button
                      onClick={() => navigate('/app')}
                      variant="success"
                      size="lg"
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                      className="w-full sm:flex-1 text-sm font-bold shadow-sm"
                    >
                      Vào Bàn Học Của Tôi
                    </Button>
                    <Button
                      onClick={() => navigate('/app/profile')}
                      variant="outline"
                      size="lg"
                      className="w-full sm:w-auto text-sm border-slate-300 text-slate-700"
                    >
                      Xem Hồ sơ
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Học sinh sử dụng <strong>Email & Mật khẩu</strong> để đăng nhập một lần, tham gia nhiều lớp học bằng Mã lớp học (Class Code) mà <strong>không cần nhập lại họ tên</strong>.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <Button
                      onClick={() => navigate('/app/login')}
                      variant="success"
                      size="lg"
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                      className="w-full text-sm font-bold shadow-sm"
                    >
                      Đăng nhập học sinh
                    </Button>

                    <Button
                      onClick={() => navigate('/app/register')}
                      variant="outline"
                      size="lg"
                      className="w-full text-sm font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    >
                      Đăng ký tài khoản mới
                    </Button>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Không cần nhập lại họ tên mỗi lần vào học</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Tham gia nhiều lớp học, theo dõi tiến độ và chứng nhận trọn đời</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Teacher Fast Entry Portal (Right 5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-3xl border border-blue-200/80 shadow-md p-6 sm:p-7 space-y-5">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                    <UserCheck className="w-5 h-5 text-blue-700" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Cổng Quản Trị Giáo Viên</h2>
                    <p className="text-xs text-slate-500">Tạo lớp, soạn bài giảng, chấm điểm thực hành</p>
                  </div>
                </div>

                <Button
                  onClick={handleEnterAsTeacher}
                  size="lg"
                  leftIcon={<UserCheck className="w-4 h-4" />}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="w-full text-sm font-bold shadow-sm"
                >
                  Vào Bảng Điều Khiển Giáo Viên
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
