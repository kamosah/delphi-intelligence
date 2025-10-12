import { Button } from '@olympus/ui';
import Link from 'next/link';

interface LandingNavProps {
  logoText?: string;
}

/**
 * Navigation component for the landing page.
 * Fixed position navbar with auth CTAs.
 * Hex-inspired clean navigation with backdrop blur.
 */
export function LandingNav({ logoText = 'Olympus' }: LandingNavProps) {
  return (
    <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-sm fixed w-full z-10 top-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              {logoText}
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Button asChild variant="ghost">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
