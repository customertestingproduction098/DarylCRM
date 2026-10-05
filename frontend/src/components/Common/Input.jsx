import React from 'react';

export default function Input({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  error,
  helperText,
  disabled = false,
  required = false,
  icon: Icon,
  className = ''
}) {
  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {label && (
        <label htmlFor={name} className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3 text-slate-400 pointer-events-none">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full text-sm rounded-lg border bg-white py-2 px-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
            Icon ? 'pl-9' : ''
          } ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
              : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100'
          } ${disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
        />
      </div>
      {error ? (
        <span className="text-xs text-red-600 font-medium">{error}</span>
      ) : helperText ? (
        <span className="text-xs text-slate-500">{helperText}</span>
      ) : null}
    </div>
  );
}
