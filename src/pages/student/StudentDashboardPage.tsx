import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { classService } from '../../services/classService';
import { lessonService } from '../../services/lessonService';
import { progressService } from '../../services/progressService';
import { certificateService } from '../../services/certificateService';
import { announcementService } from '../../services/announcementService';
import { ClassEntity, Lesson, Certificate, Announcement } from '../../types';
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
  ShieldCheck
} from 'lucide-react';

export const StudentDashboardPage: React.FC = () => {
  const { studentSession } = useAuth();
  const navigate = useNavigate();

  const [cls, setCls] = useState<ClassEntity | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonProgressMap, setLessonProgressMap] = useState<Record<string, number>>({});
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!studentSession) {
      navigate('/app/join');
      return;
    }
    loadStudentData();
  }, [studentSession]);

  const loadStudentData = async () => {
    if (!studentSession) return;
    setIsLoading(true);
    try {
      const classData = await classService.getClassById(studentSession.classId);
      setCls(classData);

      if (classData) {
        const lessonList = await lessonService.getLessonsByClass(classData.id);
        setLessons(lessonList);

        // Load progress for each lesson
        let totalPct = 0;
        const pMap: Record<string, number> = {};

        for (const l of lessonList) {
          const sum = await progressService.getLessonProgressSummary(studentSession.studentId, l.id);
          pMap[l.id] = sum.percent;
          totalPct += sum.percent;
        }

        const avg = lessonList.length > 0 ? Math.round(totalPct / lessonList.length) : 0;
        setLessonProgressMap(pMap);
        setOverallProgress(avg);

        // Check for certificate
        const certs = await certificateService.getStudentCertificates(studentSession.studentId);
        const currentCert = certs.find(c => c.classId === classData.id);
        setCertificate(currentCert || null);

        // Announcements
        const anns = await announcementService.getAnnouncementsForStudent(classData.id);
        setAnnouncements(anns);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!studentSession) {
    return null;
  }

  // Find next unfinished lesson to continue
  const nextLesson = lessons.find(l => (lessonProgressMap[l.id] || 0) < 100) || lessons[0];

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Hero Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-200 text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Bàn Làm Việc Cá Nhân Của Học Sinh</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Chào bạn, {studentSession.fullName}!
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
              Lớp học hiện tại: <strong className="text-white">{cls?.name || 'Đang tải...'}</strong>. Hãy hoàn thành 30% nội dung lý thuyết & video chống tua trước khi đến lớp thực hành.
            </p>
          </div>

          {/* Action to continue learning */}
          {nextLesson && (
            <Button
              size="lg"
              variant="amber"
              onClick={() => navigate(`/app/lesson/${nextLesson.id}`)}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="shadow-lg whitespace-nowrap self-start md:self-auto"
            >
              Tiếp Tục Bài Học
            </Button>
          )}
        </div>
      </div>

      {/* 3 Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="text-2xl font-black text-slate-900">{overallProgress}%</div>
            <div className="text-xs font-medium text-slate-500 mt-0.5">Tiến độ khóa học chung</div>
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
            <div className="text-xs font-medium text-slate-500 mt-0.5">Bài học đã hoàn thành</div>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {certificate ? '1 Đã Nhận' : overallProgress === 100 ? 'Sẵn sàng cấp' : 'Chưa mở khóa'}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-0.5">Chứng nhận hoàn thành</div>
          </div>
        </Card>
      </div>

      {/* Main Two-Column View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Lesson Pathway */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Lộ Trình Bài Học Của Lớp</h2>
            <span className="text-xs text-slate-500">
              {lessons.length} bài học chuẩn Blended 30/70
            </span>
          </div>

          <div className="space-y-4">
            {lessons.map((l, idx) => {
              const progress = lessonProgressMap[l.id] || 0;
              const isFinished = progress === 100;

              return (
                <Card
                  key={l.id ? `${l.id}_${idx}` : `lesson_${idx}`}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-emerald-300 transition group"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center shrink-0 border ${
                        isFinished
                          ? 'bg-emerald-500 text-white border-emerald-600'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}
                    >
                      {isFinished ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {l.sequentialLock && (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-blue-600" />
                            Mở khóa tuần tự
                          </span>
                        )}
                        <span className="text-xs font-bold text-emerald-700">
                          {progress}% hoàn thành
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition">
                        {l.title}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-1">{l.description}</p>
                      <ProgressBar percent={progress} size="xs" color="emerald" className="w-48 mt-2" />
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={isFinished ? 'outline' : 'primary'}
                    onClick={() => navigate(`/app/lesson/${l.id}`)}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    className="self-end sm:self-center"
                  >
                    {isFinished ? 'Xem lại bài' : progress > 0 ? 'Học tiếp' : 'Bắt đầu học'}
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Announcements & Certificate Box */}
        <div className="space-y-6">
          {/* Certificate Action Box */}
          <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50/50 border-amber-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">Giấy Chứng Nhận Khóa Học</h4>
                <p className="text-xs text-amber-800">Cấp tự động khi đạt 100%</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {overallProgress === 100
                ? 'Chúc mừng! Bạn đã hoàn thành 100% nội dung học tập và bài thực hành trực tiếp.'
                : `Bạn đã đạt ${overallProgress}%. Cần hoàn thành tất cả nhiệm vụ 30/70 để nhận chứng chỉ chính thức.`}
            </p>

            {overallProgress === 100 && (
              <Button
                variant="amber"
                size="md"
                onClick={() => navigate(`/app/certificate/${cls?.id}`)}
                className="w-full"
                leftIcon={<Award className="w-4 h-4" />}
              >
                Xem & In Chứng Nhận Ngay
              </Button>
            )}
          </Card>

          {/* Announcements Feed */}
          <Card className="p-5 space-y-3">
            <CardHeader
              title="Thông Báo Từ Thầy Cô"
              subtitle="Cập nhật dặn dò cho các buổi thực hành"
            />

            {announcements.length === 0 ? (
              <div className="text-xs text-slate-400 py-4 text-center">
                Chưa có thông báo mới nào từ Thầy cô.
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((ann, idx) => (
                  <div key={ann.id ? `${ann.id}_${idx}` : `ann_${idx}`} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <h5 className="text-xs font-bold text-slate-800">{ann.title}</h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{ann.content}</p>
                    <div className="text-[10px] text-slate-400 pt-1">
                      {new Date(ann.createdAt).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
