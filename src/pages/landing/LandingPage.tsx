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
  const { setRole, teacher, loginAsStudent } = useAuth();
  const { toastSuccess, toastError, toastInfo } = useToast();
  const navigate = useNavigate();

  // Quick Join Form State on Landing Page
  const [quickFullName, setQuickFullName] = useState<string>('');
  const [quickClassCode, setQuickClassCode] = useState<string>('');
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string | null>(null);

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

  const handleEnterAsStudent = () => {
    setRole('ROLE_STUDENT');
    navigate('/app/join');
  };

  const handleQuickJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);

    const cleanName = quickFullName.trim();
    const cleanCode = quickClassCode.trim().toUpperCase();

    if (!cleanName) {
      setJoinError('Vui lòng nhập đầy đủ Họ và tên học sinh.');
      toastError('Vui lòng nhập Họ và tên');
      return;
    }

    if (!cleanCode) {
      setJoinError('Vui lòng nhập Mã lớp học (Class Code) do Thầy/Cô cung cấp.');
      toastError('Vui lòng nhập Mã lớp học');
      return;
    }

    setIsJoining(true);

    try {
      const res = await studentService.joinClass(cleanName, cleanCode);
      if (res.success && res.session) {
        await loginAsStudent(res.session);
        toastSuccess(`Chào mừng ${res.session.fullName} đã vào lớp học ${res.class?.name || cleanCode} thành công!`);
        navigate('/app');
      } else {
        setJoinError(res.error || 'Không tìm thấy lớp học với mã này. Vui lòng kiểm tra lại mã lớp.');
        toastError(res.error || 'Lỗi tham gia lớp');
      }
    } catch (err: any) {
      setJoinError(err.message || 'Đã có lỗi xảy ra khi vào lớp.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleSelectClassCode = (code: string) => {
    setQuickClassCode(code);
    setJoinError(null);
    toastInfo(`Đã điền mã lớp: ${code}`);
  };

  const handleCopyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toastSuccess(`Đã sao chép mã lớp: ${code}`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-10 pb-16 lg:pt-16 lg:pb-20 border-b border-slate-200/70 bg-gradient-to-b from-blue-50/50 via-white to-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/70 border border-blue-200 text-blue-800 text-xs sm:text-sm font-semibold shadow-2xs">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Mô hình Giáo dục Hiện đại: 30% Online – 70% Trực tiếp</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              SMART BLENDED <span className="text-blue-600">LMS</span>
            </h1>
            <p className="text-sm sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Nền tảng học tập kết hợp toàn diện: Tự học trực tuyến chuẩn hóa với cơ chế
              <span className="font-semibold text-slate-800"> chống tua video</span> và
              <span className="font-semibold text-slate-800"> 70% thời lượng thực hành, dự án thực tế trên lớp</span>.
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
                    <h2 className="text-base font-bold text-slate-900">Vào Bàn Học Sinh Bằng Mã Lớp</h2>
                    <p className="text-xs text-slate-500">Dành cho học sinh làm bài tập và xem bài giảng</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                  Học sinh
                </span>
              </div>

              {joinError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2">
                  <span>⚠️</span>
                  <span>{joinError}</span>
                </div>
              )}

              <form onSubmit={handleQuickJoinSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Họ và tên của bạn <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Trần Minh Anh hoặc Lê Hoàng Nam..."
                      value={quickFullName}
                      onChange={e => setQuickFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Mã lớp học (Class Code) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-emerald-700 font-medium">Do Thầy/Cô cung cấp</span>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: TIN10-A1, PY11-A3..."
                      value={quickClassCode}
                      onChange={e => setQuickClassCode(e.target.value.toUpperCase())}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono uppercase font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 tracking-wider"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="success"
                  size="lg"
                  isLoading={isJoining}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="w-full text-sm font-bold shadow-sm"
                >
                  Vào Bàn Học Sinh Ngay
                </Button>
              </form>

              {/* Quick helper */}
              <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Chưa có mã lớp?</span>
                <button
                  type="button"
                  onClick={handleEnterAsStudent}
                  className="text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Xem tất cả lớp học có sẵn</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
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
                  Giáo viên có thể tạo nhiều lớp học, thiết lập tỷ lệ điểm 30% Online - 70% Thực hành, cấu hình Video chống tua, và chia sẻ Mã lớp cho học sinh.
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
            <h4 className="font-bold text-slate-800">Đồng Bộ Server Đa Thiết Bị</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Lớp học và bài giảng tạo bởi Giáo viên được đồng bộ tức thì, học sinh có thể dùng bất kỳ điện thoại hay máy tính nào để vào lớp bằng mã.
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
