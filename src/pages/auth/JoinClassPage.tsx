import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { studentService } from '../../services/studentService';
import { classService, AvailableClassInfo } from '../../services/classService';
import { apiClient, DiagnosticInfo } from '../../services/apiClient';
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
  Search,
  Users,
  Layers,
  CheckCircle2,
  AlertCircle,
  LogIn,
  UserPlus,
  Loader2
} from 'lucide-react';

export const JoinClassPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  const { student, studentSession, isAuthenticatedStudent } = useAuth();
  const { toastSuccess, toastError, toastWarning, toastInfo } = useToast();

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

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanCode = classCode.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg('Vui lòng nhập Mã lớp học (Class Code).');
      toastError('Vui lòng nhập Mã lớp học');
      return;
    }

    if (!isAuthenticatedStudent) {
      toastInfo('Vui lòng đăng nhập tài khoản học sinh trước khi tham gia lớp.');
      navigate(`/app/login?code=${cleanCode}`);
      return;
    }

    setIsLoading(true);

    try {
      const res = await studentService.joinClassWithCode(cleanCode);
      if (res.success && res.class) {
        if (res.alreadyEnrolled) {
          toastWarning(`Bạn đã tham gia lớp "${res.class.name}" trước đó.`);
        } else {
          toastSuccess(`Đã tham gia lớp "${res.class.name}" thành công!`);
        }
        navigate('/app');
      } else {
        const msg = res.error || 'Không tìm thấy lớp học với mã này. Vui lòng kiểm tra lại.';
        setErrorMsg(msg);
        toastError(msg);
      }
    } catch (err: any) {
      const msg = err.message || 'Đã có lỗi xảy ra khi vào lớp.';
      setErrorMsg(msg);
      toastError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectClassCode = (code: string) => {
    setClassCode(code);
    setErrorMsg(null);
    toastInfo(`Đã chọn mã lớp: ${code}`);
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
          <span>Cổng Bàn Học Sinh & Tham Gia Lớp Học</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Tham Gia Lớp Học Mới
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
          {isAuthenticatedStudent
            ? `Tài khoản: ${student?.fullName || studentSession?.fullName} (${student?.email || studentSession?.email}). Nhập mã lớp do Thầy/Cô cung cấp để vào lớp ngay.`
            : 'Đăng ký hoặc đăng nhập tài khoản học sinh bằng Email & Mật khẩu để tham gia các lớp học mà không cần nhập lại họ tên.'}
        </p>
      </div>

      {/* Main Join Card or Auth Prompt */}
      {isAuthenticatedStudent ? (
        <Card className="p-6 sm:p-8 max-w-xl mx-auto border-emerald-200 shadow-md">
          <form onSubmit={handleJoinClass} className="space-y-4">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
                {(student?.fullName || studentSession?.fullName || 'H').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate">
                  {student?.fullName || studentSession?.fullName}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {student?.email || studentSession?.email}
                </div>
              </div>
              <Link to="/app/profile" className="text-xs text-emerald-700 hover:underline font-semibold">
                Đổi tài khoản
              </Link>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Mã lớp học (Class Code) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: BLN-7842 hoặc TIN10-A1..."
                  value={classCode}
                  onChange={e => setClassCode(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono uppercase font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 tracking-wider"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang tham gia lớp...</span>
                </>
              ) : (
                <>
                  <span>Tham gia lớp học</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        </Card>
      ) : (
        <Card className="p-6 sm:p-8 max-w-xl mx-auto border-slate-200 shadow-md text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <GraduationCap className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">Yêu cầu đăng nhập học sinh</h2>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Học sinh cần đăng nhập bằng Email và Mật khẩu để tham gia lớp và lưu trữ kết quả học tập an toàn.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Link to={`/app/login${classCode ? `?code=${classCode}` : ''}`}>
              <Button variant="primary" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2">
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập học sinh</span>
              </Button>
            </Link>

            <Link to={`/app/register${classCode ? `?code=${classCode}` : ''}`}>
              <Button variant="outline" className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50 flex items-center justify-center gap-2">
                <UserPlus className="w-4 h-4" />
                <span>Đăng ký mới</span>
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Available Classes Section */}
      <div className="space-y-4 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Danh sách lớp học mở</h3>
            <p className="text-xs text-slate-500">Các lớp học có sẵn trong hệ thống</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm lớp học..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredClasses.map(item => (
            <div
              key={item.classEntity.id}
              onClick={() => handleSelectClassCode(item.classEntity.classCode)}
              className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 bg-white hover:bg-emerald-50/20 transition cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {item.classEntity.classCode}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleCopyCode(item.classEntity.classCode, e)}
                    className="p-1 text-slate-400 hover:text-emerald-700 rounded transition"
                    title="Sao chép mã"
                  >
                    {copiedCode === item.classEntity.classCode ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <h4 className="font-bold text-slate-900 line-clamp-1">{item.classEntity.name}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {item.teacher?.fullName || 'Giáo viên'} • {item.lessonCount} bài học
                </p>
              </div>

              <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-700 font-medium">
                <span>Bấm để điền mã lớp</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
