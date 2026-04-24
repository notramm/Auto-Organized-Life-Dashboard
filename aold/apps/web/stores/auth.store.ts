// apps/web/stores/auth.store.ts

import { create } from 'zustand';
import { api, setAccessToken } from '../lib/api';

interface User {
  id:                string;
  email:             string;
  fullName:          string;
  avatarUrl?:        string;
  plan:              string;
  storageUsedBytes:  number;
  storageQuotaBytes: number;
}

interface AuthStore {
  user:        User | null;
  loading:     boolean;
  initialized: boolean;

  login:    (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout:   () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user:        null,
  loading:     false,
  initialized: false,

  loadUser: async () => {
    try {
      const { data: refreshData } = await api.post('/api/auth/refresh');
      setAccessToken(refreshData.data.accessToken);
      const { data } = await api.get('/api/auth/me');
      set({ user: data.data, initialized: true });
    } catch {
      set({ user: null, initialized: true });
    }
  },

  login: async (email, password) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      setAccessToken(data.data.accessToken);
      const { data: me } = await api.get('/api/auth/me');
      set({ user: me.data, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  register: async (email, password, fullName) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/api/auth/register', { email, password, fullName });
      setAccessToken(data.data.accessToken);
      const { data: me } = await api.get('/api/auth/me');
      set({ user: me.data, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  logout: async () => {
    try { await api.post('/api/auth/logout'); } catch { /* ignore */ }
    setAccessToken(null);
    set({ user: null });
    window.location.href = '/login';
  },
}));