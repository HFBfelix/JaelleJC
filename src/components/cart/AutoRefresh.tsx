'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Relit la page serveur à intervalle régulier (confirmation en attente du webhook Stripe), une minute au plus.
export default function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    let count = 0;
    const id = setInterval(() => {
      count += 1;
      if (count * seconds > 60) clearInterval(id);
      else router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
