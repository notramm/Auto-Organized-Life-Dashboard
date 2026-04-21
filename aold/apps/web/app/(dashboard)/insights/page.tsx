// apps/web/src/app/(dashboard)/insights/page.tsx
'use client';

import React from 'react';
import { useState }   from 'react';
import {
  Lightbulb, Bell, FolderPlus, FileText, RefreshCw,
  CheckCheck, X, Clock, HardDrive, Zap,
  Image as ImgIcon, Video, Files, ChevronRight,
} from 'lucide-react';
import {
  useInsights, useStorageStats, useMarkRead,
  useMarkAllRead, useDismissInsight, useGenerateDigest,
} from '../../../hooks/useInsights';
import { formatBytes, cn } from '../../../lib/utils';

// ── Icon per insight type ─────────────────────────────────────────
const TYPE_ICON: Record<string, any> = {
  reminder:   Bell,
  group:      FolderPlus,
  digest:     Lightbulb,
  suggestion: Zap,
};

const TYPE_COLOR: Record<string, string> = {
  reminder:   'text-rose   bg-rose/10   border-rose/20',
  group:      'text-amber  bg-amber/10  border-amber/20',
  digest:     'text-emerald bg-emerald/10 border-emerald/20',
  suggestion: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
};

const PRIORITY_DOT: Record<string, string> = {
  high:   'bg-rose',
  medium: 'bg-amber',
  low:    'bg-slate-dim',
};

const STORAGE_TYPE_ICON: Record<string, any> = {
  IMAGE: ImgIcon, VIDEO: Video, DOCUMENT: FileText, OTHER: Files,
};

const STORAGE_TYPE_COLOR: Record<string, string> = {
  IMAGE:    'bg-amber',
  VIDEO:    'bg-blue-400',
  DOCUMENT: 'bg-emerald',
  OTHER:    'bg-slate-dim',
};

export default function InsightsPage() {
  const [filter, setFilter] = useState<string | undefined>(undefined);

  const { data,    isLoading }           = useInsights();
  const { data: storage }                = useStorageStats();
  const { mutate: markRead }             = useMarkRead();
  const { mutate: markAllRead, isPending: markingAll } = useMarkAllRead();
  const { mutate: dismiss }              = useDismissInsight();
  const { mutate: generate, isPending: generating }    = useGenerateDigest();

  const items       = data?.items       ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const FILTERS = [
    { label: 'All',         value: undefined     },
    { label: 'Reminders',   value: 'reminder'    },
    { label: 'Groups',      value: 'group'       },
    { label: 'Digest',      value: 'digest'      },
    { label: 'Suggestions', value: 'suggestion'  },
  ];

  const filtered = filter ? items.filter((i) => i.type === filter) : items;

  return (
    <div className="animate-fade-up max-w-4xl mx-auto space-y-6">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-full flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber" />
            Insights
          </h1>
          <p className="text-slate-dim text-sm mt-0.5">
            AI-powered observations about your files
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead()}
              disabled={markingAll}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-void-100 border border-void-300 text-slate-mid hover:border-amber hover:text-amber transition-all"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read ({unreadCount})
            </button>
          )}
          <button
            onClick={() => generate()}
            disabled={generating}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-amber text-void font-medium hover:bg-amber-glow transition-all shadow-amber"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', generating && 'animate-spin')} />
            {generating ? 'Generating...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Storage widget ───────────────────────────────────────── */}
      {storage && (
        <div className="bg-void-100 border border-void-300 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <HardDrive className="w-4 h-4 text-amber" />
            <h2 className="text-sm font-semibold text-slate-bright">Storage</h2>
            <span className="ml-auto text-xs text-slate-dim font-mono capitalize">{storage.plan} plan</span>
          </div>

          {/* Main bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-slate-dim mb-1.5">
              <span>{formatBytes(storage.usedBytes)} used</span>
              <span className={storage.usedPercent > 80 ? 'text-rose font-medium' : ''}>
                {storage.usedPercent}% of {formatBytes(storage.quotaBytes)}
              </span>
            </div>
            <div className="h-2 bg-void-300 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  storage.usedPercent > 80 ? 'bg-rose' :
                  storage.usedPercent > 60 ? 'bg-amber' : 'bg-emerald',
                )}
                style={{ width: `${Math.min(storage.usedPercent, 100)}%` }}
              />
            </div>
          </div>

          {/* By type */}
          {storage.byType.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
              {storage.byType.map(({ fileType, bytes, count }) => {
                const Icon  = STORAGE_TYPE_ICON[fileType] ?? Files;
                const color = STORAGE_TYPE_COLOR[fileType] ?? 'bg-slate-dim';
                return (
                  <div key={fileType} className="bg-void-200 rounded-xl p-3 border border-void-300">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className={cn('w-1.5 h-1.5 rounded-full', color)} />
                      <span className="text-[10px] text-slate-dim uppercase tracking-wider">{fileType.toLowerCase()}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-bright">{formatBytes(bytes)}</p>
                    <p className="text-[10px] text-slate-dim mt-0.5">{count} file{count !== 1 ? 's' : ''}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Filter pills ────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map(({ label, value }) => (
          <button
            key={label}
            onClick={() => setFilter(value)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-150',
              filter === value
                ? 'bg-amber text-void border-amber shadow-amber'
                : 'bg-void-100 text-slate-dim border-void-300 hover:border-amber/50 hover:text-slate-bright',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Insight cards ────────────────────────────────────────── */}
      {isLoading ? (
        <InsightsSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyInsights onGenerate={() => generate()} generating={generating} />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((item, idx) => (
            <InsightCard
              key={item.id}
              item={item}
              index={idx}
              onRead={() => !item.isRead && markRead(item.id)}
              onDismiss={() => dismiss(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Insight card ──────────────────────────────────────────────────
function InsightCard({
  item, index, onRead, onDismiss,
}: {
  item:      any;
  index:     number;
  onRead:    () => void;
  onDismiss: () => void;
}) {
  const Icon      = TYPE_ICON[item.type]  ?? Lightbulb;
  const colorCls  = TYPE_COLOR[item.type] ?? TYPE_COLOR.digest;
  const dotColor  = PRIORITY_DOT[item.priority] ?? PRIORITY_DOT.low;

  const daysUntil = item.dueDate
    ? Math.ceil((new Date(item.dueDate).getTime() - Date.now()) / 86400_000)
    : null;

  return (
    <div
      onClick={onRead}
      className={cn(
        'relative bg-void-100 border rounded-2xl p-4 cursor-pointer transition-all duration-150 group animate-fade-up',
        item.isRead
          ? 'border-void-300 hover:border-void-200'
          : 'border-void-300 hover:border-amber/40',
      )}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Unread dot */}
      {!item.isRead && (
        <div className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border', colorCls)}>
          <Icon className="w-4 h-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className={cn(
              'text-sm font-medium',
              item.isRead ? 'text-slate-mid' : 'text-slate-bright',
            )}>
              {item.title}
            </p>
            <div className="flex items-center gap-1.5 ml-auto">
              <div className={cn('w-1.5 h-1.5 rounded-full', dotColor)} />
              <span className="text-[10px] text-slate-dim capitalize">{item.priority}</span>
            </div>
          </div>

          <p className="text-xs text-slate-dim leading-relaxed">{item.description}</p>

          {/* Due date */}
          {daysUntil !== null && (
            <div className={cn(
              'flex items-center gap-1 mt-2 text-xs',
              daysUntil <= 7 ? 'text-rose' : daysUntil <= 30 ? 'text-amber' : 'text-slate-dim',
            )}>
              <Clock className="w-3 h-3" />
              {daysUntil <= 0
                ? 'Due today'
                : `${daysUntil} day${daysUntil !== 1 ? 's' : ''} remaining`}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center gap-3 mt-3">
            <span className="text-[10px] text-slate-dim">
              {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
            {item.fileIds?.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-void-200 text-slate-dim border border-void-300">
                {item.fileIds.length} file{item.fileIds.length !== 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss(); }}
              className="ml-auto text-slate-dim hover:text-rose transition-colors opacity-0 group-hover:opacity-100 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────
function InsightsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-void-100 border border-void-300 rounded-2xl p-4 flex gap-3">
          <div className="w-9 h-9 rounded-xl skeleton flex-shrink-0" />
          <div className="flex-1">
            <div className="h-3.5 rounded skeleton w-1/2 mb-2" />
            <div className="h-2.5 rounded skeleton w-full mb-1.5" />
            <div className="h-2.5 rounded skeleton w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────
function EmptyInsights({ onGenerate, generating }: { onGenerate: () => void; generating: boolean }) {
  return (
    <div className="bg-void-100 border border-void-300 rounded-2xl p-12 text-center">
      <div className="w-14 h-14 bg-amber/10 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-amber">
        <Lightbulb className="w-7 h-7 text-amber" />
      </div>
      <p className="text-slate-bright font-medium mb-1">No insights yet</p>
      <p className="text-slate-dim text-sm mb-6 max-w-xs mx-auto">
        Upload and process some files, then generate your first AI digest
      </p>
      <button
        onClick={onGenerate}
        disabled={generating}
        className="inline-flex items-center gap-2 px-4 py-2 bg-amber text-void rounded-xl text-sm font-medium hover:bg-amber-glow transition-all shadow-amber"
      >
        <RefreshCw className={cn('w-4 h-4', generating && 'animate-spin')} />
        {generating ? 'Generating...' : 'Generate Insights'}
      </button>
    </div>
  );
}