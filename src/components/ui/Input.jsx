import { forwardRef } from 'react';

const Input = forwardRef(({ label, error, className = '', ...props }, ref) => {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`w-full px-3 py-2 border rounded-lg text-sm transition-all
          placeholder:text-gray-400
          focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400
          ${error ? 'border-red-300 focus:ring-red-200 focus:border-red-400' : 'border-gray-200'}
          ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
