import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { studentService } from '../../services/studentService';
import { classService } from '../../services/classService';
import { lessonService } from '../../services/lessonService';
import { progressService } from '../../services/progressService';
import { certificateService } from '../../services/certificateService';
import { announcementService } from '../../services/announcementService';
import { ClassEntity, Lesson, Certificate, Announcement, EnrolledClassInfo } from '../../types';
import { Card, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ProgressBar } from '../../components/common/ProgressBar';
import {
  BookOpen,
  Award,
  ArrowRight,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  PlusCircle,
  Clock,
  User,
  GraduationCap,
  Calendar,
  AlertCircle,
  Loader2,
  ChevronRight
} from 'lucide-react';

export const StudentDashboardPage: React.FC = () => {
  const { student, studentSession, setCurrentClass } = useAuth();
  const { toastSuccess, toastWarning, toastError } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Enrolled classes state
  const [enrolledClasses, setEnrolledClasses] = useState<EnrolledClassInfo[]>([]);
  const [activeClassId, setActiveClassId] = useState<string>('');
  const [activeClass, setActiveClass] = useState<ClassEntity | null>(null);

  // Active class content
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonProgressMap, setLessonProgressMap] = useState<Record<string, number>>({});
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Join class form
  const [joinCode, setJoinCode] = useState<string>(() => searchParams.get('joinCode') || '');
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const studentId = student?.id || studentSession?.studentId || '';
  const studentName = student?.fullName || studentSession?.fullName || 'Học sinh';

  useEffect(() => {
    loadEnrolledClasses();
  }, [studentId]);

  const loadEnrolledClasses = async () => {
    setIsLoading(true);
    try {
      const list = await studentService.getMyEnrolledClasses();
      setEnrolledClasses(list);

      // Determine active class
      const preferredId = studentSession?.classId || (list.length > 0 ? list[0].classEntity.id : '');
      if (preferredId) {
        setActiveClassId(preferredId);
        await loadClassDetails(preferredId);
      }
    } catch (err) {
      console.error('Error loading enrolled classes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadClassDetails = async (cId: string) => {
    if (!studentId || !cId) return;
    try {
      const classData = await classService.getClassById(cId);
      setActiveClass(classData);
      setCurrentClass(classData);

      if (classData) {
        // Parallelize fetching lessons, certs, announcements for high performance
        const [lessonList, certs, anns] = await Promise.all([
          lessonService.getLessonsByClass(classData.id),
          certificateService.getStudentCertificates(studentId),
          announcementService.getAnnouncementsForStudent(classData.id)
        ]);

        setLessons(lessonList);
        const currentCert = certs.find(c => c.classId === classData.id);
        setCertificate(currentCert || null);
        setAnnouncements(anns);

        // Fetch lesson progress in parallel
        const summaries = await Promise.all(
          lessonList.map(l => progressService.getLessonProgressSummary(studentId, l.id))
        );

        let totalPct = 0;
        const pMap: Record<string, number> = {};
        lessonList.forEach((l, idx) => {
          const pct = summaries[idx]?.percent || 0;
          pMap[l.id] = pct;
          totalPct += pct;
        });

        const avg = lessonList.length > 0 ? Math.round(totalPct / lessonList.length) : 0;
        setLessonProgressMap(pMap);
        setOverallProgress(avg);
      }
    } catch (err) {
      console.error('Error loading class details:', err);
    }
  };

  const handleSelectClass = async (cId: string) => {
    setActiveClassId(cId);
    await loadClassDetails(cId);
  };

  const handleJoinClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');

    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode) {
      setJoinError('Vui lòng nhập Mã lớp học (Class Code).');
      return;
    }

    setIsJoining(true);
    try {
      const res = await studentService.joinClassWithCode(cleanCode);
      if (!res.success || !res.class) {
        const msg = res.error || 'Không tìm thấy lớp học với mã này.';
        setJoinError(msg);
        toastError(msg);
        return;
      }

      if (res.alreadyEnrolled) {
        toastWarning(`Bạn đã tham gia lớp "${res.class.name}" trước đó.`);
      } else {
        toastSuccess(`Chúc mừng bạn đã tham gia lớp "${res.class.name}" thành công!`);
      }

      setJoinCode('');
      // Reload classes
      const updatedList = await studentService.getMyEnrolledClasses();
      setEnrolledClasses(updatedList);
      setActiveClassId(res.class.id);
      await loadClassDetails(res.class.id);
    } catch (err: any) {
      const msg = err.message || 'Có lỗi xảy ra khi tham gia lớp học.';
      setJoinError(msg);
      toastError(msg);
    } finally {
      setIsJoining(false);
    }
  };

  const nextLesson = lessons.find(l => (lessonProgressMap[l.id] || 0) < 100) || lessons[0];

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      {/* Welcome Hero Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-200 text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Bàn Học Thông Minh 30/70</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Chào bạn, {studentName}!
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
              {enrolledClasses.length > 0
                ? `Bạn đang tham gia ${enrolledClasses.length} lớp học. Hãy hoàn thành 30% lý thuyết & video tương tác trực tuyến trước khi đến lớp thực hành.`
                : 'Chào mừng bạn! Nhập mã lớp học từ Thầy/Cô để bắt đầu tham gia lớp và làm bài tập.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {nextLesson && activeClass && (
              <Button
                size="lg"
                variant="amber"
                onClick={() => navigate(`/app/lesson/${nextLesson.id}`)}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="shadow-lg whitespace-nowrap"
              >
                Học tiếp: {nextLesson.title}
              </Button>
            )}
            <Link to="/app/profile">
              <Button
                size="md"
                variant="outline"
                className="text-white border-emerald-400/40 hover:bg-emerald-700/50"
              >
                Hồ sơ cá nhân
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* SECTION 1: JOIN CLASS FORM & ENROLLED CLASSES TABS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Join Class Card */}
        <Card className="p-6 border-emerald-200/80 bg-gradient-to-b from-white to-emerald-50/20 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Tham gia lớp học mới</h2>
                <p className="text-xs text-slate-500">Nhập mã lớp do Thầy/Cô cung cấp</p>
              </div>
            </div>

            <form onSubmit={handleJoinClassSubmit} className="space-y-3 mt-4">
              {joinError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{joinError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Mã lớp học (Class Code)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="VD: BLN-7842 hoặc 10A1-TOAN"
                    className="w-full px-3.5 py-2.5 text-sm font-mono uppercase font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 tracking-wider"
                  />
                </div>
                <p className="text-[11px] text-slate-400">Không phân biệt chữ hoa thường hay dấu gạch nối.</p>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isJoining}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium flex items-center justify-center gap-2"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang tham gia lớp...</span>
                  </>
                ) : (
                  <>
                    <span>Tham gia lớp</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tài khoản {student?.email || studentSession?.email} sẽ được ghi nhận vào lớp.</span>
          </div>
        </Card>

        {/* My Classes Grid / Switcher */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-700" />
              <h2 className="text-lg font-bold text-slate-900">Lớp học của tôi</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                {enrolledClasses.length}
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 flex justify-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : enrolledClasses.length === 0 ? (
            <Card className="p-8 text-center border-dashed border-slate-300 bg-white space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <GraduationCap className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Chưa tham gia lớp học nào</h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                Bạn chưa tham gia lớp học nào. Hãy nhập <strong>Mã lớp học (Class Code)</strong> do Thầy/Cô cung cấp ở khung bên trái để vào lớp và bắt đầu làm bài!
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {enrolledClasses.map((item) => {
                const isSelected = item.classEntity.id === activeClassId;
                return (
                  <div
                    key={item.enrollment.id}
                    onClick={() => handleSelectClass(item.classEntity.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-50/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-emerald-300 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {item.classEntity.classCode}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          {item.classEntity.subject}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                        {item.classEntity.name}
                      </h3>

                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.teacher?.fullName || 'Giáo viên phụ trách'}</span>
                        {item.teacher?.schoolName && (
                          <span className="text-slate-400">• {item.teacher.schoolName}</span>
                        )}
                      </p>

                      {/* Nearest Deadline if any */}
                      {item.nearestDeadline && (
                        <div className="mt-2 text-[11px] bg-amber-50 text-amber-800 px-2 py-1 rounded flex items-center gap-1.5 font-medium">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span className="line-clamp-1">
                            Hạn: {item.nearestDeadline.lessonTitle} (
                            {new Date(item.nearestDeadline.dueAt).toLocaleDateString('vi-VN')})
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-500">
                          {item.completedLessonCount}/{item.lessonCount} bài hoàn thành
                        </span>
                        <span className="font-bold text-emerald-700">
                          {item.progressPercent}%
                        </span>
                      </div>
                      <ProgressBar percent={item.progressPercent} size="xs" color="emerald" className="mb-3" />

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/app/class/${item.classEntity.id}`);
                          }}
                          className="w-full text-xs py-1.5 bg-emerald-600 text-white font-medium flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <span>Vào lớp học</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: ACTIVE CLASS DETAIL (METRICS, LESSONS, ANNOUNCEMENTS) */}
      {activeClass && (
        <div className="space-y-6 pt-4 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">
                  {activeClass.classCode}
                </span>
                <h2 className="text-xl font-black text-slate-900">
                  Nội dung lớp: {activeClass.name}
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeClass.subject} • {activeClass.grade} • Tỉ lệ Blended: {activeClass.onlineRatio || 30}% Online / {activeClass.offlineRatio || 70}% Trực tiếp
              </p>
            </div>

            <Link to={`/app/class/${activeClass.id}`}>
              <Button variant="outline" size="sm" className="text-xs font-semibold text-emerald-700 border-emerald-300 flex items-center gap-1.5">
                <span>Xem chi tiết lớp</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {/* 3 Metric Cards for Active Class */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Card className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-black text-slate-900">{overallProgress}%</div>
                <div className="text-xs font-medium text-slate-500 mt-0.5">Tiến độ lớp học này</div>
                <ProgressBar percent={overallProgress} size="xs" color="emerald" className="mt-2" />
              </div>
            </Card>

            <Card className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900">
                  {lessons.filter(l => (lessonProgressMap[l.id] || 0) === 100).length} / {lessons.length}
                </div>
                <div className="text-xs font-medium text-slate-500 mt-0.5">Bài học hoàn thành</div>
              </div>
            </Card>

            <Card className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900">
                  {certificate ? '1 Đã Cấp' : overallProgress === 100 ? 'Sẵn sàng cấp' : 'Chưa mở khóa'}
                </div>
                <div className="text-xs font-medium text-slate-500 mt-0.5">Chứng nhận hoàn thành</div>
              </div>
            </Card>
          </div>

          {/* Lessons List & Right Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Lộ trình bài học</h3>
                <span className="text-xs text-slate-500">{lessons.length} bài học</span>
              </div>

              {lessons.length === 0 ? (
                <Card className="p-8 text-center border-dashed border-slate-300">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">Chưa có bài học nào</h4>
                  <p className="text-xs text-slate-500">Giáo viên đang chuẩn bị tài liệu cho lớp học này.</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {lessons.map((l, idx) => {
                    const progress = lessonProgressMap[l.id] || 0;
                    const isFinished = progress === 100;

                    return (
                      <Card
                        key={l.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-emerald-300 transition"
                      >
                        <div className="flex items-start gap-3.5">
                          <div
                            className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center shrink-0 border text-sm ${
                              isFinished
                                ? 'bg-emerald-500 text-white border-emerald-600'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            }`}
                          >
                            {isFinished ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {l.sequentialLock && (
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3 text-blue-600" />
                                  Tuần tự
                                </span>
                              )}
                              <span className="text-xs font-bold text-emerald-700">
                                {progress}%
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900">{l.title}</h4>
                            <p className="text-xs text-slate-500 line-clamp-1">{l.description}</p>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant={isFinished ? 'outline' : 'primary'}
                          onClick={() => navigate(`/app/lesson/${l.id}`)}
                          className="self-end sm:self-center text-xs py-1.5 px-3 whitespace-nowrap"
                        >
                          {isFinished ? 'Xem lại' : progress > 0 ? 'Học tiếp' : 'Bắt đầu'}
                        </Button>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Announcements & Certificates */}
            <div className="space-y-6">
              {/* Announcements Card */}
              <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-sm font-bold text-slate-900">Thông báo từ Thầy/Cô</h4>
                  <span className="text-xs text-slate-400">{announcements.length}</span>
                </div>

                {announcements.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Chưa có thông báo mới.</p>
                ) : (
                  <div className="space-y-3">
                    {announcements.slice(0, 3).map((ann) => (
                      <div key={ann.id} className="p-3 rounded-lg bg-slate-50 text-xs space-y-1">
                        <div className="font-bold text-slate-800">{ann.title}</div>
                        <p className="text-slate-600 line-clamp-2">{ann.content}</p>
                        <div className="text-[10px] text-slate-400 pt-1">
                          {new Date(ann.createdAt).toLocaleDateString('vi-VN')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Certificate Quick Card */}
              <Card className="p-5 bg-gradient-to-br from-amber-50 to-orange-50/40 border-amber-200 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Giấy Chứng Nhận</h4>
                    <p className="text-xs text-slate-500">Hoàn thành 100% khóa học</p>
                  </div>
                </div>

                {certificate ? (
                  <Link to={`/app/certificate/${activeClass.id}`}>
                    <Button size="sm" variant="amber" className="w-full text-xs py-1.5 shadow-xs">
                      Xem chứng chỉ của tôi
                    </Button>
                  </Link>
                ) : (
                  <div className="text-xs text-amber-800 bg-amber-100/50 p-2.5 rounded-lg">
                    Tiến độ hiện tại: <strong>{overallProgress}%</strong>. Cần đạt 100% để mở khóa chứng chỉ điện tử.
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
