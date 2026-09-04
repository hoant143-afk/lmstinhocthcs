import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { classService } from '../../services/classService';
import { lessonService } from '../../services/lessonService';
import { progressService } from '../../services/progressService';
import { certificateService } from '../../services/certificateService';
import { ClassEntity, Lesson, Certificate } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ProgressBar } from '../../components/common/ProgressBar';
import {
  Award,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  BookOpen
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

      const lList = await lessonService.getLessonsByClass(cId);
      setLessons(lList);

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

  return (
    <div className="space-y-6 pb-12">
      {/* Class Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              {cls.grade} • {cls.subject}
            </span>
            <span className="text-xs text-slate-500">{cls.schoolYear}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{cls.name}</h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">{cls.description}</p>
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

      {/* Lesson List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Danh Sách Bài Học ({lessons.length})</h2>

        {lessons.length === 0 ? (
          <Card className="p-8 text-center border-dashed border-slate-300">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Chưa có bài học nào được đăng</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Thầy cô phụ trách lớp đang thiết kế bài giảng và bài tập thực hành. Vui lòng quay lại sau!
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {lessons.map((lesson, idx) => {
              const pct = progressMap[lesson.id] || 0;
              const isCompleted = pct === 100;

              return (
                <Card
                  key={lesson.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-emerald-400 transition group"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center shrink-0 border ${
                        isCompleted
                          ? 'bg-emerald-500 text-white border-emerald-600'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-700">
                          {pct}% Hoàn thành
                        </span>
                        {lesson.sequentialLock && (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-blue-600" />
                            Khóa tuần tự
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition">
                        {lesson.title}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-1">{lesson.description}</p>
                      <ProgressBar percent={pct} size="xs" color="emerald" className="w-44 mt-2" />
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={isCompleted ? 'outline' : 'primary'}
                    onClick={() => navigate(`/app/lesson/${lesson.id}`)}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    className="self-end sm:self-center"
                  >
                    {isCompleted ? 'Xem lại' : pct > 0 ? 'Học tiếp' : 'Bắt đầu học'}
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
