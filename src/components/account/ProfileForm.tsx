'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { saveProfileAction } from '@/server/account/actions';
import { CIVILITES, type Civilite, type Profile } from '@/server/account/greeting';
import { Field, Notice, PrimaryButton } from '@/components/auth/ui';

const MESSAGES = {
  ok: 'C’est noté.',
  invalide: 'Indiquez au moins votre prénom (50 caractères au plus).',
  connexion: 'Votre session a expiré : reconnectez-vous.',
  erreur: 'Une erreur est survenue. Réessayez dans un instant.',
} as const;

// « Faisons connaissance » (première visite du compte), puis « Mon profil » : civilité, prénom, nom. Ils servent à
// saluer la personne sur le site et dans les e-mails (« Bonjour Madame Martin », sinon « Bonjour Camille »).
export default function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const first = !profile.prenom;
  const [civilite, setCivilite] = useState<Civilite | ''>(profile.civilite ?? '');
  const [prenom, setPrenom] = useState(profile.prenom);
  const [nom, setNom] = useState(profile.nom);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setNotice(null);
    try {
      const r = await saveProfileAction({ civilite: civilite || null, prenom, nom });
      setNotice(MESSAGES[r]);
      if (r === 'ok') router.refresh();
    } catch {
      setNotice(MESSAGES.erreur);
    } finally {
      setPending(false);
    }
  };

  return (
    <section aria-label={first ? 'Faisons connaissance' : 'Mon profil'} className="mb-16">
      <h2 className="text-[11px] uppercase tracking-[0.12em] mb-2">{first ? 'Faisons connaissance' : 'Mon profil'}</h2>
      {first && <p className="text-[14px] text-neutral-500 mb-6">Pour vous saluer par votre nom, sur le site et dans nos e-mails.</p>}
      <form onSubmit={onSubmit} className={first ? '' : 'mt-6'}>
        <label className="block mb-8">
          <span className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 block mb-2">Civilité (facultatif)</span>
          <span className="block border-b border-neutral-200 focus-within:border-black transition-colors">
            <select value={civilite} onChange={(e) => setCivilite(e.target.value as Civilite | '')} className="w-full bg-transparent py-3 outline-none text-[14px]">
              <option value="">Choisir</option>
              {(Object.keys(CIVILITES) as Civilite[]).map((c) => <option key={c} value={c}>{CIVILITES[c]}</option>)}
            </select>
          </span>
        </label>
        <Field label="Prénom" required maxLength={50} autoComplete="given-name" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
        <Field label="Nom (facultatif)" maxLength={80} autoComplete="family-name" value={nom} onChange={(e) => setNom(e.target.value)} />
        <PrimaryButton type="submit" disabled={pending || !prenom.trim()}>Enregistrer</PrimaryButton>
      </form>
      {notice && <Notice>{notice}</Notice>}
    </section>
  );
}
