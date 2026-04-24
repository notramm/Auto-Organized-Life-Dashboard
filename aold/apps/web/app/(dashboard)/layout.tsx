// apps/web/app/(dashboard)/layout.tsx
'use client';

import { Sidebar }   from '../../components/layout/Sidebar';
import { Topbar }    from '../../components/layout/Topbar';
import { AuthGuard } from '../../components/auth/AuthGuard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-void flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}