'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * New Thread redirect page
 *
 * Redirects to the main threads page for creating a new thread.
 * This route exists for semantic URL structure.
 */
export default function NewThreadPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/threads');
  }, [router]);

  return null;
}
