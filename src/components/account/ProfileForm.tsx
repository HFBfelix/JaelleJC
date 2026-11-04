'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { saveProfileAction } from '@/server/account/actions';
import { CIVILITES, type Civilite, type Profile } from '@/server/account/greeting';
import { nationalPart } from '@/server/checkout/phone';
import { Field, Notice, PrimaryButton } from '@/components/auth/ui';
import PhoneFR, { toE164 } from '@/components/forms/PhoneFR';

const MESSAGES = {
  ok: 'C’est noté.',
  invalide: 'Vérifiez vos coordonnées : civilité, prénom, nom et téléphone français sont obligatoires.',
  connexion: 'Votre session a expiré : reconnectez-vous.',
  erreur: 'Une erreur est survenue. Réessayez dans un instant.',
} as const;

const TITLES = {
  bienvenue: { title: 'Faisons connaissance', intro: 'Pour vous saluer par votre nom, vous joindre et suivre vos commandes.' },
  profil: { title: 'Mon profil', intro: '' },
  paiement: { title: 'Vos coordonnées', intro: 'Avant le paiement : pour vous joindre et suivre votre commande. Toutes les informations sont obligatoires.' },
} as const;

// Coordonnées de la personne qui achète (décisions de Jaelle, 2026-11-04) : civilité, prénom, nom et téléphone,
// tous obligatoires ; e-mail du compte affiché sur la page panier (« Mon compte » l'affiche déjà plus bas). « Faisons connaissance » à la première visite du compte,
// « Mon profil » ensuite, « Vos coordonnées » sur la page panier (le paiement attend qu'elles soient complètes).
export default function ProfileForm({ profile, email, variant }: { profile: Profile; email: string | null; variant: keyof typeof TITLES }) {
  const router = useRouter();
  const [civilite, setCivilite] = useState<Civilite | ''>(profile.civilite ?? '');
  const [prenom, setPrenom] = useState(profile.prenom);
  const [nom, setNom] = useState(profile.nom);
  const [phone, setPhone] = useState(profile.telephone ? nationalPart(profile.telephone) : '');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { title, intro } = TITLES[variant];

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setNotice(null);
    try {
      const r = await saveProfileAction({ civilite: civilite || null, prenom, nom, telephone: toE164(phone) });
      setNotice(MESSAGES[r]);
      if (r === 'ok') router.refresh();
    } catch {
      setNotice(MESSAGES.erreur);
    } finally {
      setPending(false);
    }
  };

  return (
    <section aria-label={title} className="mb-16">
      <h2 className="text-[11px] uppercase tracking-[0.12em] mb-2">{title}</h2>
      {intro && <p className="text-[14px] text-neutral-500 mb-6">{intro}</p>}
      <form onSubmit={onSubmit} className={intro ? '' : 'mt-6'}>
        <label className="block mb-8">
          <span className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 block mb-2">Civilité</span>
          <span className="block border-b border-neutral-200 focus-within:border-black transition-colors">
            <select required value={civilite} onChange={(e) => setCivilite(e.target.value as Civilite | '')} className="w-full bg-transparent py-3 outline-none text-[14px]">
              <option value="" disabled>Choisir</option>
              {(Object.keys(CIVILITES) as Civilite[]).map((c) => <option key={c} value={c}>{CIVILITES[c]}</option>)}
            </select>
          </span>
        </label>
        <Field label="Prénom" required maxLength={50} autoComplete="given-name" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
        <Field label="Nom" required maxLength={80} autoComplete="family-name" value={nom} onChange={(e) => setNom(e.target.value)} />
        <PhoneFR label="Téléphone" value={phone} onChange={setPhone} hint="Numéro français, pour le suivi de vos commandes." />
        {email && (
          <p className="text-[14px] mb-8 mt-6"><span className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 block mb-1">E-mail</span>{email}</p>
        )}
        <PrimaryButton type="submit" disabled={pending || !civilite || !prenom.trim() || !nom.trim() || !phone.trim()}>Enregistrer</PrimaryButton>
      </form>
      {notice && <Notice>{notice}</Notice>}
    </section>
  );
}
