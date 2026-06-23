import { forwardRef } from 'react';

const Select = forwardRef(({ label, error, children, className = '', ...props }, ref) => {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={`w-full px-3 py-2 border rounded-lg text-sm transition-all
          focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400
          ${error ? 'border-red-300' : 'border-gray-200'}
          ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
