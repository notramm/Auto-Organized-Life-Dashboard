// apps/web/src/components/layout/Sidebar.tsx

'use client';
import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, FolderOpen, Search,
  Lightbulb, Settings, Zap, LogOut,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { cn }          from '../../lib/utils';
import { formatBytes } from '../../lib/utils';

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/files',     icon: FolderOpen,      label: 'Files'     },
  { href: '/search',    icon: Search,           label: 'Search'    },
  { href: '/insights',  icon: Lightbulb,        label: 'Insights'  },
];

export function Sidebar() {
  const pathname      = usePathname();
  const { user, logout } = useAuthStore();
  const usedPct = user
    ? Math.round((user.storageUsedBytes / user.storageQuotaBytes) * 100)
    : 0;

  return (
    <aside className="w-56 min-h-screen bg-void-50 border-r border-void-300 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-void-300">
        <div className="w-7 h-7 bg-amber rounded-md flex items-center justify-center shadow-amber animate-pulse-glow">
          <Zap className="w-3.5 h-3.5 text-void" strokeWidth={3} />
        </div>
        <span className="font-bold text-slate-full tracking-tight">AOLD</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
                active
                  ? 'bg-amber/10 text-amber border border-amber/20'
                  : 'text-slate-mid hover:text-slate-bright hover:bg-void-200',
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
              {active && <span className="ml-auto w-1 h-1 bg-amber rounded-full" />}
            </Link>
          );
        })}
      </nav>

      {/* Storage */}
      <div className="px-4 py-3 border-t border-void-300">
        <div className="flex justify-between text-xs text-slate-dim mb-1.5">
          <span>Storage</span>
          <span className={usedPct > 80 ? 'text-rose' : 'text-slate-mid'}>
            {usedPct}%
          </span>
        </div>
        <div className="h-1 bg-void-300 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              usedPct > 80 ? 'bg-rose' : 'bg-amber',
            )}
            style={{ width: `${usedPct}%` }}
          />
        </div>
        <p className="text-xs text-slate-dim mt-1">
          {formatBytes(user?.storageUsedBytes ?? 0)} / {formatBytes(user?.storageQuotaBytes ?? 0)}
        </p>
      </div>

      {/* User */}
      <div className="px-3 py-3 border-t border-void-300 flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-amber/20 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-amber">
            {user?.fullName?.[0]?.toUpperCase() ?? '?'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-bright truncate">{user?.fullName}</p>
          <p className="text-xs text-slate-dim capitalize">{user?.plan} plan</p>
        </div>
        <button
          onClick={logout}
          className="text-slate-dim hover:text-rose transition-colors p-1"
          title="Logout"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
}