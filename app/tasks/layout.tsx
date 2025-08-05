import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Scira Tasks - Automated Search Monitoring',
  description:
    'Schedule automated searches and get notified when they complete. Monitor trends, track developments, and stay informed with intelligent tasks.',
  keywords: 'automated search, monitoring, scheduled queries, AI tasks, search automation, trend tracking',
  openGraph: {
    title: 'Scira Tasks - Automated Search Monitoring',
    description:
      'Schedule automated searches and get notified when they complete. Monitor trends, track developments, and stay informed with intelligent tasks.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Scira Tasks - Automated Search Monitoring',
    description:
      'Schedule automated searches and get notified when they complete. Monitor trends, track developments, and stay informed with intelligent tasks.',
  },
};

interface TasksLayoutProps {
  children: React.ReactNode;
}

export default function TasksLayout({ children }: TasksLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col min-h-screen">
        <main className="flex-1" role="main" aria-label="Tasks management">
          {children}
        </main>
      </div>
    </div>
  );
}
