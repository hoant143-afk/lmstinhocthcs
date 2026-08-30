import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { classService } from '../../services/classService';
import { lessonService } from '../../services/lessonService';
import { progressService } from '../../services/progressService';
import { submissionService } from '../../services/submissionService';
import { ClassEntity, Lesson, LessonProgressSummary, Submission } from '../../types';
import { Card, CardHeader } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import { Badge } from '../../components/common/Badge';
import {
  TrendingUp,
  CheckCircle2,
  FileCheck2,
  Calendar,
  ExternalLink
} from 'lucide-react';

export const StudentProgressPage: React.FC = () => {
  const { studentSession } = useAuth();

  const [cls, setCls] = useState<ClassEntity | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [summaries, setSummaries] = useState<LessonProgressSummary[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (studentSession) {
      loadProgressData();
    }
  }, [studentSession]);

  const loadProgressData = async () => {
    if (!studentSession) return;
    setIsLoading(true);
    try {
      const [classData, lList, subs] = await Promise.all([
        classService.getClassById(studentSession.classId),
        lessonService.getLessonsByClass(studentSession.classId),
        submissionService.getStudentSubmissions(studentSession.studentId)
      ]);

      setCls(classData);
      setLessons(lList);
      setSubmissions(subs);

      const sums: LessonProgressSummary[] = [];
      for (const l of lList) {
        const sum = await progressService.getLessonProgressSummary(studentSession.studentId, l.id);
        sums.push(sum);
      }
      setSummaries(sums);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !studentSession) {
    return <div className="p-8 text-center text-slate-500">Đang tổng hợp bảng kết quả học tập...</div>;
  }

  let totalPercent = 0;
  summaries.forEach(s => { totalPercent += s.percent; });
  const overallAvg = summaries.length > 0 ? Math.round(totalPercent / summaries.length) : 0;

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Bảng Điểm & Nhật Ký Tiến Độ Cá Nhân
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Theo dõi mức độ hoàn thành các chỉ tiêu 30% Online và 70% Thực hành phòng Lab.
        </p>
      </div>

      {/* Top Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="text-2xl font-black text-slate-900">{overallAvg}%</div>
            <div className="text-xs font-medium text-slate-500 mt-0.5">Tổng điểm hoàn thành</div>
            <ProgressBar percent={overallAvg} size="xs" color="emerald" className="mt-2" />
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {summaries.filter(s => s.isCompleted).length} / {lessons.length}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-0.5">Bài học đạt 100%</div>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {submissions.filter(s => s.status === 'graded').length} / {submissions.length}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-0.5">Bài tập đã được chấm</div>
          </div>
        </Card>
      </div>

      {/* Breakdown per Lesson */}
      <Card className="p-6 space-y-4">
        <CardHeader
          title="Chi Tiết Theo Từng Bài Học"
          subtitle="Tỷ lệ hoàn thành các nhiệm vụ bắt buộc"
        />

        <div className="space-y-4 mt-4">
          {lessons.map(l => {
            const sum = summaries.find(s => s.lessonId === l.id);
            const pct = sum?.percent || 0;

            return (
              <div
                key={l.id}
                className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">{l.title}</span>
                    <Badge variant={sum?.isCompleted ? 'green' : pct > 0 ? 'blue' : 'slate'}>
                      {sum?.statusLabel || 'Chưa bắt đầu'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    Đã hoàn thành {sum?.completedTasks || 0} / {sum?.totalTasks || 0} nhiệm vụ
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-32">
                    <div className="text-right text-xs font-bold text-slate-700 mb-1">{pct}%</div>
                    <ProgressBar percent={pct} size="xs" color="emerald" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Submission & Grades History */}
      <Card className="p-6 space-y-4">
        <CardHeader
          title="Nhật Ký Nộp Bài & Nhận Xét Của Thầy Cô"
          subtitle="Điểm số và đánh giá chi tiết cho các sản phẩm 70% Thực hành"
        />

        {submissions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Chưa có bài nộp nào được ghi nhận.
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {submissions.map(sub => (
              <div
                key={sub.id}
                className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        sub.status === 'graded'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {sub.status === 'graded' ? 'Đã chấm điểm' : 'Chờ Thầy cô chấm'}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(sub.submittedAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>

                  {sub.score !== undefined && (
                    <div className="text-sm font-black text-emerald-700">
                      Điểm số: {sub.score} / {sub.maxScore || 10}
                    </div>
                  )}
                </div>

                {sub.url && (
                  <div className="text-xs">
                    <span className="text-slate-500 font-semibold">Đường dẫn sản phẩm: </span>
                    <a
                      href={sub.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      {sub.url}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {sub.feedback && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-900 space-y-1">
                    <span className="font-bold">Nhận xét từ Thầy cô: </span>
                    <p className="italic">{sub.feedback}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
