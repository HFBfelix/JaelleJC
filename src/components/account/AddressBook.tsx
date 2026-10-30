'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { deleteAddressAction, saveAddressAction, type AddressResult } from '@/server/account/actions';
import type { AddressView } from '@/server/account/logic';
import { Field, Notice, PrimaryButton, TextButton } from '@/components/auth/ui';

const MESSAGES: Partial<Record<AddressResult, string>> = {
  plein: 'Vous avez déjà 10 adresses. Supprimez-en une pour en ajouter une nouvelle.',
  introuvable: 'Cette adresse n’existe plus. Rechargez la page.',
  invalide: 'Vérifiez l’adresse : nom, rue, code postal à 5 chiffres et ville sont nécessaires.',
  connexion: 'Votre session a expiré. Reconnectez-vous.',
  erreur: 'Une erreur est survenue. Réessayez dans un instant.',
};

type Draft = Omit<AddressView, 'id'>;
const EMPTY: Draft = { label: '', name: '', line1: '', line2: '', zipCode: '', city: '', phone: '' };

// Carnet d'adresses : enregistrées seulement ici, à la demande de la cliente (jamais après un paiement).
export default function AddressBook({ addresses }: { addresses: AddressView[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<{ id?: string; draft: Draft } | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async (call: () => Promise<AddressResult>) => {
    setPending(true);
    setNotice(null);
    try {
      const result = await call();
      if (result === 'ok') {
        setEditing(null);
        router.refresh();
      } else {
        setNotice(MESSAGES[result] ?? MESSAGES.erreur!);
      }
    } catch {
      setNotice(MESSAGES.erreur!);
    }
    setPending(false);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (editing) void run(() => saveAddressAction({ ...(editing.id ? { id: editing.id } : {}), address: editing.draft }));
  };

  const field = (key: keyof Draft) => ({
    name: key,
    value: editing?.draft[key] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setEditing((cur) => (cur ? { ...cur, draft: { ...cur.draft, [key]: e.target.value } } : cur)),
  });

  return (
    <section className="mb-16" aria-labelledby="mes-adresses">
      <h2 id="mes-adresses" className="text-[11px] uppercase tracking-[0.12em] mb-6">Mes adresses</h2>
      {addresses.length > 0 && (
        <ul className="border-t-[0.5px] border-neutral-200 mb-8">
          {addresses.map((a) => (
            <li key={a.id} className="py-5 border-b-[0.5px] border-neutral-200 text-[14px]">
              {a.label && <p className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 mb-1">{a.label}</p>}
              <p>{a.name}</p>
              <p>{a.line1}{a.line2 ? `, ${a.line2}` : ''}</p>
              <p>{a.zipCode} {a.city}</p>
              <div className="flex gap-6 mt-3">
                <TextButton disabled={pending} onClick={() => { setNotice(null); const { id, ...draft } = a; setEditing({ id, draft }); }}
                  aria-label={`Modifier l’adresse ${a.label || a.name}`}>Modifier</TextButton>
                <TextButton disabled={pending} onClick={() => run(() => deleteAddressAction({ id: a.id }))}
                  aria-label={`Supprimer l’adresse ${a.label || a.name}`}>Supprimer</TextButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <form onSubmit={onSubmit} aria-label={editing.id ? 'Modifier l’adresse' : 'Nouvelle adresse'}>
          <Field label="Nom de l’adresse (optionnel)" hint="Par exemple : Maison, Grands-parents." maxLength={40} {...field('label')} />
          <Field label="Nom et prénom" required maxLength={100} autoComplete="name" {...field('name')} />
          <Field label="Adresse" required maxLength={200} autoComplete="address-line1" {...field('line1')} />
          <Field label="Complément (optionnel)" maxLength={200} autoComplete="address-line2" {...field('line2')} />
          <Field label="Code postal" required inputMode="numeric" pattern="[0-9]{5}" maxLength={5} autoComplete="postal-code" {...field('zipCode')} />
          <Field label="Ville" required maxLength={100} autoComplete="address-level2" {...field('city')} />
          <Field label="Téléphone (optionnel)" type="tel" maxLength={30} autoComplete="tel" {...field('phone')} />
          <p className="text-[14px] text-neutral-500 mb-8">Livraison en France uniquement.</p>
          <PrimaryButton type="submit" disabled={pending}>Enregistrer l’adresse</PrimaryButton>
          <div className="mt-6 text-center">
            <TextButton disabled={pending} onClick={() => { setEditing(null); setNotice(null); }}>Annuler</TextButton>
          </div>
        </form>
      ) : (
        <TextButton onClick={() => { setNotice(null); setEditing({ draft: EMPTY }); }}>Ajouter une adresse</TextButton>
      )}
      {notice && <Notice>{notice}</Notice>}
    </section>
  );
}
