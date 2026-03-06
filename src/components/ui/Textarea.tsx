import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Textarea({ label, error, icon, className = '', ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors">
          {label} {props.required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-4 text-slate-400 dark:text-slate-500 pointer-events-none">
            {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement, { size: 18 }) : icon}
          </div>
        )}
        
        <textarea 
          className={`
            w-full rounded-xl border px-4 py-3 text-sm transition-all min-h-[100px]
            bg-white dark:bg-slate-800 
            border-slate-200 dark:border-slate-700
            text-slate-900 dark:text-slate-100
            placeholder:text-slate-400 dark:placeholder:text-slate-500
            focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none 
            focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-400/10
            disabled:cursor-not-allowed disabled:opacity-50
            ${icon ? 'pl-11' : ''} 
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : ''} 
            ${className}
          `}
          {...props}
        />
      </div>
      
      {error && <span className="text-xs text-red-500 font-bold mt-1">{error}</span>}
    </div>
  );
}