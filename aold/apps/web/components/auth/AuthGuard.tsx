// apps/web/components/auth/AuthGuard.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../stores/auth.store';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, initialized, loadUser } = useAuthStore();

  useEffect(() => { loadUser(); }, []);

  useEffect(() => {
    if (initialized && !user) router.push('/login');
  }, [initialized, user]);

  if (!initialized) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-amber border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-dim text-sm animate-pulse">Loading your data OS...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}