// apps/web/src/components/layout/Topbar.tsx

'use client';
import React from 'react';
import { useRouter }   from 'next/navigation';
import { Search, Bell } from 'lucide-react';
import { useState }    from 'react';

export function Topbar() {
  const router = useRouter();
  const [q, setQ] = useState('');

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <header className="h-14 border-b border-void-300 bg-void-50/60 backdrop-blur-sm flex items-center px-6 gap-4">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-dim" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search anything... 'beach photos goa', 'contract 2024'"
            className={[
              'w-full bg-void-100 border border-void-300 rounded-lg',
              'pl-9 pr-4 py-2 text-sm text-slate-bright placeholder:text-slate-dim',
              'focus:outline-none focus:border-amber transition-colors',
            ].join(' ')}
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-dim bg-void-200 px-1.5 py-0.5 rounded">
            ⌘K
          </kbd>
        </div>
      </form>

      {/* Notification */}
      <button className="relative text-slate-dim hover:text-slate-bright transition-colors">
        <Bell className="w-5 h-5" />
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber rounded-full" />
      </button>
    </header>
  );
}