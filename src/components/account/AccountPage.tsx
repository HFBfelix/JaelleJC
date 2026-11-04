import Link from 'next/link';
import type { ReactNode } from 'react';

// Page d'un thème du compte : sur mobile, retour vers l'accueil du compte au-dessus du titre (le menu est à gauche
// sur ordinateur). Mêmes titres que les pages de connexion.
export default function AccountPage({ title, back = { href: '/compte', label: 'Mon compte' }, children }: {
  title: string; back?: { href: string; label: string } | null; children: ReactNode;
}) {
  return (
    <>
      {back && (
        <Link href={back.href} className="md:hidden inline-block mb-8 text-[11px] uppercase tracking-[0.12em] text-neutral-500 hover:text-black">
          ← {back.label}
        </Link>
      )}
      <h1 className="font-serif text-3xl md:text-4xl mb-12">{title}</h1>
      {children}
    </>
  );
}
