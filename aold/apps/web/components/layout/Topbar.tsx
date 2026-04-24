// apps/web/src/components/layout/Topbar.tsx

'use client';
import React from 'react';
import { useRouter }   from 'next/navigation';
import { Search, Bell } from 'lucide-react';
import { useState }    from 'react';
import { SearchBar } from '../search/SearchBar';

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
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber/20 to-transparent" />

      <SearchBar />

      {/* Notification */}
      <button className="relative text-slate-dim hover:text-slate-bright transition-colors">
        <Bell className="w-5 h-5" />
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber rounded-full" />
      </button>
    </header>
  );
}