'use client';

import { useState, type FormEvent } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { subscribeNewsletterAction } from '@/server/newsletter/actions';

// Rendu repris de legacy/src/components/layout/Newsletter.tsx (message de réussite et champ piège compris).
// L'inscription est écrite par le serveur (src/server/newsletter/actions.ts), jamais par le navigateur.
const Newsletter = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Valeurs lues dans le formulaire au moment de l'envoi (fiable avec l'autoremplissage et Safari iOS).
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setStatus('loading');
    try {
      const result = await subscribeNewsletterAction({ email: String(data.get('email') ?? ''), website: String(data.get('website') ?? '') });
      setStatus(result === 'ok' ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  };

  return (
    <section className="py-24 px-6 border-t border-neutral-100 bg-white">
      <div className="max-w-xl mx-auto text-center">
        <span className="text-[11px] uppercase tracking-[0.12em] text-neutral-400 block mb-6">Le journal</span>
        <h2 className="font-serif text-3xl md:text-4xl mb-8">Restez informé de nos prochaines créations</h2>

        {status === 'success' ? (
          <div role="status" className="flex items-center justify-center gap-3 text-neutral-900">
            <Check size={16} strokeWidth={1} />
            <p className="text-[11px] uppercase tracking-[0.12em]">Vous faites désormais partie de l&apos;Atelier.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="relative max-w-sm mx-auto">
            {/* Champ piège invisible (robots) */}
            <input type="text" name="website" defaultValue="" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <div className="relative border-b border-neutral-200 focus-within:border-black transition-colors">
              <input
                type="email"
                name="email"
                required
                maxLength={254}
                aria-label="Votre adresse e-mail"
                placeholder="Votre adresse e-mail"
                onChange={() => { if (status === 'error') setStatus('idle'); }}
                className="w-full bg-transparent py-3 pr-10 outline-none text-[14px] placeholder:text-neutral-300"
              />
              <button
                type="submit"
                aria-label="S'inscrire"
                disabled={status === 'loading'}
                className="absolute right-0 top-1/2 -translate-y-1/2 hover:opacity-50 transition-opacity disabled:opacity-20"
              >
                <ArrowRight size={18} strokeWidth={1} />
              </button>
            </div>
            {status === 'error' && (
              <p role="alert" className="text-[14px] mt-4">Vérifiez votre adresse e-mail et réessayez.</p>
            )}
          </form>
        )}

        <p className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 mt-12 leading-relaxed max-w-xs mx-auto">
          En vous inscrivant, vous acceptez de recevoir nos actualités.
          Désinscription possible à tout moment.
        </p>
      </div>
    </section>
  );
};

export default Newsletter;
