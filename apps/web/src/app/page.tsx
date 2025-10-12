import { FeaturesGrid } from '@/components/landing/FeaturesGrid';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { HeroSection } from '@/components/landing/HeroSection';
import { Footer } from '@/components/layout/Footer';
import { LandingNav } from '@/components/layout/LandingNav';

/**
 * Landing page composed of feature components.
 * Follows component composition best practices.
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <LandingNav />
      <HeroSection />
      <FeaturesGrid />
      <FinalCTA />
      <Footer />
    </div>
  );
}
