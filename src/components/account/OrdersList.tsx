import Link from 'next/link';
import { formatEuros } from '@/server/catalog/mapping';
import type { OrderDetail } from '@/server/orders/view';

export const formatDate = (d: Date | null) =>
  d ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }).format(d) : '';

// Historique des commandes du compte : mêmes lignes fines que l'ancien espace client, sans italique.
export default function OrdersList({ orders }: { orders: OrderDetail[] }) {
  return (
    <section className="mb-16" aria-labelledby="mes-commandes">
      <h2 id="mes-commandes" className="text-[11px] uppercase tracking-[0.12em] mb-6">Mes commandes</h2>
      {orders.length === 0 ? (
        <p className="text-[14px] text-neutral-500 py-8 text-center border-[0.5px] border-dashed border-neutral-200">
          Aucune commande pour le moment.
        </p>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/compte/commandes/${o.id}`}
                className="block border-[0.5px] border-neutral-200 p-6 hover:border-black transition-colors duration-500">
                <span className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-[11px] uppercase tracking-[0.12em] text-neutral-500">Réf. {o.reference}</span>
                  <span className="text-[11px] uppercase tracking-[0.12em] border-[0.5px] border-black px-2 py-0.5">{o.statusLabel}</span>
                </span>
                <span className="block text-[14px]">
                  {o.items[0]?.name || 'Commande Jaelle & JC'}
                  {o.items.length > 1 && <span className="text-neutral-500"> (+{o.items.length - 1})</span>}
                </span>
                <span className="flex justify-between text-[14px] text-neutral-500 mt-1">
                  <span>{formatDate(o.createdAt)}</span>
                  <span className="text-black">{formatEuros(o.amounts.totalCents)} €</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
