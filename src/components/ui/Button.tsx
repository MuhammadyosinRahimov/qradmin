'use client';

import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className = '',
    variant = 'primary',
    size = 'md',
    isLoading,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props
  }, ref) => {
    const baseClasses = `
      inline-flex items-center justify-center
      font-semibold rounded-lg
      transition-all duration-200 theme-transition
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)]
      disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
      active:scale-[0.98]
    `;

    const variantClasses = {
      primary: `
        bg-[var(--primary)] text-white
        hover:bg-[var(--primary-hover)]
        focus:ring-[var(--primary)]
        shadow-lg shadow-[var(--primary)]/25
        hover:shadow-xl hover:shadow-[var(--primary)]/30
      `,
      secondary: `
        bg-[var(--bg-surface)] text-[var(--text-primary)]
        hover:bg-[var(--bg-hover)]
        focus:ring-[var(--border-secondary)]
        border border-[var(--border-primary)]
      `,
      danger: `
        bg-[var(--status-error)] text-white
        hover:brightness-110
        focus:ring-[var(--status-error)]
        shadow-lg shadow-[var(--status-error)]/25
      `,
      success: `
        bg-[var(--status-success)] text-white
        hover:brightness-110
        focus:ring-[var(--status-success)]
        shadow-lg shadow-[var(--status-success)]/25
      `,
      ghost: `
        text-[var(--text-secondary)]
        hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]
        focus:ring-[var(--border-secondary)]
      `,
      outline: `
        border-2 border-[var(--primary)] text-[var(--primary)]
        hover:bg-[var(--primary-bg)]
        focus:ring-[var(--primary)]
      `,
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2.5 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2',
      icon: 'p-2',
    };

    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
