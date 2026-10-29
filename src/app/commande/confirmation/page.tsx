import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AuthPage, Notice } from '@/components/auth/ui';
import AutoRefresh from '@/components/cart/AutoRefresh';
import { formatEuros } from '@/server/catalog/mapping';
import { getSessionUser } from '@/server/auth/session';
import { confirmationFor } from '@/server/orders/repository';

// Retour de Stripe après paiement. La page LIT la commande créée par le webhook ; elle ne crée rien.
export const metadata: Metadata = { title: 'Votre commande | Jaelle & JC', robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ session_id?: string }> };

export default async function ConfirmationPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) redirect('/connexion?retour=/compte');
  const result = await confirmationFor((await searchParams).session_id, user.uid);
  if (result.state === 'introuvable') notFound();

  if (result.state === 'en-cours') {
    return (
      <AuthPage title="Merci.">
        <Notice>Nous confirmons votre commande… Cette page se met à jour toute seule.</Notice>
        <AutoRefresh seconds={3} />
      </AuthPage>
    );
  }

  const { order } = result;
  if (order.status === 'refunded') {
    const stock = order.refund?.reason !== 'montant';
    return (
      <AuthPage title={stock ? 'Votre pièce a trouvé preneur.' : 'Votre commande n’a pas pu aboutir.'}>
        <Notice>
          {stock ? 'Pendant votre paiement, la dernière pièce disponible a été commandée.' : 'Un problème est survenu pendant votre paiement.'}
          {' '}Nous sommes sincèrement désolées : vos {formatEuros(order.amounts.totalCents)} € vous sont intégralement remboursés.
        </Notice>
        <p className="text-[11px] uppercase tracking-[0.12em] text-neutral-500">Référence : {order.reference}</p>
      </AuthPage>
    );
  }

  return (
    <AuthPage title="Merci. Votre pièce est en préparation.">
      <p className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 mb-10">Référence : {order.reference}</p>
      <ul className="border-t-[0.5px] border-black mb-6">
        {order.items.map((i) => (
          <li key={`${i.productId}/${i.variantId}`} className="flex justify-between gap-4 py-3 border-b-[0.5px] border-neutral-100 text-[14px]">
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
      <Link href="/collection" className="text-[11px] uppercase tracking-[0.12em] border-b-[0.5px] border-black pb-1">
        Découvrir les cadeaux de naissance
      </Link>
    </AuthPage>
  );
}
