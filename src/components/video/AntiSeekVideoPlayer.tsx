import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, FastForward, ShieldAlert, CheckCircle2, Lock } from 'lucide-react';
import { videoProgressService } from '../../services/videoProgressService';
import { useToast } from '../../contexts/ToastContext';
import { VideoProgress } from '../../types';

interface AntiSeekVideoPlayerProps {
  videoUrl?: string;
  studentId: string;
  lessonId: string;
  taskId: string;
  initialVideoProgress?: VideoProgress;
  onProgressUpdate?: (prog: VideoProgress) => void;
  onCompleted?: () => void;
}

export const AntiSeekVideoPlayer: React.FC<AntiSeekVideoPlayerProps> = ({
  videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  studentId,
  lessonId,
  taskId,
  initialVideoProgress,
  onProgressUpdate,
  onCompleted
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const { toastWarning, toastSuccess } = useToast();

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(initialVideoProgress?.currentTime || 0);
  const [maxWatchedTime, setMaxWatchedTime] = useState<number>(initialVideoProgress?.maxWatchedTime || 0);
  const [duration, setDuration] = useState<number>(initialVideoProgress?.duration || 0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [seekWarning, setSeekWarning] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(initialVideoProgress?.completed || false);
  const [lastSavedTime, setLastSavedTime] = useState<number>(0);

  // Sync initial position if resuming
  useEffect(() => {
    if (videoRef.current && initialVideoProgress && initialVideoProgress.currentTime > 0) {
      videoRef.current.currentTime = initialVideoProgress.currentTime;
    }
  }, [initialVideoProgress]);

  const saveProgress = useCallback(
    async (time: number, maxTime: number, dur: number) => {
      if (!dur || dur <= 0) return;
      try {
        const prog = await videoProgressService.updatePlayback(
          studentId,
          lessonId,
          taskId,
          time,
          dur,
          maxTime
        );
        onProgressUpdate?.(prog);
        if (prog.completed && !isCompleted) {
          setIsCompleted(true);
          toastSuccess('Chúc mừng! Bạn đã hoàn thành thời lượng video bài giảng.');
          onCompleted?.();
        }
      } catch (err) {
        console.error('Failed to save video progress', err);
      }
    },
    [studentId, lessonId, taskId, isCompleted, onProgressUpdate, onCompleted, toastSuccess]
  );

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      if (initialVideoProgress?.currentTime) {
        videoRef.current.currentTime = Math.min(initialVideoProgress.currentTime, dur);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    setCurrentTime(current);

    if (current > maxWatchedTime) {
      const newMax = current;
      setMaxWatchedTime(newMax);

      // Throttled progress save every 4 seconds or when reaching completion
      const now = Date.now();
      if (now - lastSavedTime > 4000) {
        setLastSavedTime(now);
        saveProgress(current, newMax, duration || videoRef.current.duration);
      }
    }
  };

  const handleSeeking = () => {
    if (!videoRef.current) return;
    const requested = videoRef.current.currentTime;
    const validation = videoProgressService.validateSeek(maxWatchedTime, requested);

    if (!validation.allowed) {
      // Intercept seek attempt
      videoRef.current.currentTime = validation.fallbackTime;
      setCurrentTime(validation.fallbackTime);
      setSeekWarning('Chống tua bài học: Bạn cần xem video tuần tự trước khi mở khóa phần tiếp theo.');
      toastWarning('Bạn không thể tua qua phần bài giảng chưa xem!');

      setTimeout(() => {
        setSeekWarning(null);
      }, 4500);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      saveProgress(currentTime, maxWatchedTime, duration);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSpeedChange = (speed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackRate(speed);
  };

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !videoRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const targetPercent = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = targetPercent * duration;

    const validation = videoProgressService.validateSeek(maxWatchedTime, targetTime);
    if (validation.allowed) {
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    } else {
      videoRef.current.currentTime = validation.fallbackTime;
      setCurrentTime(validation.fallbackTime);
      setSeekWarning('Chống tua bài học: Bạn chỉ có thể tua lại phần đã xem.');
      toastWarning('Không thể tua tới phần video chưa học!');
      setTimeout(() => setSeekWarning(null), 4500);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  const watchedPercent = duration > 0 ? (maxWatchedTime / duration) * 100 : 0;
  const currentPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full bg-slate-950 rounded-2xl overflow-hidden shadow-xl border border-slate-800">
      {/* Warning Anti-Seek Banner */}
      {seekWarning && (
        <div className="bg-amber-500/90 backdrop-blur-sm text-slate-950 px-4 py-2.5 flex items-center gap-2.5 text-xs sm:text-sm font-semibold transition-all">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{seekWarning}</span>
        </div>
      )}

      {/* Video Container */}
      <div className="relative aspect-video bg-black flex items-center justify-center group">
        <video
          ref={videoRef}
          src={videoUrl}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onSeeking={handleSeeking}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false);
            saveProgress(duration, duration, duration);
          }}
          className="w-full h-full object-contain cursor-pointer"
          onClick={togglePlay}
          playsInline
        />

        {/* Big Center Play/Pause button on hover */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute p-5 rounded-full bg-blue-600/90 text-white shadow-2xl hover:scale-110 hover:bg-blue-500 transition-all cursor-pointer"
          >
            <Play className="w-8 h-8 fill-white translate-x-0.5" />
          </button>
        )}

        {/* Completed Badge Indicator */}
        {isCompleted && (
          <div className="absolute top-3 right-3 bg-emerald-500/90 backdrop-blur-xs text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đã hoàn thành 100%
          </div>
        )}
      </div>

      {/* Custom Smart Controls & Anti-Seek Visual Timeline */}
      <div className="p-4 bg-slate-900 text-slate-100 flex flex-col gap-3">
        {/* Timeline Bar */}
        <div className="flex flex-col gap-1.5">
          <div
            ref={progressBarRef}
            onClick={handleSeekClick}
            className="relative w-full h-3 bg-slate-800 rounded-full cursor-pointer overflow-hidden group/bar"
          >
            {/* Allowed / Watched Region (Solid Green / Blue) */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-blue-900/60 rounded-full transition-all"
              style={{ width: `${Math.min(100, watchedPercent)}%` }}
              title="Vùng video đã xem (Cho phép tua lại)"
            />

            {/* Current Playhead Fill */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-blue-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, currentPercent)}%` }}
            />

            {/* Locked Unwatched Region indicator */}
            {watchedPercent < 98 && (
              <div
                className="absolute top-0 bottom-0 right-0 bg-slate-800/80 flex items-center justify-center opacity-40 group-hover/bar:opacity-70 transition-opacity"
                style={{ width: `${100 - watchedPercent}%` }}
                title="Vùng bị khóa (Chống tua trước khi xem)"
              >
                <div className="w-full h-full border-l-2 border-amber-500/70 flex items-center justify-center">
                  <Lock className="w-2.5 h-2.5 text-amber-400" />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
            <span>{formatTime(currentTime)}</span>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-blue-400">Đã xem: {Math.round(watchedPercent)}%</span>
              <span>/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        {/* Action Controls Row */}
        <div className="flex items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
              title={isPlaying ? 'Tạm dừng' : 'Phát tiếp'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            </button>

            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  setCurrentTime(0);
                }
              }}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title="Xem lại từ đầu"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.muted = !isMuted;
                  setIsMuted(!isMuted);
                }
              }}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title={isMuted ? 'Bật âm thanh' : 'Tắt tiếng'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Playback Speeds */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 hidden sm:inline">Tốc độ:</span>
            {[0.75, 1, 1.25, 1.5].map(speed => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={`px-2 py-1 text-xs rounded font-medium transition cursor-pointer ${
                  playbackRate === speed
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
