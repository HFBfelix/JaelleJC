import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import SiteLayout from '@/components/layout/SiteLayout';
import Analytics from '@/components/layout/Analytics';
import { getNavCategories } from '@/server/catalog/navigation';
import { sans, serif } from './fonts';
import './globals.css';

// Le menu (catégories) est lu en base à chaque requête : aucune page n'est figée à la construction.
export const dynamic = 'force-dynamic';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.jaellejc.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Jaelle & JC | Cadeau de naissance cousu main, Île-de-France',
  description:
    "Capes de bain, couvertures et cabas cousus main dans notre atelier d'Île-de-France. Séries limitées, pensées pour bébé et pour sa maman.",
  icons: { icon: '/favicon.png', apple: '/favicon.png' },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const categories = await getNavCategories();

  return (
    <html lang="fr" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <SiteLayout categories={categories}>{children}</SiteLayout>
        <Analytics />
      </body>
    </html>
  );
}
