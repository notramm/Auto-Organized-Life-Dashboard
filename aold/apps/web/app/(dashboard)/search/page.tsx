// apps/web/src/app/(dashboard)/search/page.tsx
'use client';
import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter }  from 'next/navigation';
import {
  Search, X, Image as ImgIcon, FileText,
  Video, Files, Clock, Zap, Filter,
} from 'lucide-react';
import { useSearch, useSearchFeedback } from '../../../hooks/useSearch';
import { formatDate, cn }               from '../../../lib/utils';

// ── Type filter config ────────────────────────────────────────────
const TYPE_FILTERS = [
  { label: 'All',       value: undefined,    icon: Files    },
  { label: 'Images',    value: 'IMAGE',      icon: ImgIcon  },
  { label: 'Videos',    value: 'VIDEO',      icon: Video    },
  { label: 'Documents', value: 'DOCUMENT',   icon: FileText },
];

// ── Example queries for empty state ──────────────────────────────
const EXAMPLE_QUERIES = [
  'beach photos from Goa trip',
  'documents related to internship',
  'my Diwali celebration photos',
  'contracts signed in 2024',
  'product roadmap slides',
  'street food videos Mumbai',
];

export default function SearchPage() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const initialQuery  = searchParams.get('q') ?? '';

  const [query,      setQuery]      = useState(initialQuery);
  const [committed,  setCommitted]  = useState(initialQuery);
  const [fileType,   setFileType]   = useState<string | undefined>(undefined);
  const [showFilter, setShowFilter] = useState(false);
  const inputRef                    = useRef<HTMLInputElement>(null);

  const { data, isLoading, isFetching } = useSearch({
    q:        committed,
    fileType,
    enabled:  committed.trim().length > 0,
  });

  const { mutate: logFeedback } = useSearchFeedback();

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Sync URL param → input
  useEffect(() => {
    if (initialQuery && initialQuery !== query) {
      setQuery(initialQuery);
      setCommitted(initialQuery);
    }
  }, [initialQuery]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setCommitted(q);
    router.replace(`/search?q=${encodeURIComponent(q)}`, { scroll: false });
  }

  function handleResultClick(fileId: string) {
    if (committed) {
      logFeedback({ query: committed, fileId, actionType: 'click' });
    }
  }

  function handleExampleClick(q: string) {
    setQuery(q);
    setCommitted(q);
    router.replace(`/search?q=${encodeURIComponent(q)}`, { scroll: false });
  }

  const results   = data?.results   ?? [];
  const total     = data?.total     ?? 0;
  const tookMs    = data?.tookMs    ?? 0;
  const hasQuery  = committed.trim().length > 0;
  const isSearching = isLoading || isFetching;

  return (
    <div className="animate-fade-up max-w-4xl mx-auto space-y-6">

      {/* ── Page header ────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-full flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber" />
          AI Search
        </h1>
        <p className="text-slate-dim text-sm mt-0.5">
          Search your files using natural language
        </p>
      </div>

      {/* ── Search bar ─────────────────────────────────────────── */}
      <form onSubmit={handleSearch} className="relative">
        <div className={cn(
          'flex items-center gap-3 bg-void-100 border rounded-2xl px-4 py-3 transition-all duration-200',
          query ? 'border-amber shadow-amber' : 'border-void-300',
        )}>
          {isSearching
            ? <div className="w-5 h-5 border-2 border-amber border-t-transparent rounded-full animate-spin flex-shrink-0" />
            : <Search className="w-5 h-5 text-slate-dim flex-shrink-0" />}

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try: 'beach photos Goa', 'internship documents', 'cat playing with string'..."
            className="flex-1 bg-transparent text-slate-bright placeholder:text-slate-dim text-sm focus:outline-none"
          />

          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setCommitted(''); router.replace('/search'); }}
              className="text-slate-dim hover:text-slate-bright transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowFilter((v) => !v)}
            className={cn(
              'p-1.5 rounded-lg transition-all flex-shrink-0',
              showFilter ? 'bg-amber/10 text-amber' : 'text-slate-dim hover:text-slate-bright',
            )}
          >
            <Filter className="w-4 h-4" />
          </button>

          <button
            type="submit"
            className="bg-amber text-void px-4 py-1.5 rounded-xl text-sm font-medium hover:bg-amber-glow transition-colors flex-shrink-0"
          >
            Search
          </button>
        </div>

        {/* Keyboard hint */}
        <p className="text-xs text-slate-dim mt-2 ml-1">
          Press <kbd className="bg-void-200 border border-void-300 px-1.5 py-0.5 rounded text-xs">Enter</kbd> to search
        </p>
      </form>

      {/* ── Type filter pills ───────────────────────────────────── */}
      {showFilter && (
        <div className="flex items-center gap-2 animate-fade-in">
          <span className="text-xs text-slate-dim mr-1">Filter by:</span>
          {TYPE_FILTERS.map(({ label, value, icon: Icon }) => (
            <button
              key={label}
              onClick={() => setFileType(fileType === value ? undefined : value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-150',
                fileType === value
                  ? 'bg-amber text-void border-amber shadow-amber'
                  : 'bg-void-100 text-slate-dim border-void-300 hover:border-amber/50 hover:text-slate-bright',
              )}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── Results meta ────────────────────────────────────────── */}
      {hasQuery && !isSearching && data && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-dim">
            <span className="text-slate-bright font-medium">{total}</span>{' '}
            result{total !== 1 ? 's' : ''} for{' '}
            <span className="text-amber">"{committed}"</span>
          </p>
          <p className="text-xs text-slate-dim font-mono">{tookMs}ms</p>
        </div>
      )}

      {/* ── Results list ────────────────────────────────────────── */}
      {isSearching && hasQuery ? (
        <SearchSkeleton />
      ) : hasQuery && results.length === 0 ? (
        <NoResults query={committed} onExample={handleExampleClick} />
      ) : results.length > 0 ? (
        <div className="flex flex-col gap-3">
          {results.map((result, idx) => (
            <SearchResultCard
              key={result.fileId}
              result={result}
              index={idx}
              onClick={() => handleResultClick(result.fileId)}
            />
          ))}
        </div>
      ) : (
        <EmptyState onExample={handleExampleClick} />
      )}
    </div>
  );
}

// ── Search result card ────────────────────────────────────────────
function SearchResultCard({
  result, index, onClick,
}: {
  result: any; index: number; onClick: () => void;
}) {
  const TypeIcon =
    result.fileType === 'IMAGE'    ? ImgIcon  :
    result.fileType === 'VIDEO'    ? Video    :
    result.fileType === 'DOCUMENT' ? FileText : Files;

  const scoreColor =
    result.score > 0.8 ? 'text-emerald' :
    result.score > 0.5 ? 'text-amber'   : 'text-slate-dim';

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 bg-void-100 border border-void-300 hover:border-amber/40 rounded-2xl p-4 cursor-pointer transition-all duration-150 group animate-fade-up"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Thumbnail */}
      <div className="w-16 h-16 rounded-xl bg-void-200 flex-shrink-0 overflow-hidden border border-void-300">
        {result.thumbnailUrl ? (
          <img
            src={result.thumbnailUrl}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <TypeIcon className="w-6 h-6 text-slate-dim" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-medium text-slate-bright truncate group-hover:text-amber transition-colors">
            {result.fileName}
          </p>
          <span className={cn('text-xs font-mono flex-shrink-0', scoreColor)}>
            {Math.round(result.score * 100)}%
          </span>
        </div>

        {/* Match reason */}
        <div className="flex items-center gap-1.5 mb-2">
          <Zap className="w-3 h-3 text-amber flex-shrink-0" />
          <p className="text-xs text-amber">{result.matchReason}</p>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-void-200 text-slate-dim border border-void-300">
            {result.fileType.toLowerCase()}
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-dim">
            <Clock className="w-3 h-3" />
            {formatDate(result.createdAt)}
          </span>

          {/* Top AI tags */}
          {result.tags
            ?.filter((t: string) => t.startsWith('ai:'))
            .slice(0, 3)
            .map((tag: string) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber/10 text-amber border border-amber/20"
              >
                {tag.replace('ai:', '')}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────
function SearchSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 bg-void-100 border border-void-300 rounded-2xl p-4">
          <div className="w-16 h-16 rounded-xl skeleton flex-shrink-0" />
          <div className="flex-1">
            <div className="h-3.5 rounded skeleton w-2/3 mb-2" />
            <div className="h-2.5 rounded skeleton w-1/3 mb-3" />
            <div className="flex gap-2">
              <div className="h-4 w-14 rounded-lg skeleton" />
              <div className="h-4 w-20 rounded-lg skeleton" />
              <div className="h-4 w-16 rounded-lg skeleton" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── No results ────────────────────────────────────────────────────
function NoResults({ query, onExample }: { query: string; onExample: (q: string) => void }) {
  return (
    <div className="bg-void-100 border border-void-300 rounded-2xl p-10 text-center">
      <Search className="w-10 h-10 mx-auto mb-4 text-slate-dim" />
      <p className="text-slate-bright font-medium mb-1">No results for "{query}"</p>
      <p className="text-slate-dim text-sm mb-6">
        Try different keywords, or upload more files
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {EXAMPLE_QUERIES.slice(0, 3).map((q) => (
          <button
            key={q}
            onClick={() => onExample(q)}
            className="text-xs px-3 py-1.5 rounded-xl bg-void-200 text-slate-mid border border-void-300 hover:border-amber hover:text-amber transition-all"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Empty state (no query yet) ────────────────────────────────────
function EmptyState({ onExample }: { onExample: (q: string) => void }) {
  return (
    <div className="space-y-6">
      {/* Hero prompt */}
      <div className="bg-void-100 border border-void-300 rounded-2xl p-8 text-center">
        <div className="w-14 h-14 bg-amber/10 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-amber">
          <Zap className="w-7 h-7 text-amber" />
        </div>
        <h2 className="text-lg font-bold text-slate-full mb-2">Ask anything about your files</h2>
        <p className="text-slate-dim text-sm max-w-md mx-auto leading-relaxed">
          AOLD understands meaning — not just filenames. Search by what's{' '}
          <span className="text-amber">in</span> your files, not just what they're named.
        </p>
      </div>

      {/* Example queries */}
      <div>
        <p className="text-xs text-slate-dim uppercase tracking-wider mb-3 ml-1">
          Try these searches
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {EXAMPLE_QUERIES.map((q, i) => (
            <button
              key={q}
              onClick={() => onExample(q)}
              className="flex items-center gap-3 bg-void-100 border border-void-300 hover:border-amber/50 hover:bg-amber/5 rounded-xl px-4 py-3 text-left transition-all duration-150 group animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <Search className="w-3.5 h-3.5 text-slate-dim group-hover:text-amber transition-colors flex-shrink-0" />
              <span className="text-sm text-slate-mid group-hover:text-slate-bright transition-colors truncate">
                {q}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}