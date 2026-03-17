'use client';

import { useEffect, useState } from 'react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose: (id: string) => void;
}

const typeConfig = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-500',
    title: 'text-blue-900',
    message: 'text-blue-700',
    progress: 'bg-blue-500',
    iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: 'text-emerald-500',
    title: 'text-emerald-900',
    message: 'text-emerald-700',
    progress: 'bg-emerald-500',
    iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'text-amber-500',
    title: 'text-amber-900',
    message: 'text-amber-700',
    progress: 'bg-amber-500',
    iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-500',
    title: 'text-red-900',
    message: 'text-red-700',
    progress: 'bg-red-500',
    iconPath: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
};

export default function Toast({
  id,
  type,
  title,
  message,
  duration = 5000,
  action,
  onClose,
}: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const config = typeConfig[type];

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => onClose(id), 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, id, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(id), 300);
  };

  return (
    <div
      className={`
        w-80 border rounded shadow-md overflow-hidden
        ${config.bg} ${config.border}
        ${isExiting ? 'animate-slide-out-right' : 'animate-slide-in-right'}
      `}
      role="alert"
    >
      <div className="flex items-start gap-3 p-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${config.icon}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.iconPath} />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={`text-sm font-semibold ${config.title}`}>{title}</p>
              {message && (
                <p className={`text-xs mt-0.5 ${config.message}`}>{message}</p>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={handleClose}
              className={`flex-shrink-0 p-0.5 rounded hover:bg-black/5 transition-colors ${config.icon}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Action button */}
          {action && (
            <button
              onClick={() => {
                action.onClick();
                handleClose();
              }}
              className={`mt-2 text-xs font-medium ${config.icon} hover:underline`}
            >
              {action.label}
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {duration > 0 && (
        <div className="h-0.5 bg-black/5">
          <div
            className={`h-full ${config.progress} toast-progress`}
            style={{ animationDuration: `${duration}ms` }}
          />
        </div>
      )}
    </div>
  );
}
