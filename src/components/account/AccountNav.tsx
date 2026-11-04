'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOutAction } from '@/server/auth/actions';
import { ACCOUNT_SECTIONS } from './sections';

const item = 'block py-3 border-b-[0.5px] border-neutral-200 text-[11px] uppercase tracking-[0.12em] transition-colors';

// Menu du compte sur ordinateur, à gauche du contenu (sur mobile : liste de l'accueil et lien de retour).
export default function AccountNav() {
  const path = usePathname();
  const active = (href: string) => (href === '/compte' ? path === href : path === href || path.startsWith(`${href}/`));
  const link = (href: string, label: string) => (
    <li key={href}>
      <Link href={href} aria-current={active(href) ? 'page' : undefined}
        className={`${item} ${active(href) ? 'text-black' : 'text-neutral-500 hover:text-black'}`}>
        {label}
      </Link>
    </li>
  );
  return (
    <nav aria-label="Mon compte">
      <ul className="border-t-[0.5px] border-neutral-200">
        {link('/compte', 'Mon compte')}
        {ACCOUNT_SECTIONS.map((s) => link(s.href, s.label))}
      </ul>
      <form action={signOutAction} className="mt-8">
        <button type="submit" className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 hover:text-black border-b-[0.5px] border-neutral-300 pb-1">
          Se déconnecter
        </button>
      </form>
    </nav>
  );
}
