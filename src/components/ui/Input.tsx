import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, hint, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-semibold text-slate-700 mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`w-full px-4 py-3 bg-white border-2 rounded-xl text-slate-900 placeholder-slate-400
            transition-all duration-200
            focus:outline-none focus:ring-0 focus:border-indigo-500 focus:shadow-lg focus:shadow-indigo-500/10
            hover:border-slate-400
            ${error ? 'border-red-400 focus:border-red-500' : 'border-slate-200'}
            ${className}`}
          {...props}
        />
        {hint && !error && (
          <p className="mt-2 text-sm text-slate-500">{hint}</p>
        )}
        {error && (
          <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
