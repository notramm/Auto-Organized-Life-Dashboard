// apps/web/components/layout/Providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            60_000,
      retry:                1,
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background:   '#0D1420',
            color:        '#CBD5E1',
            border:       '1px solid #243659',
            borderRadius: '16px',
            fontSize:     '13px',
            fontFamily:   'var(--font-sans)',
          },
          success: {
            iconTheme: { primary: '#10B981', secondary: '#0D1420' },
          },
          error: {
            iconTheme: { primary: '#F43F5E', secondary: '#0D1420' },
          },
        }}
      />
    </QueryClientProvider>
  );
}