// apps/web/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title:       'AOLD — Personal Data OS',
  description: 'AI-powered file storage, search, and organization',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-void antialiased font-sans noise">
        {children}
      </body>
    </html>
  );
}