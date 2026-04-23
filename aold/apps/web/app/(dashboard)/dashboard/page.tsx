// apps/web/app/(dashboard)/dashboard/page.tsx
'use client';

import { useAuthStore }   from '../../../stores/auth.store';
import { formatBytes }    from '../../../lib/utils';
import { FolderOpen, Search, Zap, TrendingUp, ArrowUpRight, Sparkles, Lightbulb } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const usedPct = user ? Math.round((user.storageUsedBytes / user.storageQuotaBytes) * 100) : 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const stats = [
    { label: 'Storage Used', value: formatBytes(user?.storageUsedBytes ?? 0), sub: `${usedPct}% of quota`, icon: TrendingUp, color: 'amber' },
    { label: 'Plan',         value: user?.plan?.toUpperCase() ?? '—',           sub: 'Current tier',      icon: Zap,         color: 'blue'  },
    { label: 'Files',        value: '—',                                          sub: 'Total files',       icon: FolderOpen,  color: 'emerald'},
    { label: 'AI Searches',  value: '—',                                          sub: 'This month',        icon: Search,      color: 'rose'  },
  ];

  const colorMap: Record<string, string> = {
    amber:   'text-amber   bg-amber/10   border-amber/20',
    blue:    'text-blue    bg-blue/10    border-blue/20',
    emerald: 'text-emerald bg-emerald/10 border-emerald/20',
    rose:    'text-rose    bg-rose/10    border-rose/20',
  };

  return (
    <div className="space-y-8 animate-fade-up">

      {/* Header */}
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-slate-mid text-sm mb-1 font-medium">
              {greeting},
            </p>
            <h1 className="text-4xl font-bold text-slate-full font-display leading-tight">
              {user?.fullName?.split(' ')[0]}{' '}
              <span className="text-gradient-amber">👋</span>
            </h1>
            <p className="text-slate-dim text-sm mt-2 max-w-sm">
              Your AI data OS is ready. Upload files and let intelligence do the rest.
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-2 bg-emerald/10 border border-emerald/20 rounded-2xl px-4 py-2">
            <div className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
            <span className="text-xs font-medium text-emerald">All systems operational</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, sub, icon: Icon, color }, i) => (
          <div
            key={label}
            className="relative bg-void-200/40 border border-void-400/40 rounded-3xl p-5 card-hover overflow-hidden"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {/* Background glow */}
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-20"
              style={{ background: color === 'amber' ? '#F59E0B' : color === 'blue' ? '#3B82F6' : color === 'emerald' ? '#10B981' : '#F43F5E' }}
            />
            <div className={`inline-flex w-9 h-9 rounded-xl items-center justify-center border mb-4 ${colorMap[color]}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-slate-full font-display mb-1">{value}</p>
            <p className="text-xs text-slate-dim uppercase tracking-wider">{label}</p>
            <p className="text-xs text-slate-mid mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-amber" />
          <h2 className="text-sm font-semibold text-slate-bright uppercase tracking-wider">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { href: '/files',    label: 'Browse Files',  desc: 'View, upload and manage all your files with AI tagging',  icon: FolderOpen, color: 'amber'  },
            { href: '/search',   label: 'AI Search',     desc: 'Ask anything — "beach photos Goa", "my contracts 2024"',   icon: Search,     color: 'blue'   },
            { href: '/insights', label: 'View Insights', desc: 'AI-powered reminders, digests and file groupings',         icon: Lightbulb,  color: 'emerald'},
          ].map(({ href, label, desc, icon: Icon, color }) => (
            <Link
              key={href}
              href={href}
              className="group relative bg-void-200/40 border border-void-400/40 hover:border-void-400 rounded-3xl p-5 card-hover overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-15 transition-opacity duration-300"
                style={{ background: color === 'amber' ? '#F59E0B' : color === 'blue' ? '#3B82F6' : '#10B981' }}
              />
              <div className={`inline-flex w-10 h-10 rounded-2xl items-center justify-center border mb-4 transition-all duration-200 ${colorMap[color]} group-hover:scale-110`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-bright text-sm mb-1">{label}</p>
                  <p className="text-xs text-slate-dim leading-relaxed">{desc}</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-dim group-hover:text-slate-bright group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}