import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { formatDate } from '@/components/account/OrdersList';
import { AuthPage } from '@/components/auth/ui';
import { formatEuros } from '@/server/catalog/mapping';
import { getSessionUser } from '@/server/auth/session';
import { orderOf } from '@/server/orders/history';

// Détail d'une commande de la cliente connectée. Commande d'une autre cliente : page introuvable.
export const metadata: Metadata = { title: 'Ma commande | Jaelle & JC', robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }> };

const label = 'text-[11px] uppercase tracking-[0.12em] text-neutral-500';

export default async function CommandePage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect('/connexion?retour=/compte');
  const order = await orderOf(user.uid, (await params).id);
  if (!order) notFound();

  return (
    <AuthPage title={`Commande ${order.reference}`}>
      <p className={`${label} mb-10`}>{formatDate(order.createdAt)} · {order.statusLabel}</p>

      <ul className="border-t-[0.5px] border-black mb-6">
        {order.items.map((i) => (
          <li key={i.key} className="flex justify-between gap-4 py-3 border-b-[0.5px] border-neutral-100 text-[14px]">
            <span>{i.quantity} × {i.name}{i.variantLabel ? ` — ${i.variantLabel}` : ''}</span>
            <span>{formatEuros(i.unitPriceCents * i.quantity)} €</span>
          </li>
        ))}
      </ul>
      <dl className="space-y-2 mb-10 text-[14px]">
        <div className="flex justify-between"><dt className="text-[11px] uppercase tracking-[0.12em] text-neutral-400">Livraison</dt>
          <dd>{order.amounts.deliveryCents ? `${formatEuros(order.amounts.deliveryCents)} €` : 'Offerte'}</dd></div>
        <div className="flex justify-between"><dt className="text-[11px] uppercase tracking-[0.12em] font-semibold">Total</dt>
          <dd className="text-lg">{formatEuros(order.amounts.totalCents)} €</dd></div>
      </dl>

      {order.gift.wrap && (
        <p className="text-[14px] border-l border-black pl-5 mb-10">
          Emballage cadeau{order.gift.message ? ` — « ${order.gift.message} »` : ''}
        </p>
      )}

      <h2 className={`${label} mb-3`}>Livraison</h2>
      <address className="not-italic text-[14px] mb-10">
        {order.shipping.name && <>{order.shipping.name}<br /></>}
        {order.shipping.line1}{order.shipping.line2 ? `, ${order.shipping.line2}` : ''}<br />
        {order.shipping.zipCode} {order.shipping.city}
      </address>

      {order.tracking && (
        <>
          <h2 className={`${label} mb-3`}>Suivi du colis</h2>
          <p className="text-[14px] mb-10">
            {order.tracking.carrier && `${order.tracking.carrier} · `}
            {order.tracking.url ? (
              <a href={order.tracking.url} target="_blank" rel="noopener noreferrer" className="border-b-[0.5px] border-black">{order.tracking.number}</a>
            ) : order.tracking.number}
          </p>
        </>
      )}

      <Link href="/compte" className="text-[11px] uppercase tracking-[0.12em] border-b-[0.5px] border-black pb-1">
        Retour à mon compte
      </Link>
    </AuthPage>
  );
}
