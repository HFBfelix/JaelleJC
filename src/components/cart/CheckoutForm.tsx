'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import ProfileForm from '@/components/account/ProfileForm';
import PhoneFR, { toE164 } from '@/components/forms/PhoneFR';
import type { Profile } from '@/server/account/greeting';
import { startCheckoutAction, type CheckoutActionResult } from '@/server/checkout/actions';
import { GIFT_MESSAGE_MAX, METROPOLE_ONLY, isMetropolitanZip } from '@/server/checkout/logic';
import { nationalPart } from '@/server/checkout/phone';
import { useSignedIn } from '@/components/auth/SessionProvider';
import { PayButton } from './CartLines';
import { useCart } from './CartProvider';

// Microtextes : EDITORIAL.md §5.
const MESSAGES: Partial<Record<CheckoutActionResult['status'], string>> = {
  indisponible: 'Le paiement est momentanément indisponible. Réessayez dans un instant.',
  invalide: 'Vérifiez l’adresse de livraison (code postal de France métropolitaine, téléphone français) et le mot pour la naissance.',
  erreur: 'Le paiement est momentanément indisponible. Réessayez dans un instant.',
  adresse: 'Adresse introuvable : choisissez-la dans la liste proposée (numéro et nom de rue).',
  profil: 'Complétez vos coordonnées avant le paiement.',
  metropole: METROPOLE_ONLY,
};

// Suggestion de la Base Adresse Nationale (adresse au numéro près).
type Suggestion = { name: string; postcode: string; city: string };

export type SavedAddress = { id: string; label: string; name: string; line1: string; line2: string; zipCode: string; city: string; phone: string };
type Place = { line1: string; line2: string; zipCode: string; city: string };
type Recipient = { prenom: string; nom: string; phone: string };
const EMPTY_PLACE: Place = { line1: '', line2: '', zipCode: '', city: '' };
const EMPTY_RECIPIENT: Recipient = { prenom: '', nom: '', phone: '' };
const placeOf = (a: SavedAddress): Place => ({ line1: a.line1, line2: a.line2, zipCode: a.zipCode, city: a.city });
// Adresse enregistrée « Lou Martin » : prénom = premier mot, nom = le reste (destinataire d'un cadeau).
const recipientOf = (a: SavedAddress): Recipient => {
  const [prenom = '', ...rest] = a.name.trim().split(/\s+/);
  return { prenom, nom: rest.join(' '), phone: a.phone ? nationalPart(a.phone) : '' };
};

const field = 'w-full bg-transparent border-b-[0.5px] border-neutral-300 focus:border-black py-2 outline-none text-[14px]';
const labelText = 'text-[11px] uppercase tracking-[0.12em] text-neutral-500 block mb-1';
const payClass = 'w-full bg-black text-white py-6 flex items-center justify-center gap-4 hover:bg-neutral-800 transition-colors disabled:bg-neutral-200 disabled:cursor-not-allowed';

// Page panier (décisions de Jaelle, 2026-11-04) :
// 1. coordonnées de la personne qui achète (civilité, prénom, nom, téléphone) — sans elles, pas de paiement ;
// 2. livraison en France métropolitaine, « à moi-même » (nom et téléphone du profil) ou « à une autre personne »
//    (cadeau : prénom, nom et téléphone du destinataire) ; avec une adresse enregistrée, un simple résumé ;
// 3. emballage cadeau, puis « Confirmer et payer ». Le serveur relit tout et ouvre la page Stripe préremplie.
export default function CheckoutForm({ addresses, addressApi, profile, profileComplete, email }: {
  addresses: SavedAddress[]; addressApi: string; profile: Profile; profileComplete: boolean; email: string | null;
}) {
  const signedIn = useSignedIn();
  const router = useRouter();
  const buyerName = [profile.prenom, profile.nom].filter(Boolean).join(' ');
  const [forOther, setForOther] = useState(false);
  const [chosen, setChosen] = useState(addresses[0]?.id ?? '');
  const [editing, setEditing] = useState(!addresses.length);
  const [place, setPlace] = useState<Place>(addresses[0] ? placeOf(addresses[0]) : EMPTY_PLACE);
  const [recipient, setRecipient] = useState<Recipient>(EMPTY_RECIPIENT);
  const [save, setSave] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { announceStock } = useCart();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const typed = useRef(false); // suggestions seulement pendant la saisie de la rue (pas après un choix)

  // Code postal à 5 chiffres + au moins 3 caractères de rue : adresses réelles de ce code postal (pause de 250 ms).
  useEffect(() => {
    const q = place.line1.trim();
    if (!typed.current || !isMetropolitanZip(place.zipCode) || q.length < 3) { setSuggestions([]); return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q, postcode: place.zipCode, type: 'housenumber', autocomplete: '1', limit: '5' });
        const res = await fetch(`${addressApi}/geocodage/search?${params}`, { signal: controller.signal });
        const body = (await res.json()) as { features?: { properties?: Record<string, unknown> }[] };
        setSuggestions((body.features ?? []).flatMap(({ properties: p = {} }) =>
          typeof p.name === 'string' && typeof p.postcode === 'string' && typeof p.city === 'string'
            ? [{ name: p.name, postcode: p.postcode, city: p.city }] : []));
      } catch { /* service injoignable : saisie libre, le serveur tranche au clic « Payer » */ }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [place.line1, place.zipCode, addressApi]);

  if (!signedIn) return <PayButton />;

  // Coordonnées incomplètes (nouveau compte, ou compte d'avant le 2026-11-04) : d'abord le profil, paiement inactif.
  if (!profileComplete) {
    return (
      <>
        <ProfileForm profile={profile} email={email} variant="paiement" />
        <button type="button" disabled className={payClass}>
          <span className="text-[11px] uppercase tracking-[0.12em]">Confirmer et payer</span>
        </button>
        <p className="text-[13px] text-neutral-500 mt-4">Complétez vos coordonnées pour continuer.</p>
      </>
    );
  }

  const setPlaceField = (patch: Partial<Place>) => { setPlace((p) => ({ ...p, ...patch })); setChosen(''); };
  const pickSuggestion = (s: Suggestion) => {
    typed.current = false;
    setPlaceField({ line1: s.name, zipCode: s.postcode, city: s.city });
    setSuggestions([]);
  };
  const choose = (id: string) => {
    setChosen(id);
    const a = addresses.find((x) => x.id === id);
    setPlace(a ? placeOf(a) : EMPTY_PLACE);
    if (a && forOther) setRecipient(recipientOf(a));
    if (!a) setEditing(true);
  };
  const outOfZone = /^[0-9]{5}$/.test(place.zipCode) && !isMetropolitanZip(place.zipCode);
  const summary = !editing && !!chosen && !forOther;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (outOfZone) { setNotice(METROPOLE_ONLY); return; }
    setPending(true);
    setNotice(null);
    try {
      const result = await startCheckoutAction({
        gift: { wrap, message: wrap ? message : '' },
        // Pour soi : le serveur remplace nom et téléphone par ceux du profil.
        shipping: forOther
          ? { ...place, name: `${recipient.prenom.trim()} ${recipient.nom.trim()}`.trim(), phone: toE164(recipient.phone) }
          : { ...place, name: buyerName, phone: profile.telephone },
        saveAddress: save && !chosen,
        forOther,
      });
      if (result.status === 'ok') {
        window.location.assign(result.url); // page de paiement hébergée par Stripe
        return;
      }
      if (result.status === 'connexion') { router.push('/connexion?retour=/panier'); return; }
      if (result.status === 'profil') { router.refresh(); }
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
        <legend className="text-[11px] uppercase tracking-[0.12em] mb-2">Livraison</legend>
        <p className="text-[13px] border-l border-black pl-3 mb-6">{METROPOLE_ONLY}</p>

        <div role="radiogroup" aria-label="À qui livrer ?" className="space-y-2 mb-6">
          <label className="flex items-center gap-3 cursor-pointer text-[14px]">
            <input type="radio" name="destinataire" checked={!forOther} onChange={() => setForOther(false)} className="w-4 h-4 accent-black" />
            À moi-même ({buyerName})
          </label>
          <label className="flex items-center gap-3 cursor-pointer text-[14px]">
            <input type="radio" name="destinataire" checked={forOther}
              onChange={() => { setForOther(true); setEditing(true); const a = addresses.find((x) => x.id === chosen); setRecipient(a ? recipientOf(a) : EMPTY_RECIPIENT); }}
              className="w-4 h-4 accent-black" />
            Cadeau livré à une autre personne
          </label>
        </div>

        {addresses.length > 0 && (
          <label className="block mb-4">
            <span className={labelText}>Mes adresses</span>
            <select value={chosen} onChange={(e) => choose(e.target.value)} className="w-full bg-white border-[0.5px] border-neutral-300 p-2 text-[14px]">
              {addresses.map((a) => <option key={a.id} value={a.id}>{a.label ? `${a.label} — ` : ''}{a.name}, {a.city}</option>)}
              <option value="">Nouvelle adresse</option>
            </select>
          </label>
        )}

        {summary ? (
          <div aria-label="Adresse de livraison" className="bg-neutral-50 p-4 text-[14px] leading-relaxed mb-4">
            <p>{buyerName}</p>
            <p>{place.line1}{place.line2 ? `, ${place.line2}` : ''}</p>
            <p>{place.zipCode} {place.city}</p>
            <p className="text-neutral-500"><span aria-hidden>🇫🇷</span> +33 {nationalPart(profile.telephone)}</p>
            <button type="button" onClick={() => setEditing(true)} className="mt-3 text-[11px] uppercase tracking-[0.12em] text-neutral-500 hover:text-black border-b-[0.5px] border-neutral-300 pb-0.5">
              Modifier l’adresse
            </button>
          </div>
        ) : (
          <>
            {forOther ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <label className="block mb-4"><span className={labelText}>Prénom du destinataire</span>
                    <input required maxLength={50} autoComplete="shipping given-name" value={recipient.prenom}
                      onChange={(e) => { setRecipient((r) => ({ ...r, prenom: e.target.value })); setChosen(''); }} className={field} /></label>
                  <label className="block mb-4"><span className={labelText}>Nom du destinataire</span>
                    <input required maxLength={50} autoComplete="shipping family-name" value={recipient.nom}
                      onChange={(e) => { setRecipient((r) => ({ ...r, nom: e.target.value })); setChosen(''); }} className={field} /></label>
                </div>
                <PhoneFR label="Téléphone du destinataire" value={recipient.phone} autoComplete="shipping tel"
                  onChange={(phone) => { setRecipient((r) => ({ ...r, phone })); setChosen(''); }} hint="Pour le transporteur, en cas de besoin." />
              </>
            ) : (
              <p className="text-[14px] mb-4">Au nom de {buyerName}, <span aria-hidden>🇫🇷</span> +33 {nationalPart(profile.telephone)}</p>
            )}
            <div className="grid grid-cols-[110px_1fr] gap-4">
              <label className="block mb-4"><span className={labelText}>Code postal</span>
                <input required inputMode="numeric" pattern="[0-9]{5}" maxLength={5} autoComplete="shipping postal-code" value={place.zipCode}
                  aria-invalid={outOfZone || undefined} onChange={(e) => setPlaceField({ zipCode: e.target.value })} className={field} /></label>
              <label className="block mb-4"><span className={labelText}>Ville</span>
                <input required maxLength={100} autoComplete="shipping address-level2" value={place.city} onChange={(e) => setPlaceField({ city: e.target.value })} className={field} /></label>
            </div>
            {outOfZone && <p role="alert" className="text-[13px] -mt-2 mb-4">{METROPOLE_ONLY}</p>}
            <div className="mb-4">
              <label className="block"><span className={labelText}>Adresse</span>
                <input required maxLength={200} autoComplete="shipping address-line1" value={place.line1} aria-describedby="adresse-aide"
                  onChange={(e) => { typed.current = true; setPlaceField({ line1: e.target.value }); }} className={field} /></label>
              {suggestions.length > 0 && (
                <ul aria-label="Adresses proposées" className="border-[0.5px] border-neutral-300 border-t-0 bg-white">
                  {suggestions.map((s) => (
                    <li key={`${s.name}|${s.postcode}`}>
                      <button type="button" onClick={() => pickSuggestion(s)} className="w-full text-left px-3 py-2 text-[14px] hover:bg-neutral-50">
                        {s.name}, {s.postcode} {s.city}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p id="adresse-aide" className="text-[13px] text-neutral-500 mt-1">Code postal d’abord, puis numéro et rue : choisissez votre adresse dans la liste.</p>
            </div>
            <label className="block mb-4"><span className={labelText}>Complément (optionnel)</span>
              <input maxLength={200} autoComplete="shipping address-line2" value={place.line2} onChange={(e) => setPlaceField({ line2: e.target.value })} className={field} /></label>
            {!chosen && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} className="w-4 h-4 accent-black" />
                <span className="text-[14px]">Enregistrer cette adresse dans mon compte</span>
              </label>
            )}
          </>
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
      <button type="submit" disabled={pending || outOfZone} className={payClass}>
        <span className="text-[11px] uppercase tracking-[0.12em]">Confirmer et payer</span>
      </button>
      {notice && <p role="alert" className="text-[14px] mt-6">{notice}</p>}
      <p className="text-[11px] uppercase tracking-[0.12em] text-neutral-400 mt-6 text-center">Paiement sécurisé par Stripe</p>
    </form>
  );
}
