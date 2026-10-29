'use client';

import { useState, useSyncExternalStore, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { forgetEmail, passwordSignIn, resetPassword, sendLink, type FirebaseClientConfig } from '@/lib/firebase-auth';
import { signInAction } from '@/server/auth/actions';
import type { ReturnPath } from '@/server/auth/policy';
import { Field, Notice, PrimaryButton, SecondaryButton, TextButton } from './ui';

// Parcours « e-mail d'abord » (EDITORIAL.md §5) : un seul champ, puis lien de connexion ou mot de passe.
// Les messages sont identiques que le compte existe ou non.
export const SIGN_IN_ERROR = "Nous n'avons pas pu vous connecter. Vérifiez votre e-mail et réessayez.";
export const NOT_ADMIN = "Ce compte n'a pas accès à l'espace créatrice.";

type Step = 'email' | 'password' | 'link-sent' | 'reset-sent';
const noSubscribe = () => () => {};

export function useOpenSession(retour: ReturnPath, adminOnly: boolean) {
  const router = useRouter();
  return async (idToken: string): Promise<string | null> => {
    const result = await signInAction({ idToken, retour });
    if (!result.ok) return SIGN_IN_ERROR;
    if (adminOnly && !result.admin) {
      router.refresh();
      return NOT_ADMIN;
    }
    router.replace(result.redirect);
    router.refresh();
    return null;
  };
}

export default function SignInForm({ config, retour, adminOnly = false }: {
  config: FirebaseClientConfig;
  retour: ReturnPath;
  adminOnly?: boolean;
}) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const openSession = useOpenSession(retour, adminOnly);
  // Boutons actifs une fois la page prête : avant, un envoi natif mettrait l'adresse dans l'URL.
  const ready = useSyncExternalStore(noSubscribe, () => true, () => false);

  const run = async (task: () => Promise<void>) => {
    setPending(true);
    setError(null);
    try {
      await task();
    } catch {
      setError(SIGN_IN_ERROR);
    } finally {
      setPending(false);
    }
  };

  // L'adresse est lue dans le champ lui-même : saisie avant le chargement complet de la page comprise.
  const readEmail = (form: HTMLFormElement | null) => {
    const value = (form?.elements.namedItem('email') as HTMLInputElement | null)?.value.trim() ?? '';
    if (!value) form?.reportValidity();
    else setEmail(value);
    return value;
  };

  const onLink = (address: string) => run(async () => {
    await sendLink(config, address, retour);
    setStep('link-sent');
  });

  const onEmailStep = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const address = readEmail(e.currentTarget);
    if (address) void onLink(address);
  };

  const toPassword = (form: HTMLFormElement | null) => {
    if (readEmail(form)) setStep('password');
  };

  const onPassword = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement | null)?.value ?? '';
    return run(async () => {
      const message = await openSession(await passwordSignIn(config, email, password));
      if (message) setError(message);
    });
  };

  const onReset = () => run(async () => {
    await resetPassword(config, email);
    setStep('reset-sent');
  });

  const restart = () => { forgetEmail(); setStep('email'); setError(null); };

  if (step === 'link-sent' || step === 'reset-sent') {
    return (
      <>
        <Notice>
          {step === 'link-sent'
            ? "Un lien vient de vous être envoyé. Il ne sert qu'une fois."
            : 'Si un compte existe pour cette adresse, un e-mail pour choisir un nouveau mot de passe vient de vous être envoyé.'}
        </Notice>
        <TextButton onClick={restart}>Utiliser une autre adresse</TextButton>
      </>
    );
  }

  return (
    <form method="post" onSubmit={step === 'password' ? onPassword : onEmailStep}>
      <Field key={step} label="Votre e-mail" type="email" name="email" autoComplete="email" required maxLength={254}
        defaultValue={email} readOnly={step === 'password'}
        hint={step === 'email' ? 'Nous vous envoyons un lien de connexion, ou choisissez un mot de passe.' : undefined} />

      {step === 'email' ? (
        <div className="space-y-4">
          <PrimaryButton type="submit" disabled={pending || !ready}>Recevoir mon lien</PrimaryButton>
          <SecondaryButton type="button" disabled={pending || !ready} onClick={(e) => toPassword(e.currentTarget.form)}>
            Utiliser un mot de passe
          </SecondaryButton>
        </div>
      ) : (
        <>
          <Field label="Mot de passe" type="password" name="password" autoComplete="current-password" required
            maxLength={128} autoFocus />
          <PrimaryButton type="submit" disabled={pending}>Se connecter</PrimaryButton>
          <div className="flex flex-wrap gap-6 mt-8">
            <TextButton onClick={onReset} disabled={pending}>Mot de passe oublié ?</TextButton>
            <TextButton onClick={restart}>Recevoir un lien à la place</TextButton>
          </div>
          <p className="text-[14px] text-neutral-500 mt-8">
            Pas encore de mot de passe ? Recevez un lien : vous pourrez en choisir un depuis votre compte.
          </p>
        </>
      )}

      {error && <p role="alert" className="text-[14px] mt-8">{error}</p>}
    </form>
  );
}
