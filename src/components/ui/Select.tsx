'use client';

import { SelectHTMLAttributes, forwardRef, useState, useRef, useEffect } from 'react';

interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  onChange?: (e: { target: { value: string } }) => void;
  variant?: 'default' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({
    className = '',
    label,
    error,
    hint,
    id,
    options,
    placeholder = 'Выберите...',
    onChange,
    value,
    variant = 'default',
    size = 'md',
    disabled,
    ...props
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState(String(value || ''));
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      setSelectedValue(String(value || ''));
    }, [value]);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue: string) => {
      setSelectedValue(optionValue);
      onChange?.({ target: { value: optionValue } });
      setIsOpen(false);
    };

    const selectedOption = options.find(opt => String(opt.value) === selectedValue);

    const sizeClasses = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-3 text-sm',
      lg: 'h-12 px-4 text-base'
    };

    return (
      <div className={`w-full ${className}`} ref={containerRef}>
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {/* Custom dropdown trigger */}
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            className={`
              w-full flex items-center justify-between gap-2
              rounded-lg text-left font-medium
              bg-[var(--bg-surface)]
              border-2
              ${error
                ? 'border-[var(--status-error)]'
                : isOpen
                  ? 'border-[var(--primary)]'
                  : 'border-[var(--border-primary)] hover:border-[var(--border-secondary)]'
              }
              transition-colors duration-150
              ${sizeClasses[size]}
              ${disabled ? 'opacity-50 cursor-not-allowed bg-[var(--bg-muted)]' : 'cursor-pointer'}
            `}
          >
            <span className={`truncate ${selectedValue ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
              {selectedOption?.label || placeholder}
            </span>
            <svg
              className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Hidden native select for form submission */}
          <select
            ref={ref}
            id={id}
            value={selectedValue}
            onChange={(e) => handleSelect(e.target.value)}
            className="sr-only"
            disabled={disabled}
            {...props}
          >
            <option value="">{placeholder}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Dropdown menu */}
          {isOpen && (
            <div
              className="
                absolute z-50 w-full mt-1 py-1
                bg-[var(--bg-surface)]
                border-2 border-[var(--border-primary)]
                rounded-lg shadow-lg
                max-h-60 overflow-auto
              "
              style={{
                boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)'
              }}
            >
              {options.length === 0 ? (
                <div className="px-3 py-2 text-[var(--text-muted)] text-sm text-center">
                  Нет вариантов
                </div>
              ) : (
                options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => !option.disabled && handleSelect(String(option.value))}
                    disabled={option.disabled}
                    className={`
                      w-full px-3 py-2 text-left text-sm
                      flex items-center justify-between gap-2
                      transition-colors duration-100
                      ${option.disabled
                        ? 'opacity-50 cursor-not-allowed text-[var(--text-disabled)]'
                        : 'hover:bg-[var(--bg-hover)] cursor-pointer'
                      }
                      ${String(option.value) === selectedValue
                        ? 'bg-[var(--primary-bg)] text-[var(--primary)] font-medium'
                        : 'text-[var(--text-primary)]'
                      }
                    `}
                  >
                    <span className="truncate">{option.label}</span>
                    {String(option.value) === selectedValue && (
                      <svg className="w-4 h-4 text-[var(--primary)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {hint && !error && (
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">{hint}</p>
        )}
        {error && (
          <p className="mt-1.5 text-sm text-[var(--status-error)] flex items-center gap-1">
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

Select.displayName = 'Select';

export default Select;
