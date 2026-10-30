import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import OrderActions from '@/components/createur/OrderActions';
import { Card, label } from '@/components/createur/ui';
import { formatDate } from '@/components/account/OrdersList';
import { requireAdmin } from '@/server/auth/session';
import { formatEuros } from '@/server/catalog/mapping';
import { orderAdmin } from '@/server/createur/orders';

type Props = { params: Promise<{ id: string }> };

export default async function CommandeAdminPage({ params }: Props) {
  if (!(await requireAdmin())) redirect('/createur/connexion');
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(id)) notFound();
  const order = await orderAdmin(id);
  if (!order) notFound();

  return (
    <>
      <Link href="/createur/commandes" className={`${label} hover:text-black`}>← Commandes</Link>
      <h1 className="font-serif text-3xl mt-4 mb-2">Commande {order.reference}</h1>
      <p className={`${label} mb-8`}>{formatDate(order.createdAt)} · {order.statusLabel}{order.legacy ? ' · ancien site' : ''}</p>

      <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start">
        <Card>
          <h2 className={`${label} mb-4`}>Pièces</h2>
          <ul className="border-t-[0.5px] border-black mb-6">
            {order.items.map((i) => (
              <li key={i.key} className="flex justify-between gap-4 py-3 border-b-[0.5px] border-neutral-200 text-[14px]">
                <span>{i.quantity} × {i.name}{i.variantLabel ? ` — ${i.variantLabel}` : ''}</span>
                <span>{formatEuros(i.unitPriceCents * i.quantity)} €</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-1 text-[14px] mb-6">
            <div className="flex justify-between"><dt>Livraison</dt><dd>{order.amounts.deliveryCents ? `${formatEuros(order.amounts.deliveryCents)} €` : 'Offerte'}</dd></div>
            <div className="flex justify-between font-semibold"><dt>Total payé</dt><dd>{formatEuros(order.amounts.totalCents)} €</dd></div>
          </dl>
          {order.gift.wrap && (
            <p className="text-[14px] border-l border-black pl-4 mb-6">
              Emballage cadeau{order.gift.message ? ` — message à joindre : « ${order.gift.message} »` : ''}
            </p>
          )}
          <h2 className={`${label} mb-2`}>Livraison</h2>
          <address className="not-italic text-[14px] mb-6">
            {order.shipping.name}<br />
            {order.shipping.line1}{order.shipping.line2 ? `, ${order.shipping.line2}` : ''}<br />
            {order.shipping.zipCode} {order.shipping.city}
          </address>
          <h2 className={`${label} mb-2`}>Contact</h2>
          <p className="text-[14px]">{order.customerEmail}{order.customerPhone ? ` · ${order.customerPhone}` : ''}</p>
        </Card>

        <OrderActions orderId={order.id} status={order.status} tracking={order.tracking} />
      </div>
    </>
  );
}
