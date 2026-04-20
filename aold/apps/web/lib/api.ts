// apps/web/src/lib/api.ts

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export const api = axios.create({
  baseURL:        `${API_URL}/api`,
  withCredentials: true, // send HttpOnly refresh cookie
  headers:        { 'Content-Type': 'application/json' },
});

// Attach access token from memory on every request
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { data } = await axios.post(
          `${API_URL}/api/auth/refresh`,
          {},
          { withCredentials: true },
        );
        setAccessToken(data.data.accessToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        setAccessToken(null);
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// In-memory token store (not localStorage — XSS safe)
let _accessToken: string | null = null;
export const getAccessToken  = () => _accessToken;
export const setAccessToken  = (t: string | null) => { _accessToken = t; };