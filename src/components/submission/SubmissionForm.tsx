import React, { useState } from 'react';
import { Submission } from '../../types';
import { submissionService } from '../../services/submissionService';
import { Button } from '../common/Button';
import { Input, Textarea } from '../common/Input';
import { useToast } from '../../contexts/ToastContext';
import { Send, CheckCircle2, ExternalLink, FileCode, Clock } from 'lucide-react';

interface SubmissionFormProps {
  taskId: string;
  lessonId: string;
  classId: string;
  studentId: string;
  existingSubmission?: Submission | null;
  onSubmitted?: (submission: Submission) => void;
}

export const SubmissionForm: React.FC<SubmissionFormProps> = ({
  taskId,
  lessonId,
  classId,
  studentId,
  existingSubmission,
  onSubmitted
}) => {
  const { toastSuccess, toastWarning, toastError } = useToast();
  const [url, setUrl] = useState(existingSubmission?.url || '');
  const [text, setText] = useState(existingSubmission?.text || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() && !text.trim()) {
      toastWarning('Vui lòng nhập đường dẫn liên kết sản phẩm hoặc nội dung bài làm');
      return;
    }

    setIsSubmitting(true);
    try {
      const sub = await submissionService.submitAssignment({
        taskId,
        lessonId,
        classId,
        studentId,
        url: url.trim(),
        text: text.trim()
      });

      toastSuccess('Đã nộp bài tập thực hành thành công!');
      onSubmitted?.(sub);
    } catch (err) {
      console.error(err);
      toastError('Lỗi khi nộp bài tập');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {existingSubmission && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                {existingSubmission.status === 'graded'
                  ? `Đã được chấm: ${existingSubmission.score}/${existingSubmission.maxScore || 10} điểm`
                  : 'Đã nộp bài - Đang chờ Thầy cô chấm điểm'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(existingSubmission.submittedAt).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit'
              })}
            </span>
          </div>

          {existingSubmission.url && (
            <div className="text-xs text-slate-600">
              <span>Liên kết đã nộp: </span>
              <a
                href={existingSubmission.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-1"
              >
                {existingSubmission.url}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {existingSubmission.feedback && (
            <div className="p-3 bg-white rounded-xl border border-emerald-100 text-xs text-emerald-950 mt-2">
              <strong className="font-bold">Nhận xét của Giáo viên: </strong>
              <span>{existingSubmission.feedback}</span>
            </div>
          )}
        </div>
      )}

      {/* Submission Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <FileCode className="w-4 h-4 text-blue-600" />
          <span>{existingSubmission ? 'Nộp Lại Hoặc Cập Nhật Sản Phẩm' : 'Nộp Bài Tập / Đường Dẫn Sản Phẩm'}</span>
        </h4>

        <Input
          label="Đường Dẫn Sản Phẩm (Google Drive, Docs, Canva, Scratch, GitHub...)"
          placeholder="https://drive.google.com/... hoặc https://canva.com/..."
          value={url}
          onChange={e => setUrl(e.target.value)}
        />

        <Textarea
          label="Ghi Chú / Báo Cáo Sản Phẩm Của Em"
          rows={3}
          placeholder="Tóm tắt nội dung em đã thực hiện trong buổi học thực hành..."
          value={text}
          onChange={e => setText(e.target.value)}
        />

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            isLoading={isSubmitting}
            leftIcon={<Send className="w-4 h-4" />}
          >
            {existingSubmission ? 'Cập Nhật Bài Nộp' : 'Nộp Bài Cho Thầy Cô'}
          </Button>
        </div>
      </form>
    </div>
  );
};
