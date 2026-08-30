import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { certificateService } from '../../services/certificateService';
import { classService } from '../../services/classService';
import { Certificate, ClassEntity } from '../../types';
import { Button } from '../../components/common/Button';
import {
  Award,
  Printer,
  ArrowLeft,
  Sparkles,
  QrCode
} from 'lucide-react';

export const StudentCertificatePage: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const { studentSession, teacher } = useAuth();
  const navigate = useNavigate();

  const [cls, setCls] = useState<ClassEntity | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!studentSession) {
      navigate('/app/join');
      return;
    }
    const targetClassId = classId || studentSession.classId;
    loadCert(targetClassId);
  }, [classId, studentSession]);

  const loadCert = async (cId: string) => {
    if (!studentSession) return;
    setIsLoading(true);
    try {
      const classData = await classService.getClassById(cId);
      setCls(classData);

      // Check or issue certificate
      const cert = await certificateService.checkAndIssueCertificate(studentSession.studentId, cId);
      setCertificate(cert);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading || !cls || !studentSession) {
    return <div className="p-8 text-center text-slate-500">Đang tải chứng nhận...</div>;
  }

  if (!certificate) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <Award className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Chưa Đủ Điều Kiện Nhận Chứng Nhận</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          Bạn cần hoàn thành 100% các nhiệm vụ 30% Online và được Thầy cô nghiệm thu 70% Thực hành tại lớp để nhận Giấy Chứng Nhận chính thức.
        </p>
        <Button onClick={() => navigate('/app')}>Quay Lại Bàn Học</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Top Action Bar (hidden during print) */}
      <div className="flex items-center justify-between print:hidden">
        <Link to="/app" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700">
          <ArrowLeft className="w-4 h-4" />
          Quay lại Bàn học
        </Link>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            In / Lưu PDF
          </Button>
        </div>
      </div>

      {/* Official Printable Certificate Canvas */}
      <div className="max-w-4xl mx-auto bg-white rounded-3xl p-8 sm:p-14 shadow-2xl border-8 border-double border-amber-300 relative overflow-hidden text-slate-900 print:shadow-none print:border-amber-400 print:p-8">
        {/* Background watermark & ornaments */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50/50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-50/50 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

        <div className="relative z-10 text-center space-y-6">
          {/* Header Title */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-700 bg-amber-100/70 px-4 py-1 rounded-full border border-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>HỆ THỐNG GIÁO DỤC SMART BLENDED LMS</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-serif font-black uppercase text-slate-900 tracking-wide mt-2">
              Giấy Chứng Nhận Hoàn Thành
            </h1>
            <p className="text-xs sm:text-sm uppercase tracking-widest text-slate-500 font-semibold">
              Certificate of Blended Learning Completion
            </p>
          </div>

          <div className="w-24 h-0.5 bg-amber-400 mx-auto" />

          {/* Recipient Statement */}
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-600 italic">Chứng nhận em:</p>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight font-serif text-blue-900">
              {studentSession.fullName}
            </h2>
            <p className="text-xs text-slate-500">Mã học sinh: <span className="font-mono">{studentSession.studentId}</span></p>
          </div>

          <div className="max-w-2xl mx-auto space-y-3 text-sm text-slate-700 leading-relaxed">
            <p>
              Đã xuất sắc hoàn thành toàn bộ khóa học kết hợp:
            </p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              {cls.name}
            </h3>
            <p className="text-xs text-slate-600">
              Môn học: <strong className="text-slate-800">{cls.subject}</strong> • Khối: <strong className="text-slate-800">{cls.grade}</strong> • Năm học: <strong className="text-slate-800">{cls.schoolYear}</strong>
            </p>
            <div className="inline-block p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 mt-2 font-medium">
              Đạt chuẩn mô hình giáo dục đổi mới: <strong>30% Tự học Online (Video Anti-Seek & Quiz)</strong> và <strong>70% Hoạt động Thực hành, Dự án phòng Lab tại lớp</strong>.
            </div>
          </div>

          {/* Footer Seals & Verification */}
          <div className="pt-8 border-t border-slate-200 grid grid-cols-3 gap-6 items-end text-center">
            {/* Verification QR / Code */}
            <div className="text-left space-y-1">
              <div className="w-16 h-16 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-xs">
                <QrCode className="w-10 h-10" />
              </div>
              <div className="text-[10px] font-mono text-slate-400 font-bold">
                MÃ SỐ: {certificate.certificateCode}
              </div>
              <div className="text-[9px] text-slate-400">
                Xác thực số: {new Date(certificate.issuedAt).toLocaleDateString('vi-VN')}
              </div>
            </div>

            {/* Gold Seal Medallion */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 border-4 border-amber-600 flex items-center justify-center text-amber-950 shadow-md">
                <Award className="w-10 h-10" />
              </div>
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-800 mt-1">
                CHỨNG NHẬN ĐẠT CHUẨN
              </div>
            </div>

            {/* Teacher Signature */}
            <div className="text-right space-y-1">
              <div className="text-xs text-slate-500">Giáo viên phụ trách</div>
              <div className="h-10 flex items-center justify-end font-serif italic text-base font-bold text-blue-900">
                {teacher?.fullName || 'Nguyễn Văn Hoàng'}
              </div>
              <div className="text-xs font-bold text-slate-800">
                {teacher?.fullName || 'Thầy Nguyễn Văn Hoàng'}
              </div>
              <div className="text-[10px] text-slate-400">
                {teacher?.schoolName || 'THPT Chuyên Lê Hồng Phong'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
