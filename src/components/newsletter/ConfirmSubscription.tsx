'use client';

import { useState } from 'react';
import { Notice, PrimaryButton } from '@/components/auth/ui';
import { confirmNewsletterAction } from '@/server/newsletter/actions';

// Confirmation de l'inscription en un clic (double confirmation, 2026-11-05). Lien faux, expiré ou déjà utilisé :
// message unique, sans rien révéler de l'adresse.
export default function ConfirmSubscription({ id, token }: { id: string; token: string }) {
  const [state, setState] = useState<'idle' | 'pending' | 'done' | 'invalid' | 'error'>('idle');

  const onClick = async () => {
    setState('pending');
    try {
      const result = await confirmNewsletterAction({ id, t: token });
      setState(result === 'ok' ? 'done' : result === 'invalide' ? 'invalid' : 'error');
    } catch {
      setState('error');
    }
  };

  if (state === 'done') return <Notice>Votre inscription est confirmée. Merci, et à bientôt.</Notice>;
  if (state === 'invalid') return <Notice>Ce lien n’est plus valable. Vous pouvez vous inscrire à nouveau en bas de chaque page du site.</Notice>;
  return (
    <>
      <p className="text-[14px] mb-8">Confirmez-vous votre inscription à la lettre Jaelle &amp; JC ?</p>
      <PrimaryButton type="button" disabled={state === 'pending'} onClick={onClick}>Confirmer mon inscription</PrimaryButton>
      {state === 'error' && <p role="alert" className="text-[14px] mt-6">Une erreur est survenue. Réessayez dans un instant.</p>}
    </>
  );
}
