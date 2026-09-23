import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { classService, sanitizeClassDescription } from '../../services/classService';
import { lessonService } from '../../services/lessonService';
import { progressService } from '../../services/progressService';
import { certificateService } from '../../services/certificateService';
import { ClassEntity, Lesson, Certificate, CourseModeStats } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ProgressBar } from '../../components/common/ProgressBar';
import { LearningModeBadge } from '../../components/common/Badge';
import {
  Award,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  Video,
  Monitor
} from 'lucide-react';

export const StudentClassPage: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const { studentSession } = useAuth();
  const { toastWarning } = useToast();
  const navigate = useNavigate();

  const [cls, setCls] = useState<ClassEntity | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [modeStats, setModeStats] = useState<CourseModeStats | null>(null);
  const [modeFilter, setModeFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!studentSession) {
      navigate('/app/join');
      return;
    }
    const targetClassId = classId || studentSession.classId;
    loadClassDetails(targetClassId);
  }, [classId, studentSession]);

  const loadClassDetails = async (cId: string) => {
    if (!studentSession) return;
    setIsLoading(true);
    try {
      const classData = await classService.getClassById(cId);
      if (!classData) {
        toastWarning('Không tìm thấy lớp học');
        navigate('/app');
        return;
      }
      setCls(classData);

      const [lList, stats] = await Promise.all([
        lessonService.getLessonsByClass(cId),
        classService.getLearningModeStats(cId)
      ]);
      setLessons(lList);
      setModeStats(stats);

      const pMap: Record<string, number> = {};
      for (const l of lList) {
        const sum = await progressService.getLessonProgressSummary(studentSession.studentId, l.id);
        pMap[l.id] = sum.percent;
      }
      setProgressMap(pMap);

      const certs = await certificateService.getStudentCertificates(studentSession.studentId);
      const found = certs.find(c => c.classId === cId);
      setCertificate(found || null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !cls || !studentSession) {
    return <div className="p-8 text-center text-slate-500">Đang tải thông tin lớp học...</div>;
  }

  let totalPct = 0;
  lessons.forEach(l => { totalPct += progressMap[l.id] || 0; });
  const overallAvg = lessons.length > 0 ? Math.round(totalPct / lessons.length) : 0;

  const filteredLessons = lessons.filter(l => {
    if (modeFilter === 'all') return true;
    return l.learningMode === modeFilter;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Class Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
              {cls.grade} • {cls.subject}
            </span>
            <span className="text-xs text-slate-500">{cls.schoolYear}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{cls.name}</h1>
          {sanitizeClassDescription(cls.description) ? (
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">{sanitizeClassDescription(cls.description)}</p>
          ) : null}
        </div>

        {/* Certificate Eligibility Status */}
        {cls.certificateEnabled && (
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-center shrink-0">
            <Award className="w-8 h-8 text-amber-600 mx-auto mb-1" />
            <div className="text-xs font-bold text-slate-800">Chứng nhận Khóa học</div>
            <div className="text-[11px] text-amber-800 font-semibold mt-0.5">
              {overallAvg === 100 ? 'Đã sẵn sàng nhận' : `Đạt 100% để mở (${overallAvg}%)`}
            </div>
            {overallAvg === 100 && (
              <Button
                size="sm"
                variant="amber"
                onClick={() => navigate(`/app/certificate/${cls.id}`)}
                className="mt-2 text-xs"
              >
                Nhận Chứng Nhận
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Class Blended Ratio Card */}
      {modeStats && modeStats.totalLessons > 0 && (
        <Card className="p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold uppercase text-slate-400">Hình Thức Khóa Học Kết Hợp</div>
              <div className="text-sm font-bold text-slate-800">
                {modeStats.onlineCount} Buổi Online • {modeStats.offlineCount} Buổi Trực Tiếp
              </div>
            </div>
            <div className="text-xs text-slate-500">
              {cls.courseStartDate && (
                <span>Thời gian: {cls.courseStartDate} – {cls.courseEndDate || ''}</span>
              )}
            </div>
          </div>

          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${modeStats.onlinePercent}%` }}
              className="bg-blue-600 h-full transition-all"
            />
            <div
              style={{ width: `${modeStats.offlinePercent}%` }}
              className="bg-emerald-500 h-full transition-all"
            />
          </div>
        </Card>
      )}

      {/* Lesson List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900">Thời Khóa Biểu & Bài Học ({lessons.length})</h2>

          {/* Mode Filter */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs font-bold self-start sm:self-auto">
            <button
              onClick={() => setModeFilter('all')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                modeFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
            >
              Tất cả ({lessons.length})
            </button>
            <button
              onClick={() => setModeFilter('online')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                modeFilter === 'online' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500'
              }`}
            >
              Online ({modeStats?.onlineCount || 0})
            </button>
            <button
              onClick={() => setModeFilter('offline')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                modeFilter === 'offline' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500'
              }`}
            >
              Trực tiếp ({modeStats?.offlineCount || 0})
            </button>
          </div>
        </div>

        {filteredLessons.length === 0 ? (
          <Card className="p-8 text-center border-dashed border-slate-300">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Chưa có bài học nào được đăng</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Thầy cô phụ trách lớp đang thiết kế bài giảng và bài tập thực hành. Vui lòng quay lại sau!
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredLessons.map((lesson, idx) => {
              const pct = progressMap[lesson.id] || 0;
              const isCompleted = pct === 100;

              return (
                <Card
                  key={lesson.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-blue-400 transition group"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center shrink-0 border ${
                        isCompleted
                          ? 'bg-emerald-500 text-white border-emerald-600'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : lesson.orderIndex || idx + 1}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <LearningModeBadge mode={lesson.learningMode} />
                        <span className="text-xs font-bold text-slate-700">
                          {pct}% Hoàn thành
                        </span>
                        {lesson.scheduledDate && (
                          <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {lesson.scheduledDate} {lesson.startTime && `(${lesson.startTime} - ${lesson.endTime || ''})`}
                          </span>
                        )}
                        {lesson.sequentialLock && (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-blue-600" />
                            Khóa tuần tự
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition">
                        {lesson.title}
                      </h3>

                      {lesson.description && (
                        <p className="text-xs text-slate-500 line-clamp-1">{lesson.description}</p>
                      )}

                      {/* Location / Meeting preview */}
                      <div className="text-xs text-slate-500 pt-1">
                        {lesson.learningMode === 'online' ? (
                          lesson.onlineMeetingUrl ? (
                            <span className="text-blue-600 font-medium flex items-center gap-1">
                              <Video className="w-3 h-3" />
                              Học Online qua link lớp
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Học Online theo video bài giảng</span>
                          )
                        ) : (
                          <span className="text-emerald-700 font-medium flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {lesson.location || 'Tại phòng thực hành của trường'}
                          </span>
                        )}
                      </div>

                      <ProgressBar percent={pct} size="xs" color={isCompleted ? 'emerald' : 'blue'} className="w-44 mt-2" />
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={isCompleted ? 'outline' : 'primary'}
                    onClick={() => navigate(`/app/lesson/${lesson.id}`)}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    className="self-end sm:self-center"
                  >
                    {isCompleted ? 'Xem lại' : pct > 0 ? 'Học tiếp' : 'Vào học'}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
