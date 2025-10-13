import { AuthenticatedRedirect } from '@/components/auth/AuthenticatedRedirect';
import { FeaturesGrid } from '@/components/landing/FeaturesGrid';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { HeroSection } from '@/components/landing/HeroSection';
import { Footer } from '@/components/layout/Footer';
import { LandingNav } from '@/components/layout/LandingNav';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Olympus MVP | AI-Native Operations Platform',
  description:
    'Collaborate with AI agents in real-time to analyze data, create documents, and accelerate strategic work. Built for teams who demand more.',
};

/**
 * Landing page composed of feature components.
 * Follows component composition best practices.
 * Redirects authenticated users to dashboard.
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <AuthenticatedRedirect />
      <LandingNav />
      <HeroSection />
      <FeaturesGrid />
      <FinalCTA />
      <Footer />
    </div>
  );
}
