'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import type { CartLineView, CartView } from '@/server/cart/types';
import { useSignedIn } from '@/components/auth/SessionProvider';
import { useCart } from './CartProvider';

// Lignes et totaux du panier, communs au tiroir et à la page /panier.
// Style repris de legacy/src/components/cart/CartDrawer.tsx, typographie « Atelier » (CLAUDE.md §2).
export const formatPrice = (cents: number) =>
  cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2).replace('.', ',');

export const CartLines = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { cart, update, pending } = useCart();
  return (
    <ul className="space-y-10">
      {cart.lines.map((line) => <CartLine key={`${line.productId}/${line.variantId}`} line={line} pending={pending} onChange={update} onNavigate={onNavigate} />)}
    </ul>
  );
};

const CartLine = ({ line, pending, onChange, onNavigate }: {
  line: CartLineView;
  pending: boolean;
  onChange: (line: CartLineView, quantity: number) => Promise<void>;
  onNavigate?: () => void;
}) => (
  <li className="flex gap-6 group">
    <Link href={`/produits/${line.slug}`} onClick={onNavigate} className="relative w-24 h-32 bg-neutral-50 overflow-hidden flex-shrink-0">
      {line.image && (
        <Image src={line.image.url} alt={line.image.alt || line.name} fill sizes="96px"
          className="object-cover group-hover:scale-105 transition-transform duration-700" />
      )}
    </Link>
    <div className="flex-grow flex flex-col justify-between py-1">
      <div>
        <div className="flex justify-between items-start gap-4">
          <span className="text-[11px] uppercase tracking-[0.12em] text-neutral-400 mb-1">{line.categoryName}</span>
          <p className="text-sm">{formatPrice(line.lineTotalCents)} €</p>
        </div>
        <Link href={`/produits/${line.slug}`} onClick={onNavigate} className="font-serif text-lg block">{line.name}</Link>
        {line.variantLabel && <p className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 mt-1">{line.variantLabel}</p>}
        <div className="flex items-center border-[0.5px] border-neutral-200 w-fit mt-4">
          <button onClick={() => onChange(line, line.quantity - 1)} disabled={pending}
            aria-label={`Retirer une pièce : ${line.name}`} className="p-2 hover:bg-neutral-50 disabled:opacity-40">
            <Minus size={10} strokeWidth={1} />
          </button>
          <span className="text-[11px] w-6 text-center" aria-label={`Quantité : ${line.quantity}`}>{line.quantity}</span>
          <button onClick={() => onChange(line, line.quantity + 1)} disabled={pending || !line.canIncrease}
            aria-label={`Ajouter une pièce : ${line.name}`} className="p-2 hover:bg-neutral-50 disabled:opacity-40">
            <Plus size={10} strokeWidth={1} />
          </button>
        </div>
      </div>
      <button onClick={() => onChange(line, 0)} disabled={pending}
        className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-neutral-400 hover:text-black transition-colors mt-4 w-fit">
        <Trash2 size={10} /> Retirer
      </button>
    </div>
  </li>
);

export const DeliveryProgress = ({ cart }: { cart: CartView }) => {
  const { delivery, subtotalCents } = cart;
  if (!cart.lines.length || delivery.freeThresholdCents <= 0) return null;
  const free = delivery.kind === 'free';
  const progress = Math.min(100, (subtotalCents / delivery.freeThresholdCents) * 100);
  return (
    <div className="px-8 py-6 bg-neutral-50/50 border-b-[0.5px] border-neutral-100">
      <p className="text-[11px] uppercase tracking-[0.12em] mb-3">
        {free ? 'Livraison offerte' : `Plus que ${formatPrice(delivery.remainingCents)} € pour la livraison offerte`}
      </p>
      <div className="h-[2px] bg-neutral-200 w-full overflow-hidden">
        <div className="h-full bg-black transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

export const CartTotals = ({ cart }: { cart: CartView }) => (
  <dl className="space-y-2 mb-8">
    <div className="flex justify-between items-end">
      <dt className="text-[11px] uppercase tracking-[0.12em] text-neutral-400">Sous-total</dt>
      <dd className="text-lg">{formatPrice(cart.subtotalCents)} €</dd>
    </div>
    <div className="flex justify-between items-end">
      <dt className="text-[11px] uppercase tracking-[0.12em] text-neutral-400">Livraison</dt>
      <dd className="text-[11px] uppercase tracking-[0.12em]">
        {cart.delivery.kind === 'free' ? 'Offerte' : cart.delivery.kind === 'flat' ? `${formatPrice(cart.delivery.cents)} €` : "Calculée à l'étape suivante"}
      </dd>
    </div>
    <div className="flex justify-between items-end pt-4 border-t-[0.5px] border-neutral-100">
      <dt className="text-[11px] uppercase tracking-[0.12em] font-semibold">Total estimé</dt>
      <dd className="text-2xl">{formatPrice(cart.totalCents)} €</dd>
    </div>
  </dl>
);

// Sans compte : « e-mail d'abord » (page de connexion, retour au panier, panier conservé).
// Connectée : paiement branché à l'étape 5 (session Stripe créée par le serveur), bouton inactif d'ici là.
export const PayButton = ({ onNavigate }: { onNavigate?: () => void }) => {
  const signedIn = useSignedIn();
  const label = <span className="text-[11px] uppercase tracking-[0.12em]">Confirmer et payer</span>;
  if (!signedIn) {
    return (
      <Link href="/connexion?retour=/panier" onClick={onNavigate}
        className="w-full bg-black text-white py-6 flex items-center justify-center gap-4 hover:bg-neutral-800 transition-colors">
        {label}
      </Link>
    );
  }
  return (
    <>
      <button disabled aria-describedby="paiement-bientot"
        className="w-full bg-black text-white py-6 flex items-center justify-center gap-4 disabled:bg-neutral-200 disabled:cursor-not-allowed">
        {label}
      </button>
      <p id="paiement-bientot" className="text-[11px] uppercase tracking-[0.12em] text-neutral-400 mt-6 text-center">
        Paiement en ligne bientôt disponible
      </p>
    </>
  );
};

export const EmptyCart = ({ onNavigate }: { onNavigate?: () => void }) => (
  <div className="h-full flex flex-col items-center justify-center text-center py-16">
    <p className="text-neutral-500 mb-8">Votre sélection est vide.</p>
    <Link href="/collection" onClick={onNavigate} className="text-[11px] uppercase tracking-[0.12em] border-b-[0.5px] border-black pb-1">
      Découvrir les cadeaux de naissance
    </Link>
  </div>
);
