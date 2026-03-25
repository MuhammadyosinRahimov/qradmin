'use client';

import { ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'pending' | 'waiter';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: ReactNode;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-[var(--bg-muted)] text-[var(--text-secondary)] border-[var(--border-primary)]',
  success: 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success)]/20',
  warning: 'bg-[var(--status-warning-bg)] text-[var(--status-warning)] border-[var(--status-warning)]/20',
  error: 'bg-[var(--status-error-bg)] text-[var(--status-error)] border-[var(--status-error)]/20',
  info: 'bg-[var(--status-info-bg)] text-[var(--status-info)] border-[var(--status-info)]/20',
  pending: 'bg-[var(--status-pending-bg)] text-[var(--status-pending)] border-[var(--status-pending)]/20',
  waiter: 'bg-[var(--status-waiter-bg)] text-[var(--status-waiter)] border-[var(--status-waiter)]/20',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-[var(--text-muted)]',
  success: 'bg-[var(--status-success)]',
  warning: 'bg-[var(--status-warning)]',
  error: 'bg-[var(--status-error)]',
  info: 'bg-[var(--status-info)]',
  pending: 'bg-[var(--status-pending)]',
  waiter: 'bg-[var(--status-waiter)]',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-0.5 text-xs',
  lg: 'px-2.5 py-1 text-sm',
};

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  icon,
  dot = false,
  pulse = false,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        font-medium rounded-full border
        transition-colors duration-150 theme-transition
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {dot && (
        <span className="relative flex h-2 w-2">
          {pulse && (
            <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${dotColors[variant]}`} />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColors[variant]}`} />
        </span>
      )}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

// Status Badge - specific for order/session statuses
type StatusType = 'pending' | 'confirmed' | 'paid' | 'cancelled' | 'waiterCalled';

interface StatusBadgeProps {
  status: StatusType;
  size?: BadgeSize;
  showDot?: boolean;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; variant: BadgeVariant; icon: ReactNode }> = {
  pending: {
    label: 'Новый',
    variant: 'pending',
    icon: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  confirmed: {
    label: 'Готовится',
    variant: 'info',
    icon: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  paid: {
    label: 'Оплачено',
    variant: 'success',
    icon: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  cancelled: {
    label: 'Отменено',
    variant: 'error',
    icon: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
  waiterCalled: {
    label: 'Вызов официанта',
    variant: 'waiter',
    icon: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
};

export function StatusBadge({ status, size = 'md', showDot = false, className = '' }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant={config.variant}
      size={size}
      icon={config.icon}
      dot={showDot}
      pulse={status === 'waiterCalled' || status === 'pending'}
      className={className}
    >
      {config.label}
    </Badge>
  );
}
