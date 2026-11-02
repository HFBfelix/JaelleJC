'use client';

import { useState } from 'react';
import { Notice, PrimaryButton } from '@/components/auth/ui';
import { unsubscribeNewsletterAction } from '@/server/newsletter/actions';

// Désinscription en un clic. Même message que le lien soit valable, déjà utilisé ou faux (rien n'est révélé).
export default function Unsubscribe({ id, token }: { id: string; token: string }) {
  const [state, setState] = useState<'idle' | 'pending' | 'done' | 'error'>('idle');

  const onClick = async () => {
    setState('pending');
    try {
      setState((await unsubscribeNewsletterAction({ id, t: token })) === 'ok' ? 'done' : 'error');
    } catch {
      setState('error');
    }
  };

  if (state === 'done') return <Notice>Votre adresse ne recevra plus la lettre Jaelle &amp; JC.</Notice>;
  return (
    <>
      <p className="text-[14px] mb-8">Vous ne souhaitez plus recevoir la lettre mensuelle de Jaelle &amp; JC ?</p>
      <PrimaryButton type="button" disabled={state === 'pending'} onClick={onClick}>Me désinscrire</PrimaryButton>
      {state === 'error' && <p role="alert" className="text-[14px] mt-6">Une erreur est survenue. Réessayez dans un instant.</p>}
    </>
  );
}
