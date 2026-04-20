// apps/web/src/components/ui/Input.tsx
import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:  string;
  error?:  string;
  icon?:   React.ReactNode;
}

export function Input({ label, error, icon, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-slate-mid tracking-widest uppercase">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-dim">
            {icon}
          </span>
        )}
        <input
          className={cn(
            'w-full bg-void-100 border border-void-300 rounded-lg px-3 py-2.5 text-sm',
            'text-slate-bright placeholder:text-slate-dim',
            'focus:outline-none focus:border-amber transition-colors duration-150',
            icon && 'pl-9',
            error && 'border-rose',
            className,
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-rose">{error}</p>}
    </div>
  );
}