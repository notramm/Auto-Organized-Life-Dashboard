// apps/web/src/components/ui/Button.tsx

import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  'primary' | 'ghost' | 'danger';
  size?:     'sm' | 'md' | 'lg';
  loading?:  boolean;
  children:  React.ReactNode;
}

export function Button({
  variant = 'primary', size = 'md', loading, children, className, disabled, ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        {
          // Variants
          'bg-amber text-void hover:bg-amber-glow active:scale-95 shadow-amber':
            variant === 'primary',
          'bg-void-100 text-slate-bright border border-void-300 hover:border-amber hover:text-amber':
            variant === 'ghost',
          'bg-rose text-white hover:bg-rose-dim':
            variant === 'danger',
          // Sizes
          'px-3 py-1.5 text-xs': size === 'sm',
          'px-4 py-2   text-sm': size === 'md',
          'px-6 py-3   text-base': size === 'lg',
        },
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}