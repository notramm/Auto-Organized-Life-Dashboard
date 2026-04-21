// apps/web/src/components/files/FileCard.tsx
'use client';

import React from 'react';
import { useState, useRef } from 'react';
import {
  Image as ImgIcon, FileText, Video, Files,
  MoreVertical, Trash2, Download, Tag,
} from 'lucide-react';
import { formatBytes, formatDate, cn } from '../../lib/utils';
import { useDeleteFile }               from '../../hooks/useFiles';
import type { FileRecord }             from '@aold/shared-types';

const TYPE_ICON: Record<string, any> = {
  IMAGE: ImgIcon, VIDEO: Video, DOCUMENT: FileText, OTHER: Files,
};

const STATUS_STYLE: Record<string, string> = {
  READY:      'bg-emerald/10 text-emerald   border border-emerald/20',
  PROCESSING: 'bg-amber/10  text-amber      border border-amber/20',
  ERROR:      'bg-rose/10   text-rose       border border-rose/20',
  PENDING:    'bg-void-300  text-slate-dim  border border-void-300',
};

export function FileCard({
  file, viewMode, onSelect,
}: {
  file:       FileRecord;
  viewMode:   'grid' | 'list';
  onSelect?:  (f: FileRecord) => void;
}) {
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const hoverTimer                    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { mutate: deleteFile }        = useDeleteFile();

  const Icon         = TYPE_ICON[file.fileType] ?? Files;
  const thumbnailUrl = (file as any).thumbnailUrl as string | null;
  const aiTags       = ((file as any).tags ?? [])
    .filter((t: any) => t.tagValue?.startsWith('ai:'))
    .slice(0, 3);

  const onMouseEnter = () => {
    hoverTimer.current = setTimeout(() => setShowPreview(true), 400);
  };
  const onMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setShowPreview(false);
  };

  // ── LIST VIEW ─────────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 hover:bg-void-200 rounded-xl transition-colors cursor-pointer group"
        onClick={() => onSelect?.(file)}
      >
        <div className="w-9 h-9 rounded-lg bg-void-200 flex items-center justify-center flex-shrink-0 overflow-hidden border border-void-300">
          {thumbnailUrl
            ? <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
            : <Icon size={16} className="text-slate-dim" />}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-bright truncate">{file.name}</p>
          <p className="text-xs text-slate-dim">{formatDate(file.createdAt)}</p>
        </div>

        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-xs text-slate-dim font-mono">{formatBytes(Number(file.sizeBytes))}</span>
          <span className={cn('text-[10px] px-2 py-0.5 rounded-md font-medium', STATUS_STYLE[file.status])}>
            {file.status.toLowerCase()}
          </span>
        </div>
      </div>
    );
  }

  // ── GRID VIEW ─────────────────────────────────────────────────
  return (
    <div
      className="relative bg-void-100 rounded-2xl border border-void-300 hover:border-amber/40 transition-all duration-200 cursor-pointer group overflow-visible"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={() => onSelect?.(file)}
    >
      {/* Thumbnail */}
      <div className="relative h-36 bg-void-200 rounded-t-2xl overflow-hidden">
        {thumbnailUrl
          ? <img src={thumbnailUrl} alt={file.name} className="w-full h-full object-cover" />
          : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon size={32} className="text-slate-dim" />
            </div>
          )}

        {/* Processing overlay */}
        {file.status === 'PROCESSING' && (
          <div className="absolute inset-0 bg-void/60 flex items-center justify-center">
            <div className="bg-void-100/90 rounded-full px-3 py-1 flex items-center gap-1.5 border border-amber/30">
              <div className="w-2 h-2 rounded-full bg-amber animate-pulse" />
              <span className="text-xs font-medium text-amber">AI Processing</span>
            </div>
          </div>
        )}

        {/* File type badge */}
        <div className="absolute top-2 left-2">
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-void/70 text-slate-mid border border-void-300 backdrop-blur-sm">
            {file.fileType.toLowerCase()}
          </span>
        </div>

        {/* 3-dot menu button */}
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-void/60 hover:bg-void/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-slate-bright border border-void-300 backdrop-blur-sm"
        >
          <MoreVertical size={13} />
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <div
            className="absolute top-10 right-2 z-50 bg-void-100 rounded-xl border border-void-300 shadow-void py-1 min-w-[140px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-bright hover:bg-void-200 transition-colors">
              <Tag size={13} /> Details
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-bright hover:bg-void-200 transition-colors">
              <Download size={13} /> Download
            </button>
            <div className="h-px bg-void-300 my-1" />
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose hover:bg-rose/10 transition-colors"
              onClick={() => { deleteFile(file.id); setMenuOpen(false); }}
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-3">
        <p className="text-sm font-medium text-slate-bright truncate mb-1">{file.name}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-dim font-mono">{formatBytes(Number(file.sizeBytes))}</span>
          <span className="text-xs text-slate-dim">{formatDate(file.createdAt)}</span>
        </div>
        {aiTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {aiTags.map((t: any) => (
              <span
                key={t.tagValue}
                className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber/10 text-amber border border-amber/20"
              >
                {t.tagValue.replace('ai:', '')}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Hover preview — 3D feature built in */}
      {showPreview && <HoverPreview file={file} thumbnailUrl={thumbnailUrl} />}
    </div>
  );
}

// ── HOVER PREVIEW (3D) ─────────────────────────────────────────────
function HoverPreview({
  file,
  thumbnailUrl,
}: {
  file:         FileRecord;
  thumbnailUrl: string | null;
}) {
  const previewUrl = (file as any).previewUrl  as string | null;
  const aiMeta     = (file as any).aiMetadata  as { description?: string; summary?: string } | null;

  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+12px)] z-50 w-64 bg-void-100 rounded-2xl border border-void-300 shadow-void overflow-hidden pointer-events-none animate-fade-in">

      {/* Media preview */}
      <div className="h-44 bg-void-200 overflow-hidden">
        {file.fileType === 'IMAGE' && previewUrl && (
          <img
            src={previewUrl}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 scale-100 hover:scale-105"
          />
        )}
        {file.fileType === 'VIDEO' && previewUrl && (
          <video
            src={previewUrl}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          />
        )}
        {file.fileType === 'DOCUMENT' && previewUrl && (
          <img
            src={previewUrl}
            alt="Page 1"
            className="w-full h-full object-contain bg-white p-2"
          />
        )}
        {!previewUrl && (
          <div className="w-full h-full flex items-center justify-center">
            <FileText size={40} className="text-slate-dim" />
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="p-3">
        <p className="text-xs font-semibold text-slate-bright truncate">{file.name}</p>
        {(aiMeta?.description || aiMeta?.summary) && (
          <p className="text-[11px] text-slate-dim mt-1 line-clamp-2 leading-relaxed">
            {aiMeta.description ?? aiMeta.summary}
          </p>
        )}
      </div>

      {/* Arrow tip pointing down */}
      <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-void-100 border-r border-b border-void-300 rotate-45" />
    </div>
  );
}