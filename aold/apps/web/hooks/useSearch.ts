// apps/web/src/hooks/useSearch.ts

import { useQuery, useMutation } from '@tanstack/react-query';
import { apiGet, apiPost }       from '../lib/api';

interface SearchResult {
  fileId:       string;
  fileName:     string;
  fileType:     string;
  mimeType:     string;
  thumbnailUrl: string | null;
  matchReason:  string;
  score:        number;
  tags:         string[];
  createdAt:    string;
}

interface SearchResponse {
  query:   string;
  results: SearchResult[];
  total:   number;
  tookMs:  number;
}

interface SearchParams {
  q:        string;
  fileType?: string;
  from?:    string;
  to?:      string;
  tags?:    string;
  limit?:   number;
  offset?:  number;
  enabled?: boolean;
}

export function useSearch({ enabled = true, ...params }: SearchParams) {
  // Build query params — strip undefined
  const queryParams: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') queryParams[k] = v;
  }

  return useQuery({
    queryKey:  ['search', queryParams],
    queryFn:   () => apiGet<SearchResponse>('/api/search', queryParams),
    enabled:   enabled && params.q.trim().length > 0,
    staleTime: 60_000,     // 1 min — search results stay fresh
    retry:     1,
  });
}

export function useSearchFeedback() {
  return useMutation({
    mutationFn: (payload: { query: string; fileId: string; actionType: string }) =>
      apiPost('/api/search/feedback', payload),
  });
}

export function useSearchSuggestions(prefix: string) {
  return useQuery({
    queryKey:  ['search-suggestions', prefix],
    queryFn:   () => apiGet<{ suggestions: string[] }>('/api/search/suggestions', { q: prefix }),
    enabled:   prefix.trim().length >= 2,
    staleTime: 120_000,
  });
}