'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { finishLink, isLink, rememberedEmail, type FirebaseClientConfig } from '@/lib/firebase-auth';
import type { ReturnPath } from '@/server/auth/policy';
import { SIGN_IN_ERROR, useOpenSession } from './SignInForm';
import { Field, Notice, PrimaryButton } from './ui';

// Retour du lien de connexion. Lien expiré, déjà utilisé ou trafiqué : refusé par Firebase, même message.
// Ouvert sur un autre appareil : l'e-mail est redemandé (protection prévue par Firebase).
export default function FinishLink({ config, retour, adminOnly }: { config: FirebaseClientConfig; retour: ReturnPath; adminOnly: boolean }) {
  const [state, setState] = useState<'checking' | 'ask-email' | 'error'>('checking');
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const started = useRef(false);
  const openSession = useOpenSession(retour, adminOnly);

  const complete = async (address: string) => {
    try {
      const result = await openSession(await finishLink(config, address, window.location.href));
      if (result) { setMessage(result); setState('error'); }
    } catch {
      setMessage(SIGN_IN_ERROR);
      setState('error');
    }
  };

  useEffect(() => {
    if (started.current) return; // une seule tentative (le lien ne sert qu'une fois)
    started.current = true;
    // Hors du rendu de l'effet (microtâche) : l'état change après le premier affichage.
    void Promise.resolve().then(() => {
      const known = rememberedEmail();
      if (!isLink(config, window.location.href)) {
        setMessage(SIGN_IN_ERROR);
        setState('error');
      } else if (known) {
        return complete(known);
      } else {
        setState('ask-email');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- exécuté une seule fois à l'arrivée sur la page
  }, []);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setState('checking');
    void complete(email.trim());
  };

  if (state === 'ask-email') {
    return (
      <form onSubmit={onSubmit}>
        <Field label="Votre e-mail" hint="Confirmez l'adresse à laquelle le lien a été envoyé." type="email" name="email"
          autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
        <PrimaryButton type="submit" disabled={!email}>Se connecter</PrimaryButton>
      </form>
    );
  }

  if (state === 'error') {
    return (
      <>
        <p role="alert" className="text-[14px] mb-8">{message}</p>
        <Link href={adminOnly ? '/createur/connexion' : `/connexion?retour=${retour}`}
          className="text-[11px] uppercase tracking-[0.12em] border-b-[0.5px] border-black pb-1">
          Recevoir un nouveau lien
        </Link>
      </>
    );
  }

  return <Notice>Connexion en cours…</Notice>;
}
