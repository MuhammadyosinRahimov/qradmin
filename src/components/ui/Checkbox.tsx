'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  description?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  indeterminate?: boolean;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({
    className = '',
    label,
    description,
    error,
    id,
    size = 'md',
    disabled,
    checked,
    indeterminate = false,
    ...props
  }, ref) => {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };

    const labelSizeClasses = {
      sm: 'text-sm',
      md: 'text-sm',
      lg: 'text-base',
    };

    return (
      <div className={`flex items-start gap-3 ${className}`}>
        <div className="flex items-center h-5">
          <div className="relative">
            <input
              ref={ref}
              type="checkbox"
              id={id}
              disabled={disabled}
              checked={checked}
              className={`
                peer appearance-none
                ${sizeClasses[size]}
                rounded
                border-2 border-[var(--border-secondary)]
                bg-[var(--bg-surface)]
                transition-all duration-150
                cursor-pointer
                focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)]
                hover:border-[var(--primary)]
                checked:bg-[var(--primary)] checked:border-[var(--primary)]
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-[var(--border-secondary)]
                ${error ? 'border-[var(--status-error)]' : ''}
              `}
              {...props}
            />
            {/* Checkmark icon */}
            <svg
              className={`
                absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                ${size === 'sm' ? 'w-2.5 h-2.5' : size === 'md' ? 'w-3 h-3' : 'w-3.5 h-3.5'}
                text-white pointer-events-none
                opacity-0 peer-checked:opacity-100 transition-opacity duration-150
                ${indeterminate ? 'hidden' : ''}
              `}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {/* Indeterminate icon */}
            {indeterminate && (
              <svg
                className={`
                  absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                  ${size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-2.5 h-2.5' : 'w-3 h-3'}
                  text-white pointer-events-none
                  opacity-0 peer-checked:opacity-100 transition-opacity duration-150
                `}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
            )}
          </div>
        </div>

        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <label
                htmlFor={id}
                className={`
                  font-medium text-[var(--text-primary)] cursor-pointer
                  ${labelSizeClasses[size]}
                  ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {label}
              </label>
            )}
            {description && (
              <p className={`text-[var(--text-muted)] ${size === 'sm' ? 'text-xs' : 'text-sm'} mt-0.5`}>
                {description}
              </p>
            )}
            {error && (
              <p className="text-[var(--status-error)] text-sm mt-1 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
