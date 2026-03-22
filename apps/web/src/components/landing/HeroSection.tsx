import Link from 'next/link';
import { Button } from '@olympus/ui';
import { ProductPreview } from './ProductPreview';

interface HeroSectionProps {
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
  subtitle = 'The first artificial data analyst built for document intelligence. Athena analyzes documents, extracts insights, and answers questions—so you can focus on strategic work that matters.',
  ctaText = 'Get Started Free',
  ctaLink = '/signup',
}: HeroSectionProps) {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Meet Athena, Your{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              AI Analyst
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

        {/* Product Preview */}
        <div className="mt-16 max-w-5xl mx-auto">
          <ProductPreview />
        </div>
      </div>
    </section>
  );
}
