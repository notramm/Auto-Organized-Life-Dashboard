// apps/web/components/search/SearchBar.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter }                   from 'next/navigation';
import { Search, X, Command }          from 'lucide-react';
import { cn }                          from '../../lib/utils';

export function SearchBar() {
  const router  = useRouter();
  const [q, setQ]           = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef              = useRef<HTMLInputElement>(null);

  // ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <form onSubmit={handleSearch} className="flex-1 max-w-xl">
      <div className={cn(
        'relative flex items-center transition-all duration-200',
        focused ? 'scale-[1.01]' : '',
      )}>
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-dim pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search anything... 'beach photos Goa', 'contract 2024'"
          className={cn(
            'w-full bg-void-200/50 border rounded-2xl pl-11 pr-20 py-2.5 text-sm',
            'text-slate-bright placeholder:text-slate-dim/60',
            'focus:outline-none transition-all duration-200',
            focused
              ? 'border-amber/50 bg-void-200 shadow-glow-amber'
              : 'border-void-400/50 hover:border-void-400',
          )}
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ('')}
            className="absolute right-16 top-1/2 -translate-y-1/2 text-slate-dim hover:text-slate-bright transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
          <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] text-slate-dim bg-void-300/50 border border-void-400/50 rounded-lg px-1.5 py-0.5">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </div>
      </div>
    </form>
  );
}