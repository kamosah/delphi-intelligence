'use client';

import { AuthenticatedRedirect } from '@/components/auth/AuthenticatedRedirect';
import { FeaturesGrid } from '@/components/landing/FeaturesGrid';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { HeroSection } from '@/components/landing/HeroSection';
import { Footer } from '@/components/layout/Footer';
import { LandingNav } from '@/components/layout/LandingNav';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Landing page composed of feature components.
 * Follows component composition best practices.
 * Redirects authenticated users to dashboard.
 * Also handles Supabase auth callbacks (email verification)
 */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check if this is a Supabase auth callback (has hash parameters)
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      // Redirect to callback page with hash intact
      router.push(`/auth/callback${hash}`);
    }
  }, [router]);

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-gray-50 to-white">
      <AuthenticatedRedirect />
      <LandingNav />
      <HeroSection />
      <FeaturesGrid />
      <FinalCTA />
      <Footer />
    </div>
  );
}
