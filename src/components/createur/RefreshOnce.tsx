'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Recharge une fois les données serveur de la page et du cadre (le cadre de l'Atelier n'est pas recalculé à la
// navigation) : la cloche « nouvelles commandes » se met à jour dès qu'une commande a été ouverte.
export default function RefreshOnce() {
  const router = useRouter();
  useEffect(() => { router.refresh(); }, [router]);
  return null;
}
