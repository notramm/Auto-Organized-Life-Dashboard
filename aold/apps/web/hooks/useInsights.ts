// apps/web/src/hooks/useInsights.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete }   from '../lib/api';

export interface InsightItem {
  id:          string;
  type:        'reminder' | 'suggestion' | 'group' | 'digest';
  title:       string;
  description: string;
  fileIds:     string[];
  priority:    'low' | 'medium' | 'high';
  dueDate?:    string;
  isRead:      boolean;
  isDismissed: boolean;
  createdAt:   string;
}

interface InsightsResponse {
  items:       InsightItem[];
  total:       number;
  unreadCount: number;
  page:        number;
  totalPages:  number;
}

interface StorageStats {
  usedBytes:   number;
  quotaBytes:  number;
  usedPercent: number;
  plan:        string;
  byType:      Array<{ fileType: string; bytes: number; count: number }>;
}

export function useInsights(page = 1) {
  return useQuery({
    queryKey:  ['insights', page],
    queryFn:   () => apiGet<InsightsResponse>('/api/insights', { page, limit: 20 }),
    staleTime: 60_000,
  });
}

export function useStorageStats() {
  return useQuery({
    queryKey: ['storage-stats'],
    queryFn:  () => apiGet<StorageStats>('/api/insights/storage'),
    staleTime: 120_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiPatch(`/api/insights/${id}/read`, {}),
    onSuccess:  () => void qc.invalidateQueries({ queryKey: ['insights'] }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost('/api/insights/read-all', {}),
    onSuccess:  () => void qc.invalidateQueries({ queryKey: ['insights'] }),
  });
}

export function useDismissInsight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/insights/${id}`),
    onSuccess:  () => void qc.invalidateQueries({ queryKey: ['insights'] }),
  });
}

export function useGenerateDigest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost('/api/insights/generate', {}),
    onSuccess:  () => void qc.invalidateQueries({ queryKey: ['insights'] }),
  });
}