import type { Metadata } from 'next';
import React from 'react';

import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import './globals.css';

export const metadata: Metadata = {
  title: 'Template Beta - Cloudflare Supabase',
  description: 'Next.js template with Cloudflare Workers and Supabase',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-neutral-100 text-neutral-900">
        <div className="flex min-h-screen flex-col">
          <Header showAuthButton={true} />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
