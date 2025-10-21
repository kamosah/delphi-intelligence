import { QueryProvider } from '@/lib/query/provider';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import 'highlight.js/styles/atom-one-dark.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    template: '%s | Olympus',
    default: 'Olympus - AI-Powered Document Intelligence Platform',
  },
  description:
    'The first artificial data analyst for document intelligence. Olympus analyzes documents, extracts insights, and answers questions using AI-powered natural language queries.',
  keywords: [
    'AI analyst',
    'document intelligence',
    'document analysis',
    'natural language queries',
    'AI-powered search',
    'document processing',
    'RAG',
    'LangChain',
    'enterprise AI',
  ],
  authors: [{ name: 'Olympus Team' }],
  creator: 'Olympus Team',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://olympus.dev',
    title: 'Olympus - AI-Powered Document Intelligence Platform',
    description:
      'The first artificial data analyst for document intelligence. Analyze documents, extract insights, and ask questions in natural language.',
    siteName: 'Olympus',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Olympus - AI Document Intelligence',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Olympus - AI-Powered Document Intelligence',
    description:
      'The first artificial data analyst for document intelligence. Analyze documents, extract insights, and ask questions in natural language.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-gray-50">
        <QueryProvider>
          <div id="root" className="min-h-screen">
            {children}
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
