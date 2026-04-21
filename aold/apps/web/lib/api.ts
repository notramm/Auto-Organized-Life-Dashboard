// apps/web/src/lib/api.ts

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export const api = axios.create({
  baseURL:         API_URL,
  withCredentials: true,
  headers:         { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { data } = await axios.post(`${API_URL}/api/auth/refresh`, {}, { withCredentials: true });
        setAccessToken(data.data.accessToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        setAccessToken(null);
        if (typeof window !== 'undefined') window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

let _accessToken: string | null = null;
export const getAccessToken = () => _accessToken;
export const setAccessToken = (t: string | null) => { _accessToken = t; };

export async function apiGet<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const res = await api.get<{ success: true; data: T }>(path, { params });
  return res.data.data;
}
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await api.post<{ success: true; data: T }>(path, body);
  return res.data.data;
}
export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await api.patch<{ success: true; data: T }>(path, body);
  return res.data.data;
}
export async function apiDelete<T>(path: string): Promise<T> {
  const res = await api.delete<{ success: true; data: T }>(path);
  return res.data.data;
}