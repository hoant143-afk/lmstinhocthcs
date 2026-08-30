import React from 'react';

export interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  colorVariant?: 'auto' | 'blue' | 'emerald' | 'amber' | 'gradient';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  showLabel = false,
  size = 'md',
  colorVariant = 'auto',
  className = ''
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  const heightStyles = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  };

  let barColor = 'bg-blue-600';
  if (colorVariant === 'auto') {
    if (percentage === 100) barColor = 'bg-emerald-500';
    else if (percentage >= 75) barColor = 'bg-indigo-600';
    else if (percentage >= 50) barColor = 'bg-blue-600';
    else if (percentage >= 25) barColor = 'bg-amber-500';
    else barColor = 'bg-slate-400';
  } else if (colorVariant === 'emerald') {
    barColor = 'bg-emerald-500';
  } else if (colorVariant === 'amber') {
    barColor = 'bg-amber-500';
  } else if (colorVariant === 'gradient') {
    barColor = 'bg-gradient-to-r from-blue-600 to-indigo-600';
  }

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-1.5">
          <span>Tiến độ</span>
          <span>{percentage}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${heightStyles[size]}`}>
        <div
          className={`${heightStyles[size]} ${barColor} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export const ProgressRing: React.FC<{
  percentage: number;
  size?: number;
  strokeWidth?: number;
  showText?: boolean;
  className?: string;
}> = ({
  percentage,
  size = 64,
  strokeWidth = 6,
  showText = true,
  className = ''
}) => {
  const cleanPercent = Math.min(100, Math.max(0, Math.round(percentage)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (cleanPercent / 100) * circumference;

  let strokeColor = '#3b82f6'; // blue-500
  if (cleanPercent === 100) strokeColor = '#10b981'; // emerald-500
  else if (cleanPercent >= 75) strokeColor = '#6366f1'; // indigo-500
  else if (cleanPercent >= 50) strokeColor = '#3b82f6';
  else if (cleanPercent >= 25) strokeColor = '#f59e0b'; // amber-500
  else strokeColor = '#94a3b8'; // slate-400

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#f1f5f9"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {showText && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-slate-800">{cleanPercent}%</span>
        </div>
      )}
    </div>
  );
};
