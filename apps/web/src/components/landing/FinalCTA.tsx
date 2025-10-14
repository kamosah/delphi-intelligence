import { Button } from '@olympus/ui';
import Link from 'next/link';

interface FinalCTAProps {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
}

/**
 * Final call-to-action section for the landing page.
 * Features a gradient background with centered CTA.
 * Hex-inspired clean design with emphasis on action.
 */
export function FinalCTA({
  title = 'Ready to transform your document workflows?',
  subtitle = 'Join analysts and researchers using Olympus to extract insights from documents 10x faster.',
  ctaText = 'Get started free',
  ctaLink = '/signup',
}: FinalCTAProps) {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 to-indigo-700">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
          {title}
        </h2>
        <p className="text-xl text-blue-100 mb-8">{subtitle}</p>
        <Button
          asChild
          size="lg"
          variant="secondary"
          className="shadow-xl bg-white hover:bg-gray-50 text-blue-600"
        >
          <Link href={ctaLink}>{ctaText}</Link>
        </Button>
      </div>
    </section>
  );
}
