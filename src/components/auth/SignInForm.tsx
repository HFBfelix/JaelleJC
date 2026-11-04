'use client';

import { useState, useSyncExternalStore, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { forgetEmail, passwordSignIn, remember, resetPassword, sendLink, type FirebaseClientConfig } from '@/lib/firebase-auth';
import { requestAdminLinkAction, signInAction } from '@/server/auth/actions';
import type { ReturnPath } from '@/server/auth/policy';
import { Field, Notice, PrimaryButton, SecondaryButton, TextButton } from './ui';

// Parcours « e-mail d'abord » (EDITORIAL.md §5) : un seul champ, puis « Vous avez déjà un compte » (mot de passe ou
// lien) ou « Vous êtes nouveau ou nouvelle ici ? » (« Créer mon compte » : lien de confirmation, le compte est créé au
// clic, puis les coordonnées sont demandées). Les messages sont identiques que le compte existe ou non : le site ne
// révèle jamais si une adresse a un compte (CLAUDE.md §4).
export const SIGN_IN_ERROR = "Nous n'avons pas pu vous connecter. Vérifiez votre e-mail et réessayez.";
export const NOT_ADMIN = "Ce compte n'a pas accès à l'Atelier.";

type Step = 'email' | 'password' | 'link-sent' | 'creation-sent' | 'reset-sent';
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

  // Espace créatrice : lien envoyé par le serveur, aux seules administratrices (même réponse pour toute adresse).
  const onLink = (address: string, creating = false) => run(async () => {
    if (adminOnly) {
      if ((await requestAdminLinkAction({ email: address })).status !== 'ok') throw new Error('adresse invalide');
      remember(address);
    } else {
      await sendLink(config, address, retour);
    }
    setStep(creating ? 'creation-sent' : 'link-sent');
  });

  const onEmailStep = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const address = readEmail(e.currentTarget);
    if (address) void onLink(address);
  };

  const toCreation = (form: HTMLFormElement | null) => {
    const address = readEmail(form);
    if (address) void onLink(address, true);
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

  if (step === 'link-sent' || step === 'creation-sent' || step === 'reset-sent') {
    return (
      <>
        <Notice>
          {step === 'creation-sent'
            ? 'Un lien de confirmation vient de vous être envoyé. Cliquez dessus pour créer votre compte : nous vous demanderons ensuite votre civilité, votre nom et votre téléphone. Si vous avez déjà un compte, ce lien vous connecte.'
            : step === 'link-sent'
            ? adminOnly ? "Si cette adresse est autorisée, un lien vient de lui être envoyé. Il ne sert qu'une fois." : "Un lien vient de vous être envoyé. Il ne sert qu'une fois."
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
        hint={step === 'email' ? (adminOnly ? 'Nous vous envoyons un lien de connexion, ou choisissez un mot de passe.' : 'Pour vous connecter ou créer votre compte.') : undefined} />

      {step === 'email' && adminOnly && (
        <div className="space-y-4">
          <PrimaryButton type="submit" disabled={pending || !ready}>Recevoir mon lien</PrimaryButton>
          <SecondaryButton type="button" disabled={pending || !ready} onClick={(e) => toPassword(e.currentTarget.form)}>
            Utiliser un mot de passe
          </SecondaryButton>
        </div>
      )}
      {step === 'email' && !adminOnly && (
        <>
          <section aria-label="Vous avez déjà un compte" className="mb-12">
            <h2 className="text-[11px] uppercase tracking-[0.12em] mb-4">Vous avez déjà un compte</h2>
            <div className="space-y-4">
              <SecondaryButton type="button" disabled={pending || !ready} onClick={(e) => toPassword(e.currentTarget.form)}>
                Utiliser un mot de passe
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={pending || !ready}>Recevoir mon lien</PrimaryButton>
            </div>
          </section>
          <section aria-label="Vous êtes nouveau ou nouvelle ici ?" className="border-t-[0.5px] border-neutral-200 pt-8">
            <h2 className="text-[11px] uppercase tracking-[0.12em] mb-2">Vous êtes nouveau ou nouvelle ici ?</h2>
            <p className="text-[14px] text-neutral-500 mb-4">Créez votre compte en un clic : un lien de confirmation vous est envoyé par e-mail.</p>
            <SecondaryButton type="button" disabled={pending || !ready} onClick={(e) => toCreation(e.currentTarget.form)}>
              Créer mon compte
            </SecondaryButton>
          </section>
        </>
      )}
      {step !== 'email' && (
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
