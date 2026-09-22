import React, { useState } from 'react';
import {
  GraduationCap,
  BookOpen,
  Mail,
  Lock,
  User,
  School,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import { GoogleVerifyButton, GoogleVerifiedUser } from './GoogleVerifyButton';
import { authService } from '../../services/authService';
import { studentAuthService } from '../../services/studentAuthService';
import { useToast } from '../../contexts/ToastContext';

interface CreateAccountFormProps {
  initialRole?: 'teacher' | 'student';
  onGoToLogin: (role: 'teacher' | 'student', prefillEmail?: string) => void;
}

export const CreateAccountForm: React.FC<CreateAccountFormProps> = ({
  initialRole = 'teacher',
  onGoToLogin
}) => {
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'student'>(initialRole);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [grade, setGrade] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Google verification state
  const [isGoogleVerified, setIsGoogleVerified] = useState(false);
  const [googleUser, setGoogleUser] = useState<GoogleVerifiedUser | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isRegisteredSuccess, setIsRegisteredSuccess] = useState(false);
  const [registeredRole, setRegisteredRole] = useState<'teacher' | 'student'>(initialRole);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const { toastSuccess, toastError } = useToast();

  const handleRoleChange = (newRole: 'teacher' | 'student') => {
    if (newRole !== selectedRole) {
      setSelectedRole(newRole);
      setFormError(null);
      // If user had not verified Google, clear form fields
      if (!isGoogleVerified) {
        setEmail('');
        setFullName('');
      }
      setPassword('');
      setConfirmPassword('');
      setSchoolName('');
      setGrade('');
    }
  };

  const handleGoogleVerified = (user: GoogleVerifiedUser) => {
    setIsGoogleVerified(true);
    setGoogleUser(user);
    setEmail(user.email);
    if (!fullName && user.name) {
      setFullName(user.name);
    }
    setFormError(null);
    toastSuccess('Xác minh tài khoản Google thành công!');
  };

  const handleGoogleReset = () => {
    setIsGoogleVerified(false);
    setGoogleUser(null);
    setEmail('');
    setFormError(null);
  };

  const validateForm = (): string | null => {
    if (!isGoogleVerified || !googleUser) {
      return 'Vui lòng xác minh tài khoản Google trước khi tạo tài khoản.';
    }
    if (!fullName.trim()) {
      return selectedRole === 'teacher'
        ? 'Vui lòng nhập Họ và tên giáo viên.'
        : 'Vui lòng nhập Họ và tên học sinh.';
    }
    if (!email.trim()) {
      return 'Vui lòng nhập địa chỉ Email.';
    }
    if (!password) {
      return 'Vui lòng nhập mật khẩu.';
    }
    if (password.length < 6) {
      return 'Mật khẩu phải có độ dài từ 6 ký tự trở lên.';
    }
    if (password !== confirmPassword) {
      return 'Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.';
    }
    return null;
  };

  const isFormValid =
    isGoogleVerified &&
    fullName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 6 &&
    password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (selectedRole === 'teacher') {
        await authService.registerTeacher({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          googleSub: googleUser?.sub,
          googleVerified: true,
          googleVerifiedAt: new Date().toISOString(),
          emailVerified: true,
          photoURL: googleUser?.picture,
          schoolName: schoolName.trim() || 'Trường THPT & THCS',
          subject: 'Bộ môn',
          title: 'Giáo viên'
        });
      } else {
        const res = await studentAuthService.register({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          googleSub: googleUser?.sub,
          googleVerified: true,
          googleVerifiedAt: new Date().toISOString(),
          emailVerified: true,
          photoURL: googleUser?.picture,
          schoolName: schoolName.trim(),
          grade: grade.trim()
        });
        if (!res.success) {
          throw new Error(res.error || 'Đăng ký tài khoản học sinh không thành công.');
        }
      }

      // Success view (No auto-login)
      setRegisteredRole(selectedRole);
      setRegisteredEmail(email.trim().toLowerCase());
      setIsRegisteredSuccess(true);
      toastSuccess('Tạo tài khoản thành công!');
    } catch (err: any) {
      console.error('[CreateAccountForm] Submit error:', err);
      const msg = err.message || 'Đăng ký tài khoản không thành công. Vui lòng thử lại.';
      setFormError(msg);
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS SCREEN
  if (isRegisteredSuccess) {
    return (
      <div className="py-8 px-4 text-center space-y-6 animate-fadeIn">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center text-emerald-600 shadow-sm">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Tạo tài khoản thành công!
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {registeredRole === 'teacher'
              ? 'Tài khoản giáo viên đã được tạo. Vui lòng đăng nhập để tạo và quản lý lớp học.'
              : 'Tài khoản học sinh đã được tạo. Vui lòng đăng nhập để tham gia lớp học.'}
          </p>
          <div className="pt-1">
            <span className="inline-block px-3 py-1 bg-slate-100 rounded-lg text-xs font-mono font-medium text-slate-700">
              {registeredEmail}
            </span>
          </div>
        </div>

        <div className="pt-2 max-w-sm mx-auto">
          <button
            type="button"
            onClick={() => onGoToLogin(registeredRole, registeredEmail)}
            className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Đến trang đăng nhập</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Segmented Control / Card Role Selector */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
          Chọn loại tài khoản cần tạo
        </label>
        <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => handleRoleChange('teacher')}
            className={`py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
              selectedRole === 'teacher'
                ? 'bg-white text-blue-700 shadow-sm border border-blue-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <GraduationCap className={`w-4 h-4 sm:w-5 sm:h-5 ${selectedRole === 'teacher' ? 'text-blue-600' : 'text-slate-500'}`} />
            <span>GIÁO VIÊN</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange('student')}
            className={`py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
              selectedRole === 'student'
                ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <BookOpen className={`w-4 h-4 sm:w-5 sm:h-5 ${selectedRole === 'student' ? 'text-emerald-600' : 'text-slate-500'}`} />
            <span>HỌC SINH</span>
          </button>
        </div>
      </div>

      {formError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">{formError}</div>
        </div>
      )}

      {/* 2. Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            {selectedRole === 'teacher' ? 'Họ và tên giáo viên' : 'Họ và tên học sinh'} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={selectedRole === 'teacher' ? 'VD: Thầy Nguyễn Văn A' : 'VD: Em Trần Minh Đức'}
              className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
            />
          </div>
        </div>

        {/* Google Verification Section (Required before submit) */}
        <GoogleVerifyButton
          isVerified={isGoogleVerified}
          verifiedUser={googleUser}
          onVerified={handleGoogleVerified}
          onReset={handleGoogleReset}
          disabled={isSubmitting}
        />

        {/* Email Address (Readonly after Google verify) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-700">
              {selectedRole === 'teacher' ? 'Email công tác / trường học' : 'Địa chỉ Email'} <span className="text-red-500">*</span>
            </label>
            {isGoogleVerified && (
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Đã khóa từ Google
              </span>
            )}
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              required
              readOnly={isGoogleVerified}
              value={email}
              onChange={(e) => !isGoogleVerified && setEmail(e.target.value)}
              placeholder="name@school.edu.vn hoặc name@gmail.com"
              className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border transition ${
                isGoogleVerified
                  ? 'bg-slate-100/90 text-slate-700 border-slate-300 font-mono cursor-not-allowed select-none'
                  : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600'
              }`}
            />
          </div>
          {!isGoogleVerified && (
            <p className="text-[11px] text-slate-400">
              Email sẽ tự động được điền và bảo vệ sau khi bạn bấm Xác minh tài khoản Google.
            </p>
          )}
        </div>

        {/* Student Optional Fields: School & Grade */}
        {selectedRole === 'student' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Trường học <span className="text-slate-400 font-normal">(không bắt buộc)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <School className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="VD: THCS Chu Văn An"
                  className="w-full pl-10 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Lớp hiện tại <span className="text-slate-400 font-normal">(không bắt buộc)</span>
              </label>
              <input
                type="text"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="VD: 8A1, 9B..."
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
              />
            </div>
          </div>
        )}

        {/* Password */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            Mật khẩu <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {password && password.length < 6 && (
            <p className="text-[11px] text-amber-600">Mật khẩu cần tối thiểu 6 ký tự.</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            Xác nhận mật khẩu <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmPassword && password !== confirmPassword && (
            <p className="text-[11px] text-red-500">Mật khẩu xác nhận không khớp.</p>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-3">
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className={`w-full py-3 px-4 font-semibold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 ${
              isFormValid && !isSubmitting
                ? selectedRole === 'teacher'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-blue-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-emerald-600/20'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang tạo tài khoản...</span>
              </>
            ) : (
              <>
                <span>{selectedRole === 'teacher' ? 'Tạo tài khoản giáo viên' : 'Tạo tài khoản học sinh'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Login redirect link */}
        <div className="pt-2 text-center text-xs text-slate-500">
          <span>Đã có tài khoản? </span>
          <button
            type="button"
            onClick={() => onGoToLogin(selectedRole)}
            className="font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          >
            Đăng nhập ngay
          </button>
        </div>
      </form>
    </div>
  );
};
