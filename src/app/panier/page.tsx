import type { Metadata } from 'next';
import CartPageView from '@/components/cart/CartPageView';

// Page « Votre sélection » : même panier que le tiroir, lu côté serveur par le layout. Page privée : noindex.
export const metadata: Metadata = {
  title: 'Votre sélection | Jaelle & JC',
  robots: { index: false, follow: false },
};

export default function PanierPage() {
  return <CartPageView />;
}
