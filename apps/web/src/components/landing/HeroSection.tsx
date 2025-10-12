import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface HeroSectionProps {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
}

/**
 * Hero section for the landing page.
 * Displays the main value proposition with CTA buttons.
 * Inspired by Hex's clean, data-focused aesthetic.
 */
export function HeroSection({
  title = 'Transform documents into intelligent insights',
  subtitle = 'Olympus is an AI-powered document intelligence platform that helps teams analyze, query, and collaborate on complex documents using natural language.',
  ctaText = 'Start for free',
  ctaLink = '/signup',
}: HeroSectionProps) {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            {title.split(' into ')[0]} into{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {title.split(' into ')[1] || 'intelligent insights'}
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 leading-relaxed">
            {subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="shadow-lg shadow-blue-600/20">
              <Link href={ctaLink}>{ctaText}</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>

        {/* Product Preview - Hex-style minimal placeholder */}
        <div className="mt-16 max-w-5xl mx-auto">
          <div className="relative rounded-xl overflow-hidden shadow-2xl bg-white border border-gray-200">
            <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="text-center p-12">
                <div className="w-20 h-20 mx-auto mb-4 bg-blue-50 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 font-medium">
                  Product preview
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
