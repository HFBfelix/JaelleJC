'use client';

import type { FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';

// Rendu repris de legacy/src/components/layout/Newsletter.tsx.
// L'inscription (écriture serveur validée par Zod, App Check) est branchée à l'étape 1bis :
// l'ancien code lisait `newsletter` depuis le navigateur, ce que les règles refusent.
const Newsletter = () => {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
  };

  return (
    <section className="py-24 px-6 border-t border-neutral-100 bg-white">
      <div className="max-w-xl mx-auto text-center">
        <span className="text-[11px] uppercase tracking-[0.12em] text-neutral-400 block mb-6">Le journal</span>
        <h2 className="font-serif text-3xl md:text-4xl mb-8">Restez informé de nos prochaines créations</h2>

        <form onSubmit={handleSubmit} className="relative max-w-sm mx-auto">
          <div className="relative border-b border-neutral-200 focus-within:border-black transition-colors">
            <input
              type="email"
              required
              aria-label="Votre adresse e-mail"
              placeholder="Votre adresse e-mail"
              className="w-full bg-transparent py-3 pr-10 outline-none text-[14px] placeholder:text-neutral-300"
            />
            <button
              type="submit"
              aria-label="S'inscrire"
              className="absolute right-0 top-1/2 -translate-y-1/2 hover:opacity-50 transition-opacity disabled:opacity-20"
            >
              <ArrowRight size={18} strokeWidth={1} />
            </button>
          </div>
        </form>

        <p className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 mt-12 leading-relaxed max-w-xs mx-auto">
          En vous inscrivant, vous acceptez de recevoir nos actualités.
          Désinscription possible à tout moment.
        </p>
      </div>
    </section>
  );
};

export default Newsletter;
