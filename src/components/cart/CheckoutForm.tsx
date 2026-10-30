'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { startCheckoutAction, type CheckoutActionResult } from '@/server/checkout/actions';
import { GIFT_MESSAGE_MAX } from '@/server/checkout/logic';
import { useSignedIn } from '@/components/auth/SessionProvider';
import { PayButton } from './CartLines';
import { useCart } from './CartProvider';

// Microtextes : EDITORIAL.md §5.
const MESSAGES: Partial<Record<CheckoutActionResult['status'], string>> = {
  indisponible: 'Le paiement est momentanément indisponible. Réessayez dans un instant.',
  invalide: `Le mot pour la naissance ne doit pas dépasser ${GIFT_MESSAGE_MAX} caractères.`,
  adresse: 'Cette adresse n’est plus disponible. Choisissez-en une autre.',
  erreur: 'Le paiement est momentanément indisponible. Réessayez dans un instant.',
};

export type SavedAddress = { id: string; summary: string };
const OTHER = '';

// Page panier : adresse, option cadeau, puis « Confirmer et payer ». Le serveur relit tout (prix, stock,
// livraison, adresse) et renvoie l'adresse de la page de paiement Stripe ; le navigateur n'envoie que l'option
// cadeau et l'identifiant de l'adresse choisie.
export default function CheckoutForm({ addresses }: { addresses: SavedAddress[] }) {
  const signedIn = useSignedIn();
  const router = useRouter();
  const [addressId, setAddressId] = useState(addresses[0]?.id ?? OTHER);
  const [wrap, setWrap] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { announceStock } = useCart();

  if (!signedIn) return <PayButton />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setNotice(null);
    try {
      const result = await startCheckoutAction({
        gift: { wrap, message: wrap ? message : '' },
        ...(addressId !== OTHER ? { addressId } : {}),
      });
      if (result.status === 'ok') {
        window.location.assign(result.url); // page de paiement hébergée par Stripe
        return;
      }
      if (result.status === 'connexion') { router.push('/connexion?retour=/panier'); return; }
      if (result.status === 'stock' || result.status === 'vide') {
        // Panier corrigé par le serveur : message porté par le panier (ce formulaire peut disparaître s'il est vide).
        if (result.status === 'stock') announceStock();
        router.refresh();
      } else {
        setNotice(MESSAGES[result.status] ?? MESSAGES.erreur!);
      }
    } catch {
      setNotice(MESSAGES.erreur!);
    }
    setPending(false);
  };

  return (
    <form onSubmit={onSubmit}>
      {addresses.length > 0 && (
        <fieldset className="mb-8">
          <legend className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 mb-3">Livrer à</legend>
          {[...addresses, { id: OTHER, summary: 'Une autre adresse (saisie au paiement)' }].map((a) => (
            <label key={a.id || 'autre'} className="flex items-start gap-3 mb-3 cursor-pointer">
              <input type="radio" name="adresse" value={a.id} checked={addressId === a.id} onChange={() => setAddressId(a.id)}
                className="w-4 h-4 mt-0.5 accent-black" />
              <span className="text-[14px] leading-snug">{a.summary}</span>
            </label>
          ))}
        </fieldset>
      )}
      <label className="flex items-center gap-3 mb-4 cursor-pointer">
        <input type="checkbox" checked={wrap} onChange={(e) => setWrap(e.target.checked)}
          className="w-4 h-4 accent-black" />
        <span className="text-[11px] uppercase tracking-[0.12em]">Emballage cadeau</span>
      </label>
      {wrap && (
        <label className="block mb-8">
          <span className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 block mb-2">Un mot pour la naissance (optionnel)</span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={GIFT_MESSAGE_MAX} rows={3}
            className="w-full border-[0.5px] border-neutral-200 focus:border-black outline-none p-3 text-[14px] resize-none" />
          <span className="text-[11px] text-neutral-400 block text-right">{message.length} / {GIFT_MESSAGE_MAX}</span>
        </label>
      )}
      <button type="submit" disabled={pending}
        className="w-full bg-black text-white py-6 flex items-center justify-center gap-4 hover:bg-neutral-800 transition-colors disabled:bg-neutral-200 disabled:cursor-not-allowed">
        <span className="text-[11px] uppercase tracking-[0.12em]">Confirmer et payer</span>
      </button>
      {notice && <p role="alert" className="text-[14px] mt-6">{notice}</p>}
      <p className="text-[11px] uppercase tracking-[0.12em] text-neutral-400 mt-6 text-center">Paiement sécurisé par Stripe</p>
    </form>
  );
}
