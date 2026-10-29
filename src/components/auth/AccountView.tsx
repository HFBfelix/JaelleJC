'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { setPasswordAction, signOutAction, type PasswordResult } from '@/server/auth/actions';
import { PASSWORD_MIN } from '@/server/auth/policy';
import { Field, Notice, PrimaryButton, SecondaryButton } from './ui';

const MESSAGES: Record<PasswordResult, string> = {
  reconnexion: 'Par sécurité, reconnectez-vous avant de choisir un mot de passe.',
  invalide: `Choisissez un mot de passe d'au moins ${PASSWORD_MIN} caractères.`,
  erreur: 'Une erreur est survenue. Réessayez dans un instant.',
};

// Compte (étape 4, minimal) : adresse, mot de passe, déconnexion. Commandes et adresses : étape 6.
export default function AccountView({ email }: { email: string | null }) {
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<PasswordResult | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    try {
      setResult(await setPasswordAction({ password }));
      setPassword('');
    } catch {
      setResult('erreur');
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <p className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 mb-2">Adresse e-mail</p>
      <p className="text-[14px] mb-16">{email}</p>

      <form onSubmit={onSubmit} className="mb-16">
        <h2 className="text-[11px] uppercase tracking-[0.12em] mb-6">Mot de passe</h2>
        <Field label="Nouveau mot de passe" hint={`Au moins ${PASSWORD_MIN} caractères.`} type="password" name="password"
          autoComplete="new-password" required minLength={PASSWORD_MIN} maxLength={128}
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <PrimaryButton type="submit" disabled={pending || password.length < PASSWORD_MIN}>Enregistrer</PrimaryButton>
        {result && <Notice>{MESSAGES[result]}</Notice>}
        {result === 'reconnexion' && (
          <Link href="/connexion?retour=/compte" className="text-[11px] uppercase tracking-[0.12em] border-b-[0.5px] border-black pb-1">
            Me reconnecter
          </Link>
        )}
      </form>

      <form action={signOutAction}>
        <SecondaryButton type="submit">Se déconnecter</SecondaryButton>
      </form>
    </>
  );
}
