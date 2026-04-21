// apps/web/src/app/(dashboard)/files/page.tsx
'use client';

import React from 'react';
import { useState }      from 'react';
import { Upload, X }     from 'lucide-react';
import { UploadZone }    from '../../../components/files/UploadZone';
import { FileGrid }      from '../../../components/files/FileGrid';
import { Button }        from '../../../components/ui/Button';
import type { FileRecord } from '@aold/shared-types';

export default function FilesPage() {
  const [showUpload, setShowUpload] = useState(false);
  const [selected,   setSelected]   = useState<FileRecord | null>(null);

  return (
    <div className="animate-fade-up space-y-6">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-full">Files</h1>
          <p className="text-slate-dim text-sm mt-0.5">All your files, organized by AI</p>
        </div>
        <Button
          variant={showUpload ? 'ghost' : 'primary'}
          size="sm"
          onClick={() => setShowUpload((v) => !v)}
        >
          {showUpload
            ? <><X size={14} /> Close</>
            : <><Upload size={14} /> Upload Files</>}
        </Button>
      </div>

      {/* ── Upload zone ─────────────────────────────────────────── */}
      {showUpload && (
        <div className="animate-fade-up">
          <UploadZone />
        </div>
      )}

      {/* ── File grid ───────────────────────────────────────────── */}
      <FileGrid onFileOpen={setSelected} />

      {/* ── File detail drawer ──────────────────────────────────── */}
      {selected && (
        <div
          className="fixed inset-0 z-40 bg-void/70 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="absolute right-0 top-0 h-full w-80 bg-void-100 border-l border-void-300 p-6 overflow-auto animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-semibold text-slate-full">File Details</h2>
              <button
                onClick={() => setSelected(null)}
                className="text-slate-dim hover:text-slate-bright transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Thumbnail */}
            {(selected as any).thumbnailUrl && (
              <div className="h-40 rounded-xl overflow-hidden bg-void-200 mb-4">
                <img
                  src={(selected as any).thumbnailUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="space-y-4">
              {/* Name */}
              <div>
                <p className="text-xs text-slate-dim uppercase tracking-wider mb-1">Name</p>
                <p className="text-sm text-slate-bright break-all">{selected.name}</p>
              </div>

              {/* Type */}
              <div>
                <p className="text-xs text-slate-dim uppercase tracking-wider mb-1">Type</p>
                <p className="text-sm text-slate-bright">
                  {selected.fileType} · {selected.mimeType}
                </p>
              </div>

              {/* Status */}
              <div>
                <p className="text-xs text-slate-dim uppercase tracking-wider mb-1">Status</p>
                <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                  selected.status === 'READY'
                    ? 'bg-emerald/10 text-emerald border border-emerald/20'
                    : selected.status === 'PROCESSING'
                    ? 'bg-amber/10 text-amber border border-amber/20'
                    : 'bg-rose/10 text-rose border border-rose/20'
                }`}>
                  {selected.status}
                </span>
              </div>

              {/* AI Tags */}
              {(selected as any).tags?.filter((t: any) => t.tagValue?.startsWith('ai:')).length > 0 && (
                <div>
                  <p className="text-xs text-slate-dim uppercase tracking-wider mb-2">AI Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(selected as any).tags
                      .filter((t: any) => t.tagValue?.startsWith('ai:'))
                      .map((t: any) => (
                        <span
                          key={t.tagValue}
                          className="text-xs px-2 py-0.5 rounded-md bg-amber/10 text-amber border border-amber/20"
                        >
                          {t.tagValue.replace('ai:', '')}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* AI Description */}
              {(selected as any).aiMetadata?.description && (
                <div>
                  <p className="text-xs text-slate-dim uppercase tracking-wider mb-1">
                    AI Description
                  </p>
                  <p className="text-sm text-slate-mid leading-relaxed">
                    {(selected as any).aiMetadata.description}
                  </p>
                </div>
              )}

              {/* Document Summary */}
              {(selected as any).aiMetadata?.summary && (
                <div>
                  <p className="text-xs text-slate-dim uppercase tracking-wider mb-1">Summary</p>
                  <p className="text-sm text-slate-mid leading-relaxed">
                    {(selected as any).aiMetadata.summary}
                  </p>
                </div>
              )}

              {/* Video Transcript */}
              {(selected as any).aiMetadata?.transcript && (
                <div>
                  <p className="text-xs text-slate-dim uppercase tracking-wider mb-1">Transcript</p>
                  <p className="text-sm text-slate-mid leading-relaxed line-clamp-6">
                    {(selected as any).aiMetadata.transcript}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}