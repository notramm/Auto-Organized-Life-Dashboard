// apps/web/src/app/(dashboard)/dashboard/page.tsx

'use client';
import React from 'react';
import { useAuthStore } from '../../../stores/auth.store';
import { formatBytes }  from '../../../lib/utils';
import { FolderOpen, Search, Zap, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const usedPct = user
    ? Math.round((user.storageUsedBytes / user.storageQuotaBytes) * 100)
    : 0;

  const stats = [
    { label: 'Storage Used',  value: formatBytes(user?.storageUsedBytes ?? 0), icon: TrendingUp, sub: `${usedPct}% of plan` },
    { label: 'Plan',          value: user?.plan?.toUpperCase() ?? '—',           icon: Zap,        sub: 'Current tier' },
    { label: 'Files',         value: '—',                                          icon: FolderOpen, sub: 'Total files' },
    { label: 'Searches',      value: '—',                                          icon: Search,     sub: 'This month' },
  ];

  return (
    <div className="animate-fade-up space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-slate-full">
          Good morning, {user?.fullName?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-dim text-sm mt-1">
          Here's what's happening with your data
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, sub }) => (
          <div
            key={label}
            className="bg-void-100 border border-void-300 rounded-xl p-4 shadow-card"
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-slate-dim uppercase tracking-wider">{label}</p>
              <div className="w-7 h-7 bg-amber/10 rounded-lg flex items-center justify-center">
                <Icon className="w-3.5 h-3.5 text-amber" />
              </div>
            </div>
            <p className="text-xl font-bold text-slate-full">{value}</p>
            <p className="text-xs text-slate-dim mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-medium text-slate-mid uppercase tracking-wider mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { href: '/files',   label: 'Browse Files',    desc: 'View all your files',             icon: FolderOpen },
            { href: '/search',  label: 'AI Search',       desc: 'Search with natural language',    icon: Search     },
            { href: '/insights',label: 'View Insights',   desc: 'See AI recommendations',          icon: Zap        },
          ].map(({ href, label, desc, icon: Icon }) => (
            <a
              key={href}
              href={href}
              className="bg-void-100 border border-void-300 hover:border-amber/50 rounded-xl p-4 flex items-center gap-3 transition-all duration-150 group"
            >
              <><div className="w-9 h-9 bg-amber/10 rounded-lg flex items-center justify-center group-hover:bg-amber/20 transition-colors">
                  <Icon className="w-4 h-4 text-amber" />
              </div><div>
                      <p className="text-sm font-medium text-slate-bright">{label}</p>
                      <p className="text-xs text-slate-dim">{desc}</p>
                  </div></>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}