'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MiningAutomationPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/mining/overview');
  }, [router]);

  return null;
}
