'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

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
