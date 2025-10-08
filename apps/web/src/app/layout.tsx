import { QueryProvider } from '@/lib/query/provider';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    template: '%s | Olympus MVP',
    default: 'Olympus MVP',
  },
  description: 'AI-powered document intelligence and query platform',
  keywords: ['AI', 'document', 'intelligence', 'query', 'platform'],
  authors: [{ name: 'Olympus Team' }],
  creator: 'Olympus Team',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://olympus.dev',
    title: 'Olympus MVP',
    description: 'AI-powered document intelligence and query platform',
    siteName: 'Olympus MVP',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Olympus MVP',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Olympus MVP',
    description: 'AI-powered document intelligence and query platform',
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
