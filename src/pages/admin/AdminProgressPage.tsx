import React, { useState, useEffect } from 'react';
import { classService } from '../../services/classService';
import { lessonService } from '../../services/lessonService';
import { studentService } from '../../services/studentService';
import { progressService } from '../../services/progressService';
import { certificateService } from '../../services/certificateService';
import { taskRepo } from '../../repositories/LocalStorageRepository';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ClassEntity, Lesson, Student, Task } from '../../types';
import { Card, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import {
  TrendingUp,
  Award,
  CheckCircle2,
  Clock,
  Sparkles,
  Users,
  Search,
  School
} from 'lucide-react';

export const AdminProgressPage: React.FC = () => {
  const { teacher } = useAuth();
  const { toastSuccess, toastError } = useToast();

  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [matrix, setMatrix] = useState<Record<string, Record<string, number>>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    loadClasses();
  }, [teacher]);

  const loadClasses = async () => {
    if (!teacher) return;
    setIsLoading(true);
    try {
      const clsList = await classService.getTeacherClasses(teacher.id);
      setClasses(clsList);
      if (clsList.length > 0) {
        setSelectedClassId(clsList[0].id);
        loadClassMatrix(clsList[0].id);
      }
    } catch (err) {
      console.error(err);
      toastError('Lỗi khi tải danh sách lớp');
    } finally {
      setIsLoading(false);
    }
  };

  const loadClassMatrix = async (cId: string) => {
    setIsLoading(true);
    try {
      const [lList, sList] = await Promise.all([
        lessonService.getLessonsByClass(cId),
        studentService.getStudentsByClass(cId)
      ]);

      setLessons(lList);
      setStudents(sList);

      let allT: Task[] = [];
      const mat: Record<string, Record<string, number>> = {};

      for (const l of lList) {
        const tList = await taskRepo.getByLessonId(l.id);
        allT = [...allT, ...tList];

        for (const st of sList) {
          const summary = await progressService.getLessonProgressSummary(st.id, l.id);
          if (!mat[st.id]) mat[st.id] = {};
          mat[st.id][l.id] = summary.percent;
        }
      }

      setTasks(allT);
      setMatrix(mat);
    } catch (err) {
      console.error(err);
      toastError('Lỗi khi tải ma trận tiến độ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClassChange = (cId: string) => {
    setSelectedClassId(cId);
    loadClassMatrix(cId);
  };

  const handleTeacherSignOff = async (studentId: string, lessonId: string, taskId: string) => {
    if (!teacher) return;
    try {
      await progressService.confirmTeacherOfflineActivity(studentId, lessonId, taskId, teacher.id);
      toastSuccess('Đã xác nhận hoàn thành hoạt động thực hành trực tiếp!');
      loadClassMatrix(selectedClassId);
    } catch (err) {
      toastError('Lỗi xác nhận hoạt động');
    }
  };

  const filteredStudents = students.filter(st =>
    st.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Báo Cáo Tiến Độ & Nghiệm Thu Trực Tiếp (70%)
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Theo dõi mức độ hoàn thành bài học 30% Online và xác nhận các bài thực hành phòng Lab tại lớp
        </p>
      </div>

      {/* Selector & Search Bar */}
      <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-bold uppercase text-slate-600 shrink-0">Lớp học:</label>
          <select
            value={selectedClassId}
            onChange={e => handleClassChange(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-semibold bg-white"
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.grade})</option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm theo tên học sinh..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-blue-500 outline-none"
          />
        </div>
      </Card>

      {/* Matrix Table */}
      {filteredStudents.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="Chưa có dữ liệu học sinh"
          description="Học sinh sau khi nhập mã lớp tham gia sẽ hiển thị toàn bộ tiến độ tại đây."
        />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">Học Sinh</th>
                  <th className="px-5 py-4 text-center">Tiến độ chung</th>
                  {lessons.map(l => (
                    <th key={l.id} className="px-5 py-4 text-center max-w-[150px] truncate">
                      {l.title.split(':')[0] || l.title}
                    </th>
                  ))}
                  <th className="px-5 py-4 text-center">Chứng chỉ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map(st => {
                  // Calculate average percent across all lessons
                  let sum = 0;
                  lessons.forEach(l => {
                    sum += matrix[st.id]?.[l.id] || 0;
                  });
                  const avgPercent = lessons.length > 0 ? Math.round(sum / lessons.length) : 0;
                  const isEligibleCert = avgPercent === 100;

                  return (
                    <tr key={st.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-4 font-bold text-slate-800 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-bold">
                          {st.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div>{st.fullName}</div>
                          <div className="text-[10px] text-slate-400 font-normal">Tham gia: {new Date(st.joinedAt).toLocaleDateString('vi-VN')}</div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 font-bold text-xs">
                          <span
                            className={`px-2.5 py-1 rounded-full ${
                              avgPercent === 100
                                ? 'bg-emerald-100 text-emerald-800'
                                : avgPercent > 0
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {avgPercent}%
                          </span>
                        </div>
                      </td>

                      {lessons.map(l => {
                        const pct = matrix[st.id]?.[l.id] || 0;
                        return (
                          <td key={l.id} className="px-5 py-4 text-center">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold ${
                                pct === 100
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : pct > 0
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'text-slate-400 bg-slate-50'
                              }`}
                            >
                              {pct}%
                            </span>
                          </td>
                        );
                      })}

                      <td className="px-5 py-4 text-center">
                        {isEligibleCert ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                            <Award className="w-3.5 h-3.5 text-amber-600" />
                            Đủ điều kiện
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Chưa hoàn thành</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
