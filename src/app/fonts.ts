import { Crimson_Pro, Source_Sans_3 } from 'next/font/google';

// Direction « Atelier » (décision de Jaelle du 28/10/2026) : Crimson Pro 400 droit pour les titres,
// Source Sans 3 400 et 600 pour le texte.
export const serif = Crimson_Pro({
  subsets: ['latin'],
  weight: '400',
  style: 'normal',
  display: 'swap',
  variable: '--font-serif',
});

export const sans = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '600'],
  display: 'swap',
  variable: '--font-sans',
});
