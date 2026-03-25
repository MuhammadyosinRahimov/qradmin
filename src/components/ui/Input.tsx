'use client';

import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  variant?: 'default' | 'ghost';
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    className = '',
    label,
    error,
    hint,
    id,
    size = 'md',
    leftIcon,
    rightIcon,
    variant = 'default',
    disabled,
    ...props
  }, ref) => {
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-4 py-3 text-base',
    };

    const variantClasses = {
      default: `
        bg-[var(--bg-surface)] border border-[var(--border-primary)]
        hover:border-[var(--border-secondary)]
        focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20
        ${error ? 'border-[var(--status-error)] hover:border-[var(--status-error)] focus:border-[var(--status-error)] focus:ring-[var(--status-error)]/20' : ''}
      `,
      ghost: `
        bg-transparent border border-transparent
        hover:bg-[var(--bg-hover)]
        focus:bg-[var(--bg-surface)] focus:border-[var(--border-primary)]
      `,
    };

    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[var(--text-muted)]">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={id}
            disabled={disabled}
            className={`
              w-full rounded-lg
              text-[var(--text-primary)] placeholder-[var(--text-muted)]
              transition-all duration-150 theme-transition
              focus:outline-none
              disabled:opacity-50 disabled:cursor-not-allowed
              ${sizeClasses[size]}
              ${variantClasses[variant]}
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon ? 'pr-10' : ''}
            `}
            {...props}
          />

          {rightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--text-muted)]">
              {rightIcon}
            </div>
          )}
        </div>

        {hint && !error && (
          <p className="mt-2 text-sm text-[var(--text-muted)]">{hint}</p>
        )}

        {error && (
          <p className="mt-2 text-sm text-[var(--status-error)] flex items-center gap-1.5">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
