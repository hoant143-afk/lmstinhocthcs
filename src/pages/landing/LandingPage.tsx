import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { studentService } from '../../services/studentService';
import { classService, AvailableClassInfo } from '../../services/classService';
import {
  Layers,
  GraduationCap,
  UserCheck,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users,
  Award,
  BookOpen,
  Code,
  KeyRound,
  User,
  School,
  Copy,
  Check,
  Search,
  ExternalLink
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';

export const LandingPage: React.FC = () => {
  const { setRole, teacher, studentSession, isAuthenticatedStudent } = useAuth();
  const { toastSuccess, toastInfo } = useToast();
  const navigate = useNavigate();

  // Available classes created by teachers
  const [availableClasses, setAvailableClasses] = useState<AvailableClassInfo[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const list = await classService.getAvailableClassesForStudent();
      setAvailableClasses(list);
    } catch (err) {
      console.error('Error loading available classes on landing:', err);
    }
  };

  const handleEnterAsTeacher = () => {
    setRole('ROLE_TEACHER');
    if (teacher) {
      navigate('/admin/dashboard');
    } else {
      navigate('/admin/login');
    }
  };

  const handleCopyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toastSuccess(`Đã sao chép mã lớp: ${code}`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleSelectClassCode = (code: string) => {
    if (isAuthenticatedStudent) {
      navigate(`/app?joinCode=${code}`);
    } else {
      navigate(`/app/login?code=${code}`);
    }
  };

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-10 pb-16 lg:pt-16 lg:pb-20 border-b border-slate-200/70 bg-gradient-to-b from-blue-50/50 via-white to-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              SMART BLENDED <span className="text-blue-600">LMS</span>
            </h1>
            <p className="text-sm sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Nền tảng học tập kết hợp trực tuyến và trực tiếp theo lịch trình linh hoạt, tích hợp kiểm soát xem video bài giảng và quản lý tiến độ học tập toàn diện.
            </p>
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

                <p className="text-xs text-slate-600 leading-relaxed">
                  Giáo viên có thể tạo nhiều lớp học, lập lịch học linh hoạt Online hoặc Trực tiếp, cấu hình Video chống tua và chấm điểm bài nộp của học sinh.
                </p>

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

              {/* Active Classes Preview Pill */}
              {availableClasses.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      <span>Lớp học đang mở ({availableClasses.length})</span>
                    </span>
                    <Link to="/app/join" className="text-blue-600 font-bold hover:underline text-[11px]">
                      Xem tất cả
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableClasses.slice(0, 4).map(item => (
                      <button
                        key={item.classEntity.id}
                        type="button"
                        onClick={() => handleSelectClassCode(item.classEntity.classCode)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-xs text-slate-700 font-medium transition cursor-pointer"
                      >
                        <span className="font-bold text-slate-900">{item.classEntity.name}</span>
                        <span className="font-mono text-[10px] text-emerald-800 bg-emerald-100 px-1 rounded font-bold">
                          {item.classEntity.classCode}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
