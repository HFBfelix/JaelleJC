'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatEuros } from '@/server/catalog/mapping';
import { label } from './ui';

type Row = { id: string; reference: string; status: string; statusLabel: string; createdAt: string | null; name: string; totalCents: number; items: number };

const FILTERS = [
  { value: 'paid', label: 'À préparer' },
  { value: 'preparing', label: 'En préparation' },
  { value: 'shipped', label: 'Expédiées' },
  { value: 'delivered', label: 'Livrées' },
  { value: 'tous', label: 'Toutes' },
] as const;

const date = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Paris' }).format(new Date(iso)) : '—';

export default function OrderList({ orders }: { orders: Row[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('paid');
  const shown = orders.filter((o) => filter === 'tous' || o.status === filter);
  const count = (s: string) => orders.filter((o) => o.status === s).length;

  return (
    <>
      <div className="flex flex-wrap gap-5 mb-6" role="group" aria-label="Filtrer par statut">
        {FILTERS.map((f) => (
          <button key={f.value} type="button" onClick={() => setFilter(f.value)} aria-pressed={filter === f.value}
            className={`text-[11px] uppercase tracking-[0.12em] pb-1 border-b ${filter === f.value ? 'border-black' : 'border-transparent text-neutral-500'}`}>
            {f.label}{f.value !== 'tous' && ` (${count(f.value)})`}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="text-[14px] text-neutral-500">Aucune commande.</p>
      ) : (
        <ul className="grid gap-3">
          {shown.map((o) => (
            <li key={o.id}>
              <Link href={`/createur/commandes/${o.id}`} className="bg-white border-[0.5px] border-neutral-300 hover:border-black p-4 flex flex-wrap items-center gap-4 transition-colors">
                <span className="flex-1 min-w-0">
                  <span className={`${label} block`}>Réf. {o.reference} · {date(o.createdAt)}</span>
                  <span className="block text-[14px]">{o.name || 'Cliente'} · {o.items} pièce{o.items > 1 ? 's' : ''}</span>
                </span>
                <span className="text-[14px]">{formatEuros(o.totalCents)} €</span>
                <span className="text-[11px] uppercase tracking-[0.12em] border-[0.5px] border-black px-2 py-0.5">{o.statusLabel}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
