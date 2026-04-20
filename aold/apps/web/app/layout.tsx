// apps/web/src/app/layout.tsx

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title:       'AOLD — Your Personal Data OS',
  description: 'AI-powered file storage, search, and organization',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-void text-slate-bright antialiased">
        {children}
      </body>
    </html>
  );
}