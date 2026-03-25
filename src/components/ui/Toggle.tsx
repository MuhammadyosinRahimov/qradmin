'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  onLabel?: string;
  offLabel?: string;
}

const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({
    className = '',
    label,
    description,
    id,
    size = 'md',
    disabled,
    checked,
    showLabels = false,
    onLabel = 'On',
    offLabel = 'Off',
    ...props
  }, ref) => {
    const sizeConfig = {
      sm: {
        track: 'w-8 h-4',
        thumb: 'w-3 h-3',
        translate: 'translate-x-4',
        offset: 'translate-x-0.5',
      },
      md: {
        track: 'w-11 h-6',
        thumb: 'w-5 h-5',
        translate: 'translate-x-5',
        offset: 'translate-x-0.5',
      },
      lg: {
        track: 'w-14 h-7',
        thumb: 'w-6 h-6',
        translate: 'translate-x-7',
        offset: 'translate-x-0.5',
      },
    };

    const config = sizeConfig[size];

    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {showLabels && (
          <span className={`text-sm ${checked ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'} transition-colors`}>
            {offLabel}
          </span>
        )}

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            ref={ref}
            type="checkbox"
            id={id}
            disabled={disabled}
            checked={checked}
            className="sr-only peer"
            {...props}
          />
          {/* Track */}
          <div
            className={`
              ${config.track}
              rounded-full
              bg-[var(--bg-muted)]
              peer-checked:bg-[var(--primary)]
              transition-colors duration-200
              peer-disabled:opacity-50 peer-disabled:cursor-not-allowed
              peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--primary)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--bg-primary)]
            `}
          />
          {/* Thumb */}
          <div
            className={`
              absolute
              ${config.thumb}
              rounded-full
              bg-white
              shadow-sm
              transition-transform duration-200 ease-in-out
              ${config.offset}
              peer-checked:${config.translate}
            `}
            style={{
              transform: checked ? `translateX(${size === 'sm' ? '16px' : size === 'md' ? '20px' : '28px'})` : 'translateX(2px)',
            }}
          />
        </label>

        {showLabels && (
          <span className={`text-sm ${checked ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'} transition-colors`}>
            {onLabel}
          </span>
        )}

        {(label || description) && !showLabels && (
          <div className="flex flex-col">
            {label && (
              <label
                htmlFor={id}
                className={`
                  text-sm font-medium text-[var(--text-primary)] cursor-pointer
                  ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-[var(--text-muted)] text-sm mt-0.5">
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Toggle.displayName = 'Toggle';

export default Toggle;
