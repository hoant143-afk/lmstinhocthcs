import React, { useState } from 'react';
import { QuizQuestion } from '../../types';
import { Button } from '../common/Button';
import { CheckCircle2, XCircle, AlertCircle, Award, RotateCcw, HelpCircle } from 'lucide-react';
import { progressService } from '../../services/progressService';
import { useToast } from '../../contexts/ToastContext';

interface QuizPlayerProps {
  questions: QuizQuestion[];
  minPassScorePercent?: number;
  studentId: string;
  lessonId: string;
  taskId: string;
  initialScore?: number;
  initialMaxScore?: number;
  onPassed?: () => void;
}

export const QuizPlayer: React.FC<QuizPlayerProps> = ({
  questions = [],
  minPassScorePercent = 70,
  studentId,
  lessonId,
  taskId,
  initialScore,
  initialMaxScore,
  onPassed
}) => {
  const { toastSuccess, toastWarning } = useToast();
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [shortAnswers, setShortAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(initialScore !== undefined && initialScore > 0);
  const [result, setResult] = useState<{
    score: number;
    maxScore: number;
    percent: number;
    passed: boolean;
  } | null>(
    initialScore !== undefined && initialMaxScore !== undefined && initialMaxScore > 0
      ? {
          score: initialScore,
          maxScore: initialMaxScore,
          percent: Math.round((initialScore / initialMaxScore) * 100),
          passed: Math.round((initialScore / initialMaxScore) * 100) >= minPassScorePercent
        }
      : null
  );

  const handleOptionSelect = (questionId: string, optionId: string) => {
    if (isSubmitted) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const handleShortAnswerChange = (questionId: string, text: string) => {
    if (isSubmitted) return;
    setShortAnswers(prev => ({
      ...prev,
      [questionId]: text
    }));
  };

  const handleSubmitQuiz = async () => {
    let earnedPoints = 0;
    let totalPoints = 0;

    questions.forEach(q => {
      const qPoints = q.points || 10;
      totalPoints += qPoints;

      if (q.type === 'multiple_choice' || q.type === 'true_false') {
        const chosenOptId = selectedAnswers[q.id];
        const correctOpt = q.options?.find(o => o.isCorrect);
        if (chosenOptId && correctOpt && chosenOptId === correctOpt.id) {
          earnedPoints += qPoints;
        }
      } else if (q.type === 'short_answer') {
        const studentText = (shortAnswers[q.id] || '').trim().toLowerCase();
        const expected = (q.correctAnswerText || '').trim().toLowerCase();
        if (studentText && expected && (studentText === expected || studentText.includes(expected))) {
          earnedPoints += qPoints;
        }
      }
    });

    const res = await progressService.saveQuizResult(
      studentId,
      lessonId,
      taskId,
      earnedPoints,
      totalPoints,
      minPassScorePercent
    );

    const quizRes = {
      score: earnedPoints,
      maxScore: totalPoints,
      percent: res.scorePercent,
      passed: res.passed
    };

    setResult(quizRes);
    setIsSubmitted(true);

    if (res.passed) {
      toastSuccess(`Chúc mừng! Bạn đã đạt ${res.scorePercent}% điểm và hoàn thành bài kiểm tra.`);
      onPassed?.();
    } else {
      toastWarning(`Bạn đạt ${res.scorePercent}% (yêu cầu ≥ ${minPassScorePercent}%). Hãy xem giải thích và làm lại nhé!`);
    }
  };

  const handleRetry = () => {
    setSelectedAnswers({});
    setShortAnswers({});
    setIsSubmitted(false);
    setResult(null);
  };

  if (questions.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500">
        <HelpCircle className="w-8 h-8 mx-auto text-slate-400 mb-2" />
        Chưa có câu hỏi trắc nghiệm nào cho nhiệm vụ này.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Result Banner */}
      {result && (
        <div
          className={`p-6 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
            result.passed
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                result.passed ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
              }`}
            >
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-bold">
                {result.passed ? '🎉 Chúc mừng! Đã đạt yêu cầu' : 'Chưa đạt điểm tối thiểu'}
              </h4>
              <p className="text-sm opacity-90">
                Điểm số: <span className="font-bold">{result.score} / {result.maxScore}</span> ({result.percent}%) — Yêu cầu vượt qua: ≥ {minPassScorePercent}%
              </p>
            </div>
          </div>

          {!result.passed && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              Làm lại bài kiểm tra
            </Button>
          )}
        </div>
      )}

      {/* Question List */}
      <div className="space-y-6">
        {questions.map((q, idx) => {
          const selectedOptionId = selectedAnswers[q.id];
          const correctOption = q.options?.find(o => o.isCorrect);

          return (
            <div
              key={q.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 text-sm font-bold flex items-center justify-center shrink-0 border border-blue-100">
                    {idx + 1}
                  </span>
                  <h4 className="text-base font-semibold text-slate-800 leading-snug">
                    {q.question}
                  </h4>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                  {q.points || 10} điểm
                </span>
              </div>

              {/* Options */}
              {(q.type === 'multiple_choice' || q.type === 'true_false') && q.options && (
                <div className="space-y-2.5 pt-1">
                  {q.options.map(opt => {
                    const isSelected = selectedOptionId === opt.id;
                    let optionStyle = 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/30';

                    if (isSubmitted) {
                      if (opt.isCorrect) {
                        optionStyle = 'border-emerald-500 bg-emerald-50/70 text-emerald-900 font-semibold';
                      } else if (isSelected && !opt.isCorrect) {
                        optionStyle = 'border-rose-400 bg-rose-50/70 text-rose-900';
                      } else {
                        optionStyle = 'border-slate-100 opacity-60';
                      }
                    } else if (isSelected) {
                      optionStyle = 'border-blue-600 bg-blue-50 text-blue-900 font-semibold shadow-xs';
                    }

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleOptionSelect(q.id, opt.id)}
                        disabled={isSubmitted}
                        className={`w-full text-left p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${optionStyle}`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'border-blue-600 bg-blue-600'
                                : 'border-slate-300'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <span className="text-sm leading-relaxed">{opt.text}</span>
                        </div>

                        {isSubmitted && opt.isCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                        {isSubmitted && isSelected && !opt.isCorrect && (
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Short answer input */}
              {q.type === 'short_answer' && (
                <div className="pt-1">
                  <input
                    type="text"
                    value={shortAnswers[q.id] || ''}
                    onChange={e => handleShortAnswerChange(q.id, e.target.value)}
                    disabled={isSubmitted}
                    placeholder="Nhập câu trả lời ngắn của bạn..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  {isSubmitted && q.correctAnswerText && (
                    <p className="text-xs text-slate-500 mt-2">
                      Đáp án đúng: <span className="font-semibold text-emerald-600">{q.correctAnswerText}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Explanation note */}
              {isSubmitted && q.explanation && (
                <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800">Giải thích: </span>
                    {q.explanation}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Submit Action */}
      {!isSubmitted && (
        <div className="flex justify-end pt-2">
          <Button
            size="lg"
            onClick={handleSubmitQuiz}
            disabled={Object.keys(selectedAnswers).length === 0 && Object.keys(shortAnswers).length === 0}
          >
            Nộp bài kiểm tra
          </Button>
        </div>
      )}
    </div>
  );
};
