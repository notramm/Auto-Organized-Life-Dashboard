// apps/web/components/layout/Sidebar.tsx
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, FolderOpen, Search,
  Lightbulb, Zap, LogOut, ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { cn }           from '../../lib/utils';
import { formatBytes }  from '../../lib/utils';

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',  desc: 'Overview'  },
  { href: '/files',     icon: FolderOpen,      label: 'Files',      desc: 'Your data' },
  { href: '/search',    icon: Search,           label: 'AI Search',  desc: 'Find anything' },
  { href: '/insights',  icon: Lightbulb,        label: 'Insights',   desc: 'AI analysis' },
];

export function Sidebar() {
  const pathname       = usePathname();
  const { user, logout } = useAuthStore();
  const usedPct = user
    ? Math.round((user.storageUsedBytes / user.storageQuotaBytes) * 100)
    : 0;

  return (
    <aside className="w-64 min-h-screen bg-void-100/50 border-r border-void-400/30 flex flex-col backdrop-blur-sm relative">

      {/* Top glow line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber/30 to-transparent" />

      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-void-400/30">
        <div className="w-8 h-8 bg-amber rounded-xl flex items-center justify-center shadow-amber-sm animate-pulse-glow flex-shrink-0">
          <Zap className="w-4 h-4 text-void" strokeWidth={2.5} />
        </div>
        <div>
          <p className="font-bold text-slate-full font-display text-sm tracking-wide">AOLD</p>
          <p className="text-[9px] text-slate-dim tracking-[0.2em] uppercase">Data OS</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, icon: Icon, label, desc }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-3 px-3 py-3 rounded-2xl text-sm transition-all duration-200',
                active
                  ? 'bg-amber/10 border border-amber/20 shadow-amber-sm'
                  : 'hover:bg-void-300/50 border border-transparent',
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200',
                active
                  ? 'bg-amber/20 text-amber'
                  : 'bg-void-300/50 text-slate-dim group-hover:bg-void-400/50 group-hover:text-slate-base',
              )}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('font-medium leading-none mb-0.5 text-sm', active ? 'text-amber' : 'text-slate-bright group-hover:text-slate-full')}>{label}</p>
                <p className="text-[10px] text-slate-dim leading-none">{desc}</p>
              </div>
              {active && <ChevronRight className="w-3 h-3 text-amber/60 flex-shrink-0" />}
            </Link>
          );
        })}
      </nav>

      {/* Storage */}
      <div className="mx-3 mb-3 p-4 bg-void-200/50 rounded-2xl border border-void-400/30">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[11px] font-semibold text-slate-dim uppercase tracking-wider">Storage</span>
          <span className={cn('text-[11px] font-mono font-semibold', usedPct > 80 ? 'text-rose' : 'text-amber')}>
            {usedPct}%
          </span>
        </div>
        <div className="h-1.5 bg-void-400/50 rounded-full overflow-hidden mb-2">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700',
              usedPct > 80 ? 'bg-rose' : usedPct > 60 ? 'bg-amber' : 'bg-emerald',
            )}
            style={{ width: `${Math.min(usedPct, 100)}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-dim font-mono">
          {formatBytes(user?.storageUsedBytes ?? 0)} / {formatBytes(user?.storageQuotaBytes ?? 0)}
        </p>
      </div>

      {/* User */}
      <div className="border-t border-void-400/30 p-3">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-void-300/50 transition-colors group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber/30 to-amber/10 border border-amber/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-amber font-display">
              {user?.fullName?.[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-bright truncate">{user?.fullName}</p>
            <p className="text-[10px] text-slate-dim capitalize font-mono">{user?.plan} plan</p>
          </div>
          <button
            onClick={logout}
            className="text-slate-dim hover:text-rose transition-colors p-1 opacity-0 group-hover:opacity-100"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom glow line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-void-400/50 to-transparent" />
    </aside>
  );
}