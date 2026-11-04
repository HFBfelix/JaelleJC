import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import AccountNav from '@/components/account/AccountNav';
import { getSessionUser } from '@/server/auth/session';

// Compte de la cliente : session vérifiée ici et dans chaque page (chaque action la revérifie aussi).
// Ordinateur : menu à gauche, contenu à droite ; mobile : le contenu seul (menu sur l'accueil du compte).
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function CompteLayout({ children }: { children: ReactNode }) {
  if (!(await getSessionUser())) redirect('/connexion?retour=/compte');
  return (
    <div className="max-w-5xl mx-auto px-6 py-16 md:py-24 md:grid md:grid-cols-[180px_minmax(0,28rem)] md:justify-center md:gap-20">
      <aside className="hidden md:block md:pt-20">
        <AccountNav />
      </aside>
      <div>{children}</div>
    </div>
  );
}
