import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { studentService } from '../../services/studentService';
import { classService, AvailableClassInfo } from '../../services/classService';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import {
  GraduationCap,
  ArrowRight,
  Sparkles,
  KeyRound,
  User,
  School,
  BookOpen,
  Copy,
  Check,
  ShieldCheck,
  Search,
  Users,
  Layers,
  ArrowUpRight
} from 'lucide-react';

export const JoinClassPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  const { loginAsStudent } = useAuth();
  const { toastSuccess, toastError, toastInfo } = useToast();

  const [fullName, setFullName] = useState<string>('');
  const [classCode, setClassCode] = useState<string>(initialCode);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Available classes in system created by teachers
  const [availableClasses, setAvailableClasses] = useState<AvailableClassInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    loadAvailableClasses();
  }, []);

  const loadAvailableClasses = async () => {
    try {
      const list = await classService.getAvailableClassesForStudent();
      setAvailableClasses(list);
    } catch (err) {
      console.error('Error loading available classes:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = fullName.trim();
    const cleanCode = classCode.trim().toUpperCase();

    if (!cleanName) {
      setErrorMsg('Vui lòng nhập đầy đủ Họ và tên học sinh.');
      toastError('Vui lòng nhập Họ và tên');
      return;
    }

    if (!cleanCode) {
      setErrorMsg('Vui lòng nhập Mã lớp học (Class Code) do Thầy/Cô cung cấp.');
      toastError('Vui lòng nhập Mã lớp học');
      return;
    }

    setIsLoading(true);

    try {
      const res = await studentService.joinClass(cleanName, cleanCode);
      if (res.success && res.session) {
        await loginAsStudent(res.session);
        toastSuccess(`Chào mừng ${res.session.fullName} đã vào bàn học sinh thành công!`);
        navigate('/app');
      } else {
        setErrorMsg(res.error || 'Không tìm thấy lớp học với mã này. Vui lòng kiểm tra lại mã lớp.');
        toastError(res.error || 'Lỗi tham gia lớp');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Đã có lỗi xảy ra khi vào lớp.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectClassCode = (code: string, suggestedName?: string) => {
    setClassCode(code);
    if (suggestedName && !fullName) {
      setFullName(suggestedName);
    }
    setErrorMsg(null);
    toastInfo(`Đã chọn mã lớp: ${code}`);

    // Scroll to top form smoothly on mobile
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toastSuccess(`Đã sao chép mã lớp: ${code}`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const filteredClasses = availableClasses.filter(item => {
    const q = searchTerm.toLowerCase();
    return (
      item.classEntity.name.toLowerCase().includes(q) ||
      item.classEntity.classCode.toLowerCase().includes(q) ||
      item.classEntity.subject.toLowerCase().includes(q) ||
      (item.teacher?.fullName.toLowerCase().includes(q) ?? false) ||
      (item.teacher?.schoolName?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-12 px-4 sm:px-6 space-y-8">
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
          <GraduationCap className="w-4 h-4 text-emerald-700" />
          <span>Cổng Bàn Học Sinh & Làm Bài Tập</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Vào Bàn Học Sinh Bằng Mã Lớp
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
          Học sinh cần nhập <strong>Họ tên</strong> và <strong>Mã lớp học (Class Code)</strong> do Giáo viên đã tạo và cung cấp để xem bài giảng, làm trắc nghiệm chống tua và nộp sản phẩm thực hành.
        </p>
      </div>

      {/* Main Form Box */}
      <Card className="p-6 sm:p-8 shadow-sm border-slate-200 bg-white max-w-xl mx-auto">
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-medium flex items-start gap-2.5">
            <span className="text-base leading-none">⚠️</span>
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              1. Họ và tên học sinh <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="input-student-fullname"
                type="text"
                required
                placeholder="Ví dụ: Trần Minh Anh hoặc Lê Hoàng Nam..."
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </div>
            <p className="text-[11px] text-slate-400">Tên này sẽ hiển thị trong sổ điểm và trên Giấy chứng nhận của bạn.</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                2. Mã lớp học (Class Code) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Do Thầy/Cô cung cấp
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                id="input-student-classcode"
                type="text"
                required
                placeholder="Ví dụ: TIN10-A1 hoặc STEM-8921..."
                value={classCode}
                onChange={e => setClassCode(e.target.value.toUpperCase())}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono uppercase font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition tracking-wider"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Nhập chính xác mã lớp học gồm chữ và số do Thầy/Cô đã tạo.
            </p>
          </div>

          <Button
            id="btn-submit-join"
            type="submit"
            size="lg"
            variant="success"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="w-full text-sm font-bold shadow-sm pt-3 pb-3"
          >
            Vào Bàn Học Sinh & Bắt Đầu Học
          </Button>
        </form>

        {/* Quick helper for demo */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Bạn là Giáo viên?</span>
          <Link
            to="/admin/login"
            className="font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
          >
            <span>Tạo lớp học mới tại Cổng Giáo viên</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </Card>

      {/* Available Classes Section Created by Teachers */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              <span>Danh Sách Các Lớp Học Hiện Có Do Giáo Viên Đã Tạo</span>
            </h2>
            <p className="text-xs text-slate-500">
              Bấm vào thẻ lớp học bên dưới để tự động điền Mã lớp học vào ô nhập phía trên.
            </p>
          </div>

          {availableClasses.length > 2 && (
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên lớp, môn, giáo viên..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          )}
        </div>

        {filteredClasses.length === 0 ? (
          <Card className="p-8 text-center bg-slate-50 border-dashed border-slate-200">
            <School className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">Chưa tìm thấy lớp học phù hợp</p>
            <p className="text-xs text-slate-500 mt-1">
              Thầy/Cô có thể đăng nhập vào Cổng Quản trị để tạo thêm lớp học mới và chia sẻ mã lớp cho học sinh.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredClasses.map(item => {
              const isSelected = classCode.trim().toUpperCase() === item.classEntity.classCode.toUpperCase();
              return (
                <div
                  key={item.classEntity.id}
                  onClick={() => handleSelectClassCode(item.classEntity.classCode)}
                  className={`p-5 rounded-2xl border transition text-left cursor-pointer group relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-white hover:border-emerald-400 hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
                          {item.classEntity.grade} • {item.classEntity.subject}
                        </span>
                        <h3 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-emerald-700 transition mt-1.5">
                          {item.classEntity.name}
                        </h3>
                      </div>

                      {/* Class Code Pill */}
                      <div className="flex items-center gap-1 bg-emerald-100 border border-emerald-300 text-emerald-900 px-2.5 py-1 rounded-xl shrink-0">
                        <span className="text-xs font-mono font-black tracking-wider">
                          {item.classEntity.classCode}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyCode(item.classEntity.classCode, e)}
                          title="Sao chép mã lớp"
                          className="p-1 hover:bg-emerald-200 rounded text-emerald-800 transition cursor-pointer"
                        >
                          {copiedCode === item.classEntity.classCode ? (
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Teacher Info */}
                    <div className="flex items-center gap-2.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <img
                        src={item.teacher?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={item.teacher?.fullName || 'Giáo viên'}
                        className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800 truncate">
                          {item.teacher?.fullName || 'Giáo viên bộ môn'}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {item.teacher?.schoolName || 'Trường THPT'}
                        </div>
                      </div>
                    </div>

                    {/* Description preview */}
                    {item.classEntity.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {item.classEntity.description}
                      </p>
                    )}
                  </div>

                  {/* Footer Meta & 1-click select */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-slate-400 font-medium">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                        <span>{item.lessonCount} bài học</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>{item.studentCount} học sinh</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectClassCode(item.classEntity.classCode)}
                      className={`font-bold px-3 py-1 rounded-lg text-xs transition cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-700 group-hover:bg-emerald-600 group-hover:text-white'
                      }`}
                    >
                      {isSelected ? 'Đã Chọn Mã Lớp' : 'Chọn Mã Lớp Này'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
