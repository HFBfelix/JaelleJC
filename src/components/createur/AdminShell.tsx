'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { signOutAction } from '@/server/auth/actions';

const TABS = [
  { href: '/createur', label: 'À faire' },
  { href: '/createur/produits', label: 'Produits' },
  { href: '/createur/commandes', label: 'Commandes' },
  { href: '/createur/stocks', label: 'Stocks' },
  { href: '/createur/categories', label: 'Catégories' },
  { href: '/createur/reglages', label: 'Réglages' },
  { href: '/createur/messages', label: 'Messages' },
];

// Cadre de l'espace créatrice (hors du gabarit du site, comme l'ancien Dashboard) : en-tête « Atelier » et onglets.
export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const active = (href: string) => (href === '/createur' ? pathname === href : pathname.startsWith(href));
  return (
    <div className="min-h-screen bg-[#F5F2EE] text-black font-sans">
      <header className="sticky top-0 z-40 bg-white border-b-[0.5px] border-neutral-300">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/createur" className="font-serif text-2xl">Atelier</Link>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 hover:text-black">Voir le site</Link>
            <form action={signOutAction}>
              <button type="submit" aria-label="Se déconnecter" className="opacity-60 hover:opacity-100"><LogOut size={18} strokeWidth={1.5} /></button>
            </form>
          </div>
        </div>
        <nav aria-label="Espace créatrice" className="max-w-6xl mx-auto px-6 flex gap-6 overflow-x-auto">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href} aria-current={active(t.href) ? 'page' : undefined}
              className={`py-3 whitespace-nowrap text-[11px] uppercase tracking-[0.12em] border-b ${active(t.href) ? 'border-black' : 'border-transparent text-neutral-500 hover:text-black'}`}>
              {t.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}
