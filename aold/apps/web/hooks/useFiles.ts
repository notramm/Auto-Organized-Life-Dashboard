// apps/web/hooks/useFiles.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete }   from '../lib/api';
import axios                                       from 'axios';

interface FileListResponse {
  items:      any[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

interface UseFilesParams {
  folderId?:  string;
  fileType?:  string;
  tags?:      string;
  sortBy?:    string;
  sortOrder?: string;
  page?:      number;
  limit?:     number;
  deleted?:   boolean;
}

export function useFiles(params: UseFilesParams = {}) {
  const queryParams: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) queryParams[k] = v;
  }

  return useQuery({
    queryKey:  ['files', queryParams],
    queryFn:   () => apiGet<FileListResponse>('/api/files', queryParams),
    staleTime: 30_000,
  });
}

export function useFile(fileId: string) {
  return useQuery({
    queryKey: ['file', fileId],
    queryFn:  () => apiGet<any>(`/api/files/${fileId}`),
    enabled:  !!fileId,
  });
}

export function useDeleteFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) => apiDelete<any>(`/api/files/${fileId}`),
    onSuccess:  () => void qc.invalidateQueries({ queryKey: ['files'] }),
  });
}

export function useRestoreFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) => apiPost<any>(`/api/files/${fileId}/restore`, {}),
    onSuccess:  () => void qc.invalidateQueries({ queryKey: ['files'] }),
  });
}

export function useUpdateFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fileId, data }: { fileId: string; data: any }) =>
      apiPatch<any>(`/api/files/${fileId}`, data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['files'] }),
  });
}

export function useUpload() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      folderId,
      onProgress,
    }: {
      file:        File;
      folderId?:   string;
      onProgress?: (pct: number) => void;
    }) => {
      // Step 1 — Get presigned URL
      const { fileId, uploadUrl } = await apiPost<{ fileId: string; uploadUrl: string; expiresAt: string }>(
        '/api/files/presign',
        {
          filename:  file.name,
          mimeType:  file.type || 'application/octet-stream',
          sizeBytes: file.size,
          folderId,
        },
      );

      // Step 2 — Upload directly to S3/MinIO with progress
      await axios.put(uploadUrl, file, {
        headers:         { 'Content-Type': file.type || 'application/octet-stream' },
        onUploadProgress: (e) => {
          if (e.total && onProgress) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        },
      });

      // Step 3 — Confirm upload (triggers AI pipeline)
      await apiPost(`/api/files/${fileId}/confirm`, {});

      return { fileId };
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['files'] }),
  });
}

// Folder hooks
export function useFolders(parentId?: string) {
  return useQuery({
    queryKey: ['folders', parentId],
    queryFn:  () => apiGet<any[]>('/api/folders', parentId ? { parentId } : {}),
    staleTime: 60_000,
  });
}

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; parentId?: string }) =>
      apiPost<any>('/api/folders', data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['folders'] }),
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (folderId: string) => apiDelete<any>(`/api/folders/${folderId}`),
    onSuccess:  () => void qc.invalidateQueries({ queryKey: ['folders'] }),
  });
}