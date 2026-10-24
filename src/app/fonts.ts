import { Cormorant_Garamond, Inter } from 'next/font/google';

// Mêmes graisses que l'ancien lien Google Fonts : Cormorant Garamond 400 (droit + italique), Inter 400 et 500.
export const serif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-serif',
});

export const sans = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-sans',
});
