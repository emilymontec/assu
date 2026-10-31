'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken } from '@/lib/api-client';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getAccessToken() ? '/portal' : '/login');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
