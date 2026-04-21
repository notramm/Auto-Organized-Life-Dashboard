// apps/web/src/components/files/FileGrid.tsx
'use client';

import React from 'react';
import { useState }        from 'react';
import { LayoutGrid, List, RefreshCw, Upload } from 'lucide-react';
import { FileCard }        from './FileCard';
import { useFiles }        from '../../hooks/useFiles';
import { cn }              from '../../lib/utils';
import type { FileRecord } from '@aold/shared-types';

const FILTERS = [
  { label: 'All',       value: undefined  },
  { label: 'Images',    value: 'IMAGE'    },
  { label: 'Videos',    value: 'VIDEO'    },
  { label: 'Documents', value: 'DOCUMENT' },
];

function SkeletonCard({ viewMode }: { viewMode: 'grid' | 'list' }) {
  if (viewMode === 'list') return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-9 h-9 rounded-lg skeleton flex-shrink-0" />
      <div className="flex-1">
        <div className="h-3 rounded skeleton w-2/3 mb-2" />
        <div className="h-2.5 rounded skeleton w-1/3" />
      </div>
    </div>
  );
  return (
    <div className="bg-void-100 rounded-2xl border border-void-300 overflow-hidden">
      <div className="h-36 skeleton" />
      <div className="p-3">
        <div className="h-3 rounded skeleton w-3/4 mb-2" />
        <div className="h-2.5 rounded skeleton w-1/2" />
      </div>
    </div>
  );
}

export function FileGrid({
  folderId,
  onFileOpen,
}: {
  folderId?:    string;
  onFileOpen?:  (file: FileRecord) => void;
}) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [fileType, setFileType] = useState<string | undefined>(undefined);
  const [sortBy,   setSortBy]   = useState<'createdAt' | 'name' | 'sizeBytes'>('createdAt');
  const [page,     setPage]     = useState(1);

  const { data, isLoading, refetch, isFetching } = useFiles({
    folderId, fileType, sortBy, sortOrder: 'desc', page, limit: 24,
  });

  const files      = data?.items      ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="flex flex-col gap-4">

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">

        {/* Type filter pills */}
        <div className="flex items-center gap-1 bg-void-200 rounded-xl p-1">
          {FILTERS.map(({ label, value }) => (
            <button
              key={label}
              onClick={() => { setFileType(value); setPage(1); }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                fileType === value
                  ? 'bg-amber text-void shadow-amber'
                  : 'text-slate-dim hover:text-slate-bright',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value as any); setPage(1); }}
          className="text-xs text-slate-bright bg-void-100 border border-void-300 rounded-xl px-3 py-2 focus:outline-none focus:border-amber cursor-pointer"
        >
          <option value="createdAt">Newest first</option>
          <option value="name">Name A–Z</option>
          <option value="sizeBytes">Largest first</option>
        </select>

        <div className="ml-auto flex items-center gap-2">
          {/* Refresh */}
          <button
            onClick={() => void refetch()}
            className={cn(
              'p-2 rounded-xl text-slate-dim hover:text-slate-bright hover:bg-void-200 transition-all',
              isFetching && 'animate-spin text-amber',
            )}
          >
            <RefreshCw size={15} />
          </button>

          {/* View toggle */}
          <div className="flex items-center bg-void-200 rounded-xl p-1 gap-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-1.5 rounded-lg transition-all', viewMode === 'grid' ? 'bg-void-100 text-amber border border-void-300' : 'text-slate-dim')}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-1.5 rounded-lg transition-all', viewMode === 'list' ? 'bg-void-100 text-amber border border-void-300' : 'text-slate-dim')}
            >
              <List size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      {isLoading ? (
        <div className={cn(
          viewMode === 'grid'
            ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
            : 'bg-void-100 rounded-2xl border border-void-300 divide-y divide-void-300',
        )}>
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonCard key={i} viewMode={viewMode} />
          ))}
        </div>
      ) : files.length === 0 ? (
        <div className="bg-void-100 border border-void-300 rounded-2xl py-20 text-center">
          <Upload size={32} className="mx-auto mb-3 text-slate-dim" />
          <p className="text-slate-mid font-medium">No files yet</p>
          <p className="text-slate-dim text-sm mt-1">
            {fileType
              ? `No ${fileType.toLowerCase()}s found`
              : 'Upload your first file above'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {files.map((file) => (
            <FileCard key={file.id} file={file} viewMode="grid" onSelect={onFileOpen} />
          ))}
        </div>
      ) : (
        <div className="bg-void-100 rounded-2xl border border-void-300 overflow-hidden divide-y divide-void-300">
          {files.map((file) => (
            <FileCard key={file.id} file={file} viewMode="list" onSelect={onFileOpen} />
          ))}
        </div>
      )}

      {/* ── Pagination ───────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-void-300 text-slate-bright disabled:opacity-40 disabled:cursor-not-allowed hover:border-amber hover:text-amber transition-colors"
          >
            ← Prev
          </button>
          <span className="text-sm text-slate-dim font-mono">{page} / {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-void-300 text-slate-bright disabled:opacity-40 disabled:cursor-not-allowed hover:border-amber hover:text-amber transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}