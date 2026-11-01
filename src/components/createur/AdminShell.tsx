'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, LogOut } from 'lucide-react';
import { signOutAction } from '@/server/auth/actions';

const TABS = [
  { href: '/atelier', label: 'À faire' },
  { href: '/atelier/produits', label: 'Produits' },
  { href: '/atelier/commandes', label: 'Commandes' },
  { href: '/atelier/stocks', label: 'Stocks' },
  { href: '/atelier/categories', label: 'Catégories' },
  { href: '/atelier/reglages', label: 'Réglages' },
  { href: '/atelier/messages', label: 'Messages' },
];

// Cadre de l'Atelier (hors du gabarit du site, comme l'ancien Dashboard) : en-tête « Atelier » et onglets.
// Onglet « Commandes » : cloche rouge et nombre de commandes payées jamais ouvertes (décision de Jaelle, 2026-11-01).
export default function AdminShell({ children, newOrders }: { children: ReactNode; newOrders: number }) {
  const pathname = usePathname();
  const active = (href: string) => (href === '/atelier' ? pathname === href : pathname.startsWith(href));
  return (
    <div className="min-h-screen bg-[#F5F2EE] text-black font-sans">
      <header className="sticky top-0 z-40 bg-white border-b-[0.5px] border-neutral-300">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/atelier" className="font-serif text-2xl">Atelier</Link>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 hover:text-black">Voir le site</Link>
            <form action={signOutAction}>
              <button type="submit" aria-label="Se déconnecter" className="opacity-60 hover:opacity-100"><LogOut size={18} strokeWidth={1.5} /></button>
            </form>
          </div>
        </div>
        <nav aria-label="Atelier" className="max-w-6xl mx-auto px-6 flex gap-6 overflow-x-auto">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href} aria-current={active(t.href) ? 'page' : undefined}
              className={`py-3 whitespace-nowrap text-[11px] uppercase tracking-[0.12em] border-b inline-flex items-center gap-1.5 ${active(t.href) ? 'border-black' : 'border-transparent text-neutral-500 hover:text-black'}`}>
              {t.label}
              {t.href === '/atelier/commandes' && newOrders > 0 && (
                <span className="inline-flex items-center gap-1 text-red-700" aria-label={`${newOrders} nouvelle${newOrders > 1 ? 's' : ''} commande${newOrders > 1 ? 's' : ''}`}>
                  <Bell size={13} strokeWidth={2} fill="currentColor" aria-hidden />
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-700 text-white text-[11px] leading-[18px] text-center tracking-normal">{newOrders}</span>
                </span>
              )}
            </Link>
          ))}
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}
