// apps/web/src/app/(dashboard)/layout.tsx

'use client';
import React from 'react';
import { useEffect }  from 'react';
import { useRouter }  from 'next/navigation';
import { useAuthStore } from '../../stores/auth.store';
import { Sidebar }    from '../../components/layout/Sidebar';
import { Topbar }     from '../../components/layout/Topbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, initialized, loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (initialized && !user) router.push('/login');
  }, [initialized, user]);

  if (!initialized) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-void flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}