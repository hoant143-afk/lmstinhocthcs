import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { studentService } from '../../services/studentService';
import { EnrolledClassInfo } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import {
  User,
  Mail,
  Calendar,
  Lock,
  BookOpen,
  LogOut,
  Save,
  CheckCircle2,
  AlertCircle,
  Key,
  Shield,
  ArrowRight,
  Loader2
} from 'lucide-react';

export const StudentProfilePage: React.FC = () => {
  const { student, studentSession, updateStudentProfile, logoutStudent } = useAuth();
  const { toastSuccess, toastError } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(student?.fullName || studentSession?.fullName || '');
  const [avatarUrl, setAvatarUrl] = useState(student?.avatarUrl || studentSession?.avatarUrl || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [enrolledClasses, setEnrolledClasses] = useState<EnrolledClassInfo[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);

  useEffect(() => {
    if (student) {
      setFullName(student.fullName);
      setAvatarUrl(student.avatarUrl || '');
    } else if (studentSession) {
      setFullName(studentSession.fullName);
      setAvatarUrl(studentSession.avatarUrl || '');
    }
  }, [student, studentSession]);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    setIsLoadingClasses(true);
    try {
      const list = await studentService.getMyEnrolledClasses();
      setEnrolledClasses(list);
    } catch (err) {
      console.error('Error loading enrolled classes:', err);
    } finally {
      setIsLoadingClasses(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toastError('Vui lòng nhập Họ và tên.');
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateStudentProfile({
        fullName: fullName.trim(),
        avatarUrl: avatarUrl.trim()
      });
      toastSuccess('Đã cập nhật thông tin cá nhân thành công!');
    } catch (err: any) {
      toastError(err.message || 'Không thể cập nhật thông tin.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword) {
      toastError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (newPassword.length < 6) {
      toastError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toastError('Xác nhận mật khẩu mới không khớp.');
      return;
    }

    setIsChangingPass(true);
    try {
      await updateStudentProfile({
        oldPassword,
        newPassword
      });
      toastSuccess('Đã đổi mật khẩu thành công!');
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      toastError(err.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra mật khẩu hiện tại.');
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất tài khoản học sinh?')) {
      await logoutStudent();
      toastSuccess('Đã đăng xuất tài khoản học sinh.');
      navigate('/app/login', { replace: true });
    }
  };

  const formattedDate = student?.createdAt
    ? new Date(student.createdAt).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    : 'Mới đăng ký';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header Profile Summary */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-3xl font-bold ring-4 ring-white shadow-md overflow-hidden">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={fullName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '';
                }}
              />
            ) : (
              fullName.charAt(0).toUpperCase() || 'H'
            )}
          </div>
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{fullName}</h1>
              <p className="text-sm text-slate-500 flex items-center justify-center sm:justify-start gap-1.5 mt-0.5">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{student?.email || studentSession?.email}</span>
              </p>
            </div>

            <Button
              variant="outline"
              onClick={handleLogout}
              className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 text-sm flex items-center justify-center gap-2 self-center sm:self-auto"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất</span>
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Tham gia: {formattedDate}
            </span>
            <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md font-medium">
              <BookOpen className="w-3.5 h-3.5" />
              Đang tham gia: {enrolledClasses.length} lớp học
            </span>
            <span className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md text-slate-400 font-mono">
              ID: {student?.id || studentSession?.studentId}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Edit Profile */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Thông tin cá nhân</h2>
              <p className="text-xs text-slate-500">Cập nhật họ tên và ảnh đại diện hiển thị cho Thầy/Cô</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Họ và tên
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Địa chỉ Email (Cố định theo tài khoản)
              </label>
              <input
                type="email"
                disabled
                value={student?.email || studentSession?.email || ''}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
              />
              <p className="text-xs text-slate-400">Email dùng để đăng nhập và nhận thông báo học tập.</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Đường dẫn ảnh đại diện (Avatar URL)
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={isSavingProfile}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium flex items-center justify-center gap-2"
              >
                {isSavingProfile ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Lưu thay đổi</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>

        {/* Right Column: Change Password */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Đổi mật khẩu</h2>
              <p className="text-xs text-slate-500">Bảo vệ tài khoản với mật khẩu an toàn</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Mật khẩu hiện tại
              </label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Mật khẩu mới (tối thiểu 6 ký tự)
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Xác nhận mật khẩu mới
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="outline"
                disabled={isChangingPass}
                className="w-full py-2 border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium flex items-center justify-center gap-2"
              >
                {isChangingPass ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang cập nhật...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <span>Cập nhật mật khẩu mới</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Enrolled Classes List */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Lớp học của tôi</h2>
              <p className="text-xs text-slate-500">Các lớp học bạn đã tham gia bằng mã lớp</p>
            </div>
          </div>

          <Link to="/app">
            <Button variant="outline" size="sm" className="text-xs text-emerald-700 border-emerald-200">
              Tham gia thêm lớp
            </Button>
          </Link>
        </div>

        {isLoadingClasses ? (
          <div className="py-8 flex justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : enrolledClasses.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <p className="text-sm text-slate-500">Bạn chưa tham gia lớp học nào.</p>
            <Link to="/app">
              <Button variant="primary" size="sm" className="bg-emerald-600 text-white">
                Đến Bàn học để nhập mã lớp
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {enrolledClasses.map((item) => (
              <div
                key={item.enrollment.id}
                className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 transition-all bg-slate-50/50 hover:bg-white flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {item.classEntity.classCode}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {item.classEntity.subject}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 line-clamp-1">{item.classEntity.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {item.teacher?.fullName || 'Giáo viên'} • {item.lessonCount} bài học
                  </p>
                </div>

                <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-600">
                    {item.progressPercent}% hoàn thành
                  </span>
                  <Link to={`/app/class/${item.classEntity.id}`}>
                    <Button size="sm" variant="primary" className="text-xs py-1 px-3 bg-emerald-600 text-white">
                      Vào lớp
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
