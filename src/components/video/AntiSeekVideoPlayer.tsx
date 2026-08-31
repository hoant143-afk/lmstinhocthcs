import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  ShieldAlert,
  CheckCircle2,
  Lock,
  Maximize,
  Sparkles,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Video,
  Film
} from 'lucide-react';
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

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

// Fallback high-availability MP4 URLs in case one CDN is blocked
const PRIMARY_SAMPLE_VIDEO = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
const BACKUP_SAMPLE_VIDEO_1 = 'https://vjs.zencdn.net/v/oceans.mp4';
const BACKUP_SAMPLE_VIDEO_2 = 'https://www.w3schools.com/html/mov_bbb.mp4';

function extractYouTubeId(url?: string): string | null {
  if (!url) return null;
  const cleanUrl = url.trim();
  // Match standard, share, embed, shorts, and query params
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = cleanUrl.match(regExp);
  return match && match[1] ? match[1] : null;
}

function extractGoogleDriveId(url?: string): string | null {
  if (!url) return null;
  if (!url.includes('drive.google.com') && !url.includes('docs.google.com')) return null;

  // Match /file/d/FILE_ID or id=FILE_ID
  const matchFileD = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) return matchFileD[1];

  const matchIdParam = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchIdParam && matchIdParam[1]) return matchIdParam[1];

  return null;
}

function extractVimeoId(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:vimeo\.com\/)(\d+)/);
  return match && match[1] ? match[1] : null;
}

export const AntiSeekVideoPlayer: React.FC<AntiSeekVideoPlayerProps> = ({
  videoUrl,
  studentId,
  lessonId,
  taskId,
  initialVideoProgress,
  onProgressUpdate,
  onCompleted
}) => {
  const { toastWarning, toastSuccess, toastInfo } = useToast();

  // Normalize URL
  const rawUrl = videoUrl && videoUrl.trim() ? videoUrl.trim() : PRIMARY_SAMPLE_VIDEO;
  const [currentSrc, setCurrentSrc] = useState<string>(rawUrl);

  const ytVideoId = extractYouTubeId(currentSrc);
  const driveFileId = extractGoogleDriveId(currentSrc);
  const vimeoId = extractVimeoId(currentSrc);
  const isDirect = !ytVideoId && !driveFileId && !vimeoId;

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);
  const ytContainerRef = useRef<HTMLDivElement | null>(null);

  // States
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(initialVideoProgress?.currentTime || 0);
  const [maxWatchedTime, setMaxWatchedTime] = useState<number>(initialVideoProgress?.maxWatchedTime || 0);
  const [duration, setDuration] = useState<number>(initialVideoProgress?.duration || (isDirect ? 0 : 300));
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [seekWarning, setSeekWarning] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(initialVideoProgress?.completed || false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [fallbackAttempt, setFallbackAttempt] = useState<number>(0);
  const [driveTimerSeconds, setDriveTimerSeconds] = useState<number>(0);

  // Ref tracking to prevent stale closures and infinite loop re-renders
  const maxWatchedRef = useRef<number>(initialVideoProgress?.maxWatchedTime || 0);
  const durationRef = useRef<number>(initialVideoProgress?.duration || 0);
  const isCompletedRef = useRef<boolean>(initialVideoProgress?.completed || false);
  const lastSavedTimeRef = useRef<number>(0);
  const onProgressUpdateRef = useRef(onProgressUpdate);
  const onCompletedRef = useRef(onCompleted);

  useEffect(() => {
    onProgressUpdateRef.current = onProgressUpdate;
    onCompletedRef.current = onCompleted;
  }, [onProgressUpdate, onCompleted]);

  useEffect(() => {
    maxWatchedRef.current = maxWatchedTime;
  }, [maxWatchedTime]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    isCompletedRef.current = isCompleted;
  }, [isCompleted]);

  // When props change
  useEffect(() => {
    const freshSrc = videoUrl && videoUrl.trim() ? videoUrl.trim() : PRIMARY_SAMPLE_VIDEO;
    setCurrentSrc(freshSrc);
    const initTime = initialVideoProgress?.currentTime || 0;
    const initMax = initialVideoProgress?.maxWatchedTime || 0;
    const initDur = initialVideoProgress?.duration || 0;
    const initComp = initialVideoProgress?.completed || false;

    setCurrentTime(initTime);
    setMaxWatchedTime(initMax);
    maxWatchedRef.current = initMax;
    setDuration(initDur);
    durationRef.current = initDur;
    setIsCompleted(initComp);
    isCompletedRef.current = initComp;
    setIsPlaying(false);
    setHasError(false);
    setErrorMessage('');
    setFallbackAttempt(0);
  }, [videoUrl, taskId, initialVideoProgress]);

  // Core Progress Save Function
  const saveProgress = useCallback(
    async (time: number, maxTime: number, dur: number) => {
      const validDur = dur > 0 ? dur : (durationRef.current > 0 ? durationRef.current : 100);
      try {
        const prog = await videoProgressService.updatePlayback(
          studentId,
          lessonId,
          taskId,
          time,
          validDur,
          maxTime
        );
        onProgressUpdateRef.current?.(prog);

        if (prog.completed && !isCompletedRef.current) {
          setIsCompleted(true);
          isCompletedRef.current = true;
          toastSuccess('Chúc mừng! Bạn đã hoàn thành thời lượng video bài giảng.');
          onCompletedRef.current?.();
        }
      } catch (err) {
        console.error('Failed to save video progress', err);
      }
    },
    [studentId, lessonId, taskId, toastSuccess]
  );

  // Throttled Progress Save
  const triggerThrottledSave = useCallback(
    (current: number, maxVal: number, dur: number, force = false) => {
      const now = Date.now();
      if (force || now - lastSavedTimeRef.current > 3000) {
        lastSavedTimeRef.current = now;
        saveProgress(current, maxVal, dur);
      }
    },
    [saveProgress]
  );

  // Manual Complete Handler
  const handleManualComplete = useCallback(async () => {
    const validDur = duration > 0 ? duration : 180;
    const prog = await videoProgressService.updatePlayback(
      studentId,
      lessonId,
      taskId,
      validDur,
      validDur,
      validDur
    );
    setIsCompleted(true);
    isCompletedRef.current = true;
    setMaxWatchedTime(validDur);
    maxWatchedRef.current = validDur;
    onProgressUpdateRef.current?.(prog);
    toastSuccess('Đã xác nhận hoàn thành video bài giảng!');
    onCompletedRef.current?.();
  }, [duration, studentId, lessonId, taskId, toastSuccess]);

  // ============================================================
  // 1. YOUTUBE PLAYER CONTROLLER (Safe Lifecycle & Anti-Seek)
  // ============================================================
  useEffect(() => {
    if (!ytVideoId) return;

    let pollInterval: any = null;
    let isCancelled = false;

    const setupPlayer = () => {
      if (isCancelled || !window.YT || !window.YT.Player || !ytContainerRef.current) return;

      try {
        // Destroy existing instance if any
        if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
          try {
            ytPlayerRef.current.destroy();
          } catch (e) {}
        }

        ytPlayerRef.current = new window.YT.Player(ytContainerRef.current, {
          videoId: ytVideoId,
          playerVars: {
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            controls: 1,
            enablejsapi: 1,
            fs: 1
          },
          events: {
            onReady: (event: any) => {
              if (isCancelled) return;
              try {
                const dur = event.target.getDuration();
                if (dur > 0) {
                  setDuration(dur);
                  durationRef.current = dur;
                }
                const resumeTime = maxWatchedRef.current;
                if (resumeTime > 0) {
                  event.target.seekTo(resumeTime, true);
                }
              } catch (e) {}
            },
            onStateChange: (event: any) => {
              if (isCancelled) return;
              // 1: PLAYING, 2: PAUSED, 0: ENDED
              if (event.data === 1) {
                setIsPlaying(true);
              } else if (event.data === 2) {
                setIsPlaying(false);
                try {
                  const curr = ytPlayerRef.current?.getCurrentTime?.() || 0;
                  const dur = ytPlayerRef.current?.getDuration?.() || durationRef.current;
                  saveProgress(curr, maxWatchedRef.current, dur);
                } catch (e) {}
              } else if (event.data === 0) {
                setIsPlaying(false);
                const dur = durationRef.current > 0 ? durationRef.current : 100;
                setMaxWatchedTime(dur);
                maxWatchedRef.current = dur;
                saveProgress(dur, dur, dur);
              }
            },
            onError: (err: any) => {
              console.warn('YouTube Player Event Error:', err);
              // Do not hard crash; allow fallback iframe
            }
          }
        });
      } catch (err) {
        console.warn('Could not initialize YT.Player API directly:', err);
      }
    };

    // Load YouTube API script
    if (!window.YT) {
      const existingScript = document.getElementById('youtube-iframe-api');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      }
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prevCallback?.();
        setupPlayer();
      };
    } else {
      setupPlayer();
    }

    // Anti-Seek Poller for YouTube
    pollInterval = setInterval(() => {
      if (isCancelled || !ytPlayerRef.current || typeof ytPlayerRef.current.getCurrentTime !== 'function') return;

      try {
        const curr = ytPlayerRef.current.getCurrentTime();
        const dur = ytPlayerRef.current.getDuration() || durationRef.current;

        if (dur > 0 && dur !== durationRef.current) {
          setDuration(dur);
          durationRef.current = dur;
        }

        // Check if student skipped ahead beyond max watched + 3 seconds
        if (curr > maxWatchedRef.current + 3.0) {
          ytPlayerRef.current.seekTo(maxWatchedRef.current, true);
          setCurrentTime(maxWatchedRef.current);
          setSeekWarning('Chống tua bài học: Bạn cần theo dõi tuần tự video bài giảng.');
          toastWarning('Không thể tua tới phần video chưa học!');
          setTimeout(() => setSeekWarning(null), 3500);
        } else {
          setCurrentTime(curr);
          if (curr > maxWatchedRef.current) {
            const newMax = curr;
            maxWatchedRef.current = newMax;
            setMaxWatchedTime(newMax);
            triggerThrottledSave(curr, newMax, dur);
          }
        }
      } catch (e) {}
    }, 600);

    return () => {
      isCancelled = true;
      if (pollInterval) clearInterval(pollInterval);
      if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {}
      }
    };
  }, [ytVideoId, taskId, triggerThrottledSave, saveProgress, toastWarning]);

  // ============================================================
  // 2. GOOGLE DRIVE / IFRAME TIMER TRACKER
  // ============================================================
  useEffect(() => {
    if (!driveFileId && !vimeoId) return;

    const timer = setInterval(() => {
      setDriveTimerSeconds(prev => {
        const next = prev + 1;
        const targetDur = duration || 180;
        const currentM = maxWatchedRef.current;
        if (next > currentM) {
          maxWatchedRef.current = next;
          setMaxWatchedTime(next);
          triggerThrottledSave(next, next, targetDur);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [driveFileId, vimeoId, duration, triggerThrottledSave]);

  // ============================================================
  // 3. HTML5 DIRECT VIDEO HANDLERS
  // ============================================================
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      if (dur && !isNaN(dur) && isFinite(dur)) {
        setDuration(dur);
        durationRef.current = dur;
        if (maxWatchedRef.current > 0 && maxWatchedRef.current < dur) {
          videoRef.current.currentTime = maxWatchedRef.current;
        }
      }
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const dur = durationRef.current || videoRef.current.duration || 0;
    setCurrentTime(current);

    if (current > maxWatchedRef.current) {
      const newMax = current;
      maxWatchedRef.current = newMax;
      setMaxWatchedTime(newMax);
      triggerThrottledSave(current, newMax, dur);
    }
  };

  const handleSeeking = () => {
    if (!videoRef.current) return;
    const requested = videoRef.current.currentTime;
    const validation = videoProgressService.validateSeek(maxWatchedRef.current, requested);

    if (!validation.allowed) {
      videoRef.current.currentTime = validation.fallbackTime;
      setCurrentTime(validation.fallbackTime);
      setSeekWarning('Chống tua bài học: Bạn chỉ có thể tua lại phần bài giảng đã xem.');
      toastWarning('Không thể tua tới phần video chưa học!');
      setTimeout(() => setSeekWarning(null), 3500);
    }
  };

  const togglePlay = () => {
    if (ytVideoId && ytPlayerRef.current) {
      try {
        if (isPlaying) {
          ytPlayerRef.current.pauseVideo?.();
        } else {
          ytPlayerRef.current.playVideo?.();
        }
      } catch (e) {}
      return;
    }

    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      saveProgress(currentTime, maxWatchedTime, duration);
    } else {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(err => {
            console.warn('Playback play() promise error:', err);
            setIsPlaying(false);
          });
      }
    }
  };

  const handleRewind10 = () => {
    const target = Math.max(0, currentTime - 10);
    if (ytVideoId && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.seekTo?.(target, true);
      } catch (e) {}
    } else if (videoRef.current) {
      videoRef.current.currentTime = target;
    }
    setCurrentTime(target);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (ytVideoId && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.setPlaybackRate?.(speed);
      } catch (e) {}
    } else if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const targetPercent = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = targetPercent * duration;

    const validation = videoProgressService.validateSeek(maxWatchedRef.current, targetTime);
    if (validation.allowed) {
      if (ytVideoId && ytPlayerRef.current) {
        try {
          ytPlayerRef.current.seekTo?.(targetTime, true);
        } catch (e) {}
      } else if (videoRef.current) {
        videoRef.current.currentTime = targetTime;
      }
      setCurrentTime(targetTime);
    } else {
      const safeTime = validation.fallbackTime;
      if (ytVideoId && ytPlayerRef.current) {
        try {
          ytPlayerRef.current.seekTo?.(safeTime, true);
        } catch (e) {}
      } else if (videoRef.current) {
        videoRef.current.currentTime = safeTime;
      }
      setCurrentTime(safeTime);
      setSeekWarning('Chống tua bài học: Bạn chỉ có thể tua lại phần video đã học.');
      toastWarning('Không thể tua tới phần video chưa học!');
      setTimeout(() => setSeekWarning(null), 3500);
    }
  };

  const toggleMute = () => {
    if (ytVideoId && ytPlayerRef.current) {
      try {
        if (isMuted) {
          ytPlayerRef.current.unMute?.();
          setIsMuted(false);
        } else {
          ytPlayerRef.current.mute?.();
          setIsMuted(true);
        }
      } catch (e) {}
    } else if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (ytVideoId && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.setVolume?.(newVol * 100);
      } catch (e) {}
    } else if (videoRef.current) {
      videoRef.current.volume = newVol;
    }
    if (newVol === 0) setIsMuted(true);
    else if (isMuted) setIsMuted(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(err => {
        console.warn('Fullscreen request failed', err);
      });
    } else {
      document.exitFullscreen?.();
    }
  };

  // Video error handler with automatic fallback stream
  const handleVideoError = () => {
    console.warn('Primary video source failed to load:', currentSrc);
    if (fallbackAttempt === 0) {
      setFallbackAttempt(1);
      setCurrentSrc(BACKUP_SAMPLE_VIDEO_1);
      toastInfo('Đang tự động kết nối nguồn video dự phòng...');
    } else if (fallbackAttempt === 1) {
      setFallbackAttempt(2);
      setCurrentSrc(BACKUP_SAMPLE_VIDEO_2);
    } else {
      setHasError(true);
      setErrorMessage('Định dạng video này bị hạn chế phát trực tiếp bởi trình duyệt.');
    }
  };

  const handleSwitchToSampleVideo = () => {
    setHasError(false);
    setFallbackAttempt(0);
    setCurrentSrc(PRIMARY_SAMPLE_VIDEO);
    toastSuccess('Đã chuyển sang video bài giảng mẫu!');
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0 || !isFinite(secs)) return '0:00';
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  const validDuration = duration > 0 ? duration : (driveFileId || vimeoId ? 180 : 0);
  const watchedPercent = validDuration > 0 ? Math.min(100, (maxWatchedTime / validDuration) * 100) : 0;
  const currentPercent = validDuration > 0 ? Math.min(100, (currentTime / validDuration) * 100) : 0;
  const isEligibleToComplete = watchedPercent >= 90 || isCompleted;

  return (
    <div
      ref={containerRef}
      id={`player_container_${taskId}`}
      className="w-full bg-slate-950 rounded-2xl overflow-hidden shadow-xl border border-slate-800 flex flex-col"
    >
      {/* Anti-Seek Warning Alert Banner */}
      {seekWarning && (
        <div
          id="anti_seek_warning_banner"
          className="bg-amber-500 text-slate-950 px-4 py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm font-bold animate-pulse z-30"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-slate-950" />
            <span>{seekWarning}</span>
          </div>
          <button
            onClick={() => setSeekWarning(null)}
            className="text-xs px-2 py-0.5 rounded bg-slate-900/20 hover:bg-slate-900/30 text-slate-950 font-bold cursor-pointer"
          >
            Đã hiểu
          </button>
        </div>
      )}

      {/* Main Video Viewport */}
      <div className="relative aspect-video bg-black flex items-center justify-center group overflow-hidden">
        {/* CASE A: YOUTUBE VIDEO */}
        {ytVideoId ? (
          <div className="w-full h-full relative flex items-center justify-center bg-black">
            <div ref={ytContainerRef} className="w-full h-full" />
            {/* Fallback standard iframe if API is initializing */}
            <iframe
              ref={ytIframeRef}
              src={`https://www.youtube-nocookie.com/embed/${ytVideoId}?enablejsapi=1&playsinline=1&rel=0&modestbranding=1`}
              className="w-full h-full absolute inset-0 -z-10"
              title="YouTube Video Player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : driveFileId ? (
          /* CASE B: GOOGLE DRIVE EMBED */
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 relative">
            <iframe
              src={`https://drive.google.com/file/d/${driveFileId}/preview`}
              className="w-full h-full border-0"
              allow="autoplay; fullscreen"
              title="Google Drive Video Player"
            />
            {/* Overlay Timer Badge for Google Drive */}
            <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-xs text-white text-xs px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-2">
              <Film className="w-3.5 h-3.5 text-blue-400" />
              <span>Google Drive: <strong>{formatTime(driveTimerSeconds)}</strong></span>
            </div>
          </div>
        ) : vimeoId ? (
          /* CASE C: VIMEO EMBED */
          <div className="w-full h-full flex items-center justify-center bg-slate-950">
            <iframe
              src={`https://player.vimeo.com/video/${vimeoId}?autoplay=0&badge=0`}
              className="w-full h-full border-0"
              allow="autoplay; fullscreen; picture-in-picture"
              title="Vimeo Video Player"
            />
          </div>
        ) : (
          /* CASE D: DIRECT HTML5 VIDEO (MP4, WebM, etc.) */
          <>
            <video
              ref={videoRef}
              src={currentSrc}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onSeeking={handleSeeking}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => {
                setIsPlaying(false);
                const dur = durationRef.current || videoRef.current?.duration || 0;
                setMaxWatchedTime(dur);
                maxWatchedRef.current = dur;
                saveProgress(dur, dur, dur);
              }}
              onError={handleVideoError}
              className="w-full h-full object-contain cursor-pointer"
              onClick={togglePlay}
              playsInline
              preload="auto"
              crossOrigin="anonymous"
            />

            {/* Big Center Play Overlay Button */}
            {!isPlaying && !hasError && (
              <button
                id="btn_center_play_video"
                onClick={togglePlay}
                className="absolute p-5 rounded-full bg-blue-600/90 text-white shadow-2xl hover:scale-110 hover:bg-blue-500 transition-all cursor-pointer z-10"
                aria-label="Phát video bài giảng"
              >
                <Play className="w-8 h-8 fill-white translate-x-0.5" />
              </button>
            )}
          </>
        )}

        {/* Media Error State / Fallback Controls */}
        {hasError && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center text-center p-6 space-y-3 z-20">
            <AlertCircle className="w-10 h-10 text-amber-500" />
            <h4 className="text-sm font-bold text-white">
              {errorMessage || 'Không thể tải trực tiếp liên kết video này'}
            </h4>
            <p className="text-xs text-slate-400 max-w-sm">
              Bạn có thể mở video qua tab mới hoặc chuyển sang video bài giảng mẫu để tiếp tục tiến độ học tập.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <a
                href={rawUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Mở trong tab mới
              </a>
              <button
                onClick={handleSwitchToSampleVideo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Dùng video mẫu
              </button>
              <button
                onClick={handleManualComplete}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Xác nhận đã xem
              </button>
            </div>
          </div>
        )}

        {/* Completed Badge Indicator */}
        {isCompleted && (
          <div className="absolute top-3 right-3 bg-emerald-500/90 backdrop-blur-xs text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg z-10">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đã hoàn thành 100%
          </div>
        )}
      </div>

      {/* Custom Smart Controls & Anti-Seek Timeline Bar */}
      <div className="p-4 bg-slate-900 text-slate-100 flex flex-col gap-3">
        {/* Anti-Seek Timeline Bar */}
        <div className="flex flex-col gap-1.5">
          <div
            id="video_seek_progressbar"
            ref={progressBarRef}
            onClick={handleSeekClick}
            className="relative w-full h-3.5 bg-slate-800 rounded-full cursor-pointer overflow-hidden group/bar select-none"
            title="Nhấn để xem lại phần đã học (Chống tua vượt vùng khóa)"
          >
            {/* Allowed Watched Range (Deep Blue) */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-blue-900/80 rounded-full transition-all"
              style={{ width: `${Math.min(100, watchedPercent)}%` }}
              title="Vùng video đã xem (Cho phép tua lại)"
            />

            {/* Current Playhead Fill (Bright Blue) */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-blue-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, currentPercent)}%` }}
            />

            {/* Locked Unwatched Region Indicator */}
            {watchedPercent < 98 && (
              <div
                className="absolute top-0 bottom-0 right-0 bg-slate-950/75 flex items-center justify-center opacity-60 group-hover/bar:opacity-90 transition-opacity"
                style={{ width: `${100 - watchedPercent}%` }}
                title="Vùng bị khóa (Chống tua trước khi xem)"
              >
                <div className="w-full h-full border-l-2 border-amber-400 flex items-center justify-center">
                  <Lock className="w-2.5 h-2.5 text-amber-400" />
                </div>
              </div>
            )}
          </div>

          {/* Time & Progress Percent Display */}
          <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
            <span className="font-semibold text-slate-200">{formatTime(currentTime)}</span>
            <div className="flex items-center gap-2 text-xs">
              <span className={`font-bold ${watchedPercent >= 90 ? 'text-emerald-400' : 'text-blue-400'}`}>
                Đã học: {Math.round(watchedPercent)}%
              </span>
              <span>/</span>
              <span>{formatTime(validDuration)}</span>
            </div>
          </div>
        </div>

        {/* Action Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            {/* Play / Pause Toggle (for HTML5 & YouTube) */}
            <button
              id="btn_toggle_play"
              onClick={togglePlay}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
              title={isPlaying ? 'Tạm dừng' : 'Phát tiếp'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            </button>

            {/* Rewind 10s */}
            <button
              id="btn_rewind_10s"
              onClick={handleRewind10}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer flex items-center gap-1 text-xs font-semibold"
              title="Xem lại 10 giây trước"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">10s</span>
            </button>

            {/* Volume / Mute */}
            <div className="flex items-center gap-1.5">
              <button
                id="btn_toggle_mute"
                onClick={toggleMute}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                title={isMuted ? 'Bật âm thanh' : 'Tắt tiếng'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
              {isDirect && (
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={e => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-16 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hidden sm:block"
                  title="Âm lượng"
                />
              )}
            </div>
          </div>

          {/* Right Action: Playback Speeds, Manual Completion & Fullscreen */}
          <div className="flex items-center gap-2">
            {/* Playback Speeds */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-400 hidden md:inline">Tốc độ:</span>
              {[0.75, 1, 1.25, 1.5].map(speed => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`px-2 py-1 text-xs rounded-lg font-medium transition cursor-pointer ${
                    playbackRate === speed
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            {/* Manual Confirmation Button once >= 90% or for Drive / embeds */}
            {(isEligibleToComplete || driveFileId || vimeoId) && !isCompleted && (
              <button
                id="btn_confirm_video_completed"
                onClick={handleManualComplete}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition cursor-pointer animate-pulse"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Xác nhận hoàn thành</span>
              </button>
            )}

            {/* Quick backup video switcher */}
            <button
              onClick={handleSwitchToSampleVideo}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title="Đổi nguồn video bài giảng mẫu"
            >
              <Video className="w-4 h-4" />
            </button>

            {/* Fullscreen button */}
            <button
              id="btn_fullscreen"
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title="Toàn màn hình"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
