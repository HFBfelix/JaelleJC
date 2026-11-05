'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Check, Loader2 } from 'lucide-react';
import { subscribeNewsletterAction } from '@/server/newsletter/actions';

// Formulaire de la page /newsletter (rendu de l'ancien site). Même inscription que le pied de page : demande en attente,
// puis confirmation par le lien reçu (double confirmation).
export default function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const result = await subscribeNewsletterAction({ email, source: 'page_newsletter' });
      setStatus(result === 'ok' ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div role="status">
        <div className="flex justify-center mb-6 text-black"><Check size={30} strokeWidth={1} /></div>
        <p className="text-[11px] uppercase tracking-[0.12em] font-medium">Un e-mail vous attend pour confirmer votre inscription.</p>
        <Link href="/" className="inline-block mt-12 text-[11px] uppercase tracking-[0.12em] border-b border-black pb-1">Retour à l’Atelier</Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="border-b border-neutral-200 focus-within:border-black transition-colors">
        <input type="email" required maxLength={254} autoComplete="email" aria-label="Votre adresse e-mail"
          value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Votre adresse e-mail"
          className="w-full py-4 bg-transparent outline-none text-[11px] tracking-[0.12em] text-center uppercase" />
      </div>
      <button type="submit" disabled={status === 'loading'}
        className="w-full bg-black text-white py-6 text-[11px] uppercase tracking-[0.12em] hover:bg-neutral-900 transition-all flex items-center justify-center gap-4">
        {status === 'loading' ? <Loader2 size={16} className="animate-spin" /> : 'Confirmer l’inscription'}
      </button>
      {status === 'error' && (
        <p role="alert" className="text-[11px] uppercase tracking-[0.12em] text-neutral-600">Vérifiez votre adresse e-mail, ou réessayez dans un instant.</p>
      )}
    </form>
  );
}
