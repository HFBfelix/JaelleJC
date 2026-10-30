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
  invalide: 'Vérifiez l’adresse de livraison (code postal à 5 chiffres, téléphone français) et le mot pour la naissance.',
  erreur: 'Le paiement est momentanément indisponible. Réessayez dans un instant.',
};

export type SavedAddress = { id: string; label: string; name: string; line1: string; line2: string; zipCode: string; city: string; phone: string };
type Shipping = Omit<SavedAddress, 'id' | 'label'>;
const EMPTY: Shipping = { name: '', line1: '', line2: '', zipCode: '', city: '', phone: '' };
const pick = (a: SavedAddress): Shipping => ({ name: a.name, line1: a.line1, line2: a.line2, zipCode: a.zipCode, city: a.city, phone: a.phone });

const field = 'w-full bg-transparent border-b-[0.5px] border-neutral-300 focus:border-black py-2 outline-none text-[14px]';
const labelText = 'text-[11px] uppercase tracking-[0.12em] text-neutral-500 block mb-1';

// Page panier : livraison confirmée (adresse et téléphone, préremplis depuis le compte), option cadeau, puis
// « Confirmer et payer ». Le serveur relit tout (prix, stock, livraison) et ouvre la page Stripe préremplie.
export default function CheckoutForm({ addresses }: { addresses: SavedAddress[] }) {
  const signedIn = useSignedIn();
  const router = useRouter();
  const [chosen, setChosen] = useState(addresses[0]?.id ?? '');
  const [shipping, setShipping] = useState<Shipping>(addresses[0] ? pick(addresses[0]) : EMPTY);
  const [save, setSave] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { announceStock } = useCart();

  if (!signedIn) return <PayButton />;

  const choose = (id: string) => {
    setChosen(id);
    const a = addresses.find((x) => x.id === id);
    setShipping(a ? pick(a) : EMPTY);
  };
  const set = (patch: Partial<Shipping>) => { setShipping((s) => ({ ...s, ...patch })); setChosen(''); };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setNotice(null);
    try {
      const result = await startCheckoutAction({
        gift: { wrap, message: wrap ? message : '' },
        shipping,
        saveAddress: save && !chosen,
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
      <fieldset className="mb-8">
        <legend className="text-[11px] uppercase tracking-[0.12em] mb-4">Livraison</legend>
        {addresses.length > 0 && (
          <label className="block mb-4">
            <span className={labelText}>Mes adresses</span>
            <select value={chosen} onChange={(e) => choose(e.target.value)} className="w-full bg-white border-[0.5px] border-neutral-300 p-2 text-[14px]">
              {addresses.map((a) => <option key={a.id} value={a.id}>{a.label ? `${a.label} — ` : ''}{a.name}, {a.city}</option>)}
              <option value="">Nouvelle adresse</option>
            </select>
          </label>
        )}
        <label className="block mb-4"><span className={labelText}>Nom et prénom</span>
          <input required maxLength={100} autoComplete="shipping name" value={shipping.name} onChange={(e) => set({ name: e.target.value })} className={field} /></label>
        <label className="block mb-4"><span className={labelText}>Adresse</span>
          <input required maxLength={200} autoComplete="shipping address-line1" value={shipping.line1} onChange={(e) => set({ line1: e.target.value })} className={field} /></label>
        <label className="block mb-4"><span className={labelText}>Complément (optionnel)</span>
          <input maxLength={200} autoComplete="shipping address-line2" value={shipping.line2} onChange={(e) => set({ line2: e.target.value })} className={field} /></label>
        <div className="grid grid-cols-[110px_1fr] gap-4">
          <label className="block mb-4"><span className={labelText}>Code postal</span>
            <input required inputMode="numeric" pattern="[0-9]{5}" maxLength={5} autoComplete="shipping postal-code" value={shipping.zipCode} onChange={(e) => set({ zipCode: e.target.value })} className={field} /></label>
          <label className="block mb-4"><span className={labelText}>Ville</span>
            <input required maxLength={100} autoComplete="shipping address-level2" value={shipping.city} onChange={(e) => set({ city: e.target.value })} className={field} /></label>
        </div>
        <label className="block mb-2"><span className={labelText}>Téléphone</span>
          <input required type="tel" maxLength={30} autoComplete="shipping tel" value={shipping.phone} onChange={(e) => set({ phone: e.target.value })} className={field} /></label>
        <p className="text-[13px] text-neutral-500 mb-4">Pour le transporteur, en cas de besoin. Livraison en France uniquement.</p>
        {!chosen && (
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} className="w-4 h-4 accent-black" />
            <span className="text-[14px]">Enregistrer cette adresse dans mon compte</span>
          </label>
        )}
      </fieldset>
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
