// apps/web/src/components/files/UploadZone.tsx
'use client';

import React from 'react';
import { useCallback, useState }  from 'react';
import { useDropzone }            from 'react-dropzone';
import {
  Upload, X, Loader2, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { useUpload }              from '../../hooks/useFiles';
import { formatBytes, cn }        from '../../lib/utils';

interface UploadItem {
  id:       string;
  file:     File;
  progress: number;
  status:   'pending' | 'uploading' | 'done' | 'error';
  error?:   string;
}

const ACCEPTED = {
  'image/*':         ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic'],
  'video/*':         ['.mp4', '.mov', '.avi', '.mkv', '.webm'],
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain':      ['.txt'],
  'text/markdown':   ['.md'],
};

export function UploadZone({ folderId }: { folderId?: string }) {
  const [items, setItems]       = useState<UploadItem[]>([]);
  const { mutateAsync: upload } = useUpload();

  const updateItem = (id: string, patch: Partial<UploadItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const uploadFile = async (item: UploadItem) => {
    updateItem(item.id, { status: 'uploading' });
    try {
      await upload({
        file:       item.file,
        folderId,
        onProgress: (pct) => updateItem(item.id, { progress: pct }),
      });
      updateItem(item.id, { status: 'done', progress: 100 });
    } catch (err: any) {
      updateItem(item.id, { status: 'error', error: err?.message ?? 'Upload failed' });
    }
  };

  const onDrop = useCallback(async (accepted: File[]) => {
    const newItems: UploadItem[] = accepted.map((file) => ({
      id:       `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      progress: 0,
      status:   'pending' as const,
    }));
    setItems((prev) => [...prev, ...newItems]);

    // Upload 3 concurrently
    for (let i = 0; i < newItems.length; i += 3) {
      await Promise.all(newItems.slice(i, i + 3).map(uploadFile));
    }
  }, [folderId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept:  ACCEPTED,
    maxSize: 500 * 1024 * 1024,
    multiple: true,
  });

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id || i.status === 'uploading'));

  const doneCount = items.filter((i) => i.status === 'done').length;

  return (
    <div className="flex flex-col gap-3">

      {/* ── Drop zone ─────────────────────────────────────────────── */}
      <div
        {...getRootProps()}
        className={cn(
          'relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200',
          isDragActive
            ? 'border-amber bg-amber/5 scale-[1.01]'
            : 'border-void-300 bg-void-100 hover:border-amber/50 hover:bg-amber/5',
        )}
      >
        <input {...getInputProps()} />

        <div className={cn(
          'w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-300',
          isDragActive ? 'bg-amber/20 scale-110 shadow-amber' : 'bg-void-200',
        )}>
          <Upload
            size={24}
            className={cn('transition-colors', isDragActive ? 'text-amber' : 'text-slate-dim')}
          />
        </div>

        {isDragActive ? (
          <p className="text-amber font-semibold text-sm">Drop files here!</p>
        ) : (
          <>
            <p className="text-slate-bright font-medium text-sm">
              Drag & drop files, or{' '}
              <span className="text-amber">browse</span>
            </p>
            <p className="text-slate-dim text-xs mt-1.5">
              Images, Videos, PDFs, Docs — up to 500 MB each
            </p>
          </>
        )}
      </div>

      {/* ── Upload queue ─────────────────────────────────────────── */}
      {items.length > 0 && (
        <div className="bg-void-100 rounded-2xl border border-void-300 overflow-hidden">

          {/* All-done banner */}
          {doneCount > 0 && doneCount === items.length && (
            <div className="flex items-center gap-2 px-4 py-3 bg-emerald/10 border-b border-emerald/20">
              <CheckCircle2 size={15} className="text-emerald flex-shrink-0" />
              <span className="text-sm text-emerald font-medium">
                {doneCount} file{doneCount > 1 ? 's' : ''} uploaded — AI processing started
              </span>
            </div>
          )}

          <div className="divide-y divide-void-300">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">

                {/* Thumb preview */}
                <div className="w-10 h-10 rounded-lg bg-void-200 flex-shrink-0 overflow-hidden border border-void-300">
                  {item.file.type.startsWith('image/') ? (
                    <img
                      src={URL.createObjectURL(item.file)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Upload size={14} className="text-slate-dim" />
                    </div>
                  )}
                </div>

                {/* Name + progress */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-bright truncate">{item.file.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {item.status === 'uploading' ? (
                      <>
                        <div className="flex-1 h-1 rounded-full bg-void-300 overflow-hidden">
                          <div
                            className="h-full bg-amber rounded-full transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-dim font-mono w-8 text-right">
                          {item.progress}%
                        </span>
                      </>
                    ) : item.status === 'done' ? (
                      <span className="text-xs text-emerald font-medium">✓ Uploaded</span>
                    ) : item.status === 'error' ? (
                      <span className="text-xs text-rose">{item.error}</span>
                    ) : (
                      <span className="text-xs text-slate-dim font-mono">
                        {formatBytes(item.file.size)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status icon */}
                <div className="flex-shrink-0">
                  {item.status === 'uploading' && (
                    <Loader2 size={15} className="animate-spin text-amber" />
                  )}
                  {item.status === 'done' && (
                    <CheckCircle2 size={15} className="text-emerald" />
                  )}
                  {item.status === 'error' && (
                    <AlertCircle size={15} className="text-rose" />
                  )}
                  {item.status === 'pending' && (
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-slate-dim hover:text-rose transition-colors"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}