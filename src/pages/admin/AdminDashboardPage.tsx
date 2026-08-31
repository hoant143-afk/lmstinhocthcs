import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { classService } from '../../services/classService';
import { lessonService } from '../../services/lessonService';
import { studentRepo, submissionRepo, progressRepo, announcementRepo } from '../../repositories';
import { ClassEntity, Lesson, Submission, Student, Announcement } from '../../types';
import { Card, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ProgressBar } from '../../components/common/ProgressBar';
import {
  GraduationCap,
  Users,
  BookOpen,
  FileCheck,
  TrendingUp,
  PlusCircle,
  Copy,
  Check,
  Clock,
  AlertCircle,
  ChevronRight,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const { teacher } = useAuth();
  const { toastSuccess } = useToast();
  const navigate = useNavigate();

  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<Submission[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadDashboardData();
  }, [teacher]);

  const loadDashboardData = async () => {
    if (!teacher) return;
    setIsLoading(true);
    try {
      const clsList = await classService.getTeacherClasses(teacher.id);
      setClasses(clsList);

      // Aggregate all students and submissions
      let studentsTotal: Student[] = [];
      let submissionsTotal: Submission[] = [];

      for (const cls of clsList) {
        const studs = await studentRepo.getByClassId(cls.id);
        studentsTotal = [...studentsTotal, ...studs];

        const subs = await submissionRepo.getByClassId(cls.id);
        submissionsTotal = [...submissionsTotal, ...subs];
      }

      setAllStudents(studentsTotal);
      setPendingSubmissions(submissionsTotal.filter(s => s.status === 'submitted'));

      const anns = await announcementRepo.getByTeacherId(teacher.id);
      setAnnouncements(anns);
    } catch (err) {
      console.error('Error loading dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toastSuccess(`Đã sao chép mã lớp: ${code}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-md">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/30 text-blue-200 text-xs font-semibold backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            <span>Hệ Thống Quản Lý Học Tập Thông Minh</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Xin chào, {teacher?.fullName || 'Thầy Nguyễn Văn Hoàng'}!
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/80 max-w-xl">
            Chào mừng Thầy quay trở lại. Hiện có <strong className="text-white">{pendingSubmissions.length} bài nộp</strong> đang chờ chấm và <strong className="text-white">{classes.length} lớp học</strong> đang hoạt động.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate('/admin/classes')}
            variant="amber"
            size="md"
            leftIcon={<PlusCircle className="w-4 h-4" />}
            className="shadow-sm"
          >
            Tạo Lớp Mới
          </Button>
          <Button
            onClick={() => navigate('/admin/submissions')}
            variant="secondary"
            size="md"
            leftIcon={<FileCheck className="w-4 h-4" />}
          >
            Chấm Bài Nộp
          </Button>
        </div>
      </div>

      {/* 5 Core KPI Blocks */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="p-5 border-slate-200/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{classes.length}</div>
            <div className="text-xs font-medium text-slate-500 mt-0.5">Lớp đang phụ trách</div>
          </div>
        </Card>

        <Card className="p-5 border-slate-200/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{allStudents.length}</div>
            <div className="text-xs font-medium text-slate-500 mt-0.5">Học sinh đã tham gia</div>
          </div>
        </Card>

        <Card className="p-5 border-slate-200/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-600">{pendingSubmissions.length}</div>
            <div className="text-xs font-medium text-slate-500 mt-0.5">Bài nộp chờ chấm</div>
          </div>
        </Card>

        <Card className="p-5 border-slate-200/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">70%</div>
            <div className="text-xs font-medium text-slate-500 mt-0.5">Tỉ lệ thực hành Lab</div>
          </div>
        </Card>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Classes & Quick Access */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Danh Sách Lớp Học Đang Phụ Trách</h2>
            <Link
              to="/admin/classes"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Xem tất cả ({classes.length})
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {classes.map(cls => (
              <Card key={cls.id} className="p-5 hover:border-blue-300 transition group flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                      {cls.grade}
                    </span>
                    <button
                      onClick={() => handleCopyCode(cls.classCode)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                      title="Bấm để sao chép mã lớp"
                    >
                      {copiedCode === cls.classCode ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span>{cls.classCode}</span>
                    </button>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition line-clamp-1">
                    {cls.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {cls.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Môn: {cls.subject}</span>
                  <Link
                    to={`/admin/classes/${cls.id}`}
                    className="font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                  >
                    Vào lớp <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>

          {/* Pending Submissions Table Card */}
          <Card className="p-6">
            <CardHeader
              title="Bài Nộp Cần Chấm Điểm Gần Đây"
              subtitle="Học sinh đã nộp link sản phẩm thực hành và kịch bản"
              action={
                <Link
                  to="/admin/submissions"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  Mở trang chấm điểm
                </Link>
              }
            />

            {pendingSubmissions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                🎉 Tuyệt vời! Không còn bài nộp nào đang chờ chấm.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingSubmissions.slice(0, 4).map(sub => {
                  const student = allStudents.find(s => s.id === sub.studentId);
                  return (
                    <div key={sub.id} className="py-3.5 flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold text-slate-800">
                          {student?.fullName || 'Học sinh'}
                        </div>
                        <div className="text-xs text-slate-500 truncate max-w-xs sm:max-w-md">
                          {sub.url || sub.text || 'Bài làm đính kèm'}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge variant="amber">Chờ chấm</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/admin/submissions?subId=${sub.id}`)}
                        >
                          Chấm điểm
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right 1 Col: Quick Actions & Announcements */}
        <div className="space-y-6">
          {/* Quick Guidance Box */}
          <Card className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-2">
              <Sparkles className="w-4 h-4" />
              <span>QUY TRÌNH BLENDED CHUẨN</span>
            </div>
            <h4 className="font-bold text-sm text-white mb-2">3 Bước Dạy Học Kết Hợp:</h4>
            <ol className="space-y-2 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
              <li>
                <span className="font-semibold text-white">Giao bài Online (30%):</span> Video chống tua + Mini Quiz tự học.
              </li>
              <li>
                <span className="font-semibold text-white">Thực hành trên lớp (70%):</span> Học sinh làm sản phẩm, nộp link.
              </li>
              <li>
                <span className="font-semibold text-white">Nghiệm thu trực tiếp:</span> Thầy cô xác nhận và hệ thống cấp Chứng nhận.
              </li>
            </ol>
          </Card>

          {/* Announcements Card */}
          <Card className="p-5">
            <CardHeader
              title="Thông Báo Mới"
              action={
                <Link to="/admin/announcements" className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                  Quản lý
                </Link>
              }
            />
            <div className="space-y-3">
              {announcements.slice(0, 3).map(ann => (
                <div key={ann.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <h5 className="text-xs font-bold text-slate-800 line-clamp-1">{ann.title}</h5>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{ann.content}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
