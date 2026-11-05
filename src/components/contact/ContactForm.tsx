'use client';

import { useState, type FormEvent } from 'react';
import { CheckCircle, Loader2, Send } from 'lucide-react';
import { sendContactAction, type ContactResult } from '@/server/contact/actions';

// Formulaire de la page Contact (rendu de l'ancien site). Le serveur valide tout ; les contrôles ici évitent seulement
// un aller-retour inutile.
const inputClass = 'w-full py-4 outline-none bg-transparent text-[11px] tracking-[0.12em] border-b border-neutral-200 focus:border-black placeholder:text-neutral-300 transition-colors uppercase';
const label = 'text-[11px] uppercase tracking-[0.12em] text-neutral-400';

const ERRORS: Partial<Record<ContactResult, string>> = {
  invalide: 'Vérifiez votre nom, votre e-mail et votre message (10 caractères au moins).',
  limite: 'Plusieurs messages viennent d’être envoyés. Réessayez dans une heure.',
  erreur: 'Une erreur est survenue. Réessayez dans un instant.',
};

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', message: '', website: '' });
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await sendContactAction(form);
      if (result === 'ok') {
        setSent(true);
        setForm({ name: '', email: '', message: '', website: '' });
      } else {
        setError(ERRORS[result] ?? ERRORS.erreur!);
      }
    } catch {
      setError(ERRORS.erreur!);
    }
    setPending(false);
  };

  if (sent) {
    return (
      <div role="status" className="text-center py-10">
        <CheckCircle size={40} className="mx-auto mb-6 text-neutral-800" strokeWidth={1} />
        <h2 className="font-serif text-2xl mb-4">Message envoyé</h2>
        <p className="text-[11px] uppercase tracking-[0.12em] text-neutral-500">Nous reviendrons vers vous sous peu.</p>
        <button type="button" onClick={() => setSent(false)} className="mt-8 text-[11px] uppercase tracking-[0.12em] border-b border-black pb-1">Nouvel envoi</button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-10" aria-label="Écrire à l’atelier">
      <div className="hidden" aria-hidden="true">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
      </div>
      <label className="block space-y-1">
        <span className={label}>Votre nom</span>
        <input type="text" required maxLength={100} autoComplete="name" className={inputClass} placeholder="Jean Dupont"
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </label>
      <label className="block space-y-1">
        <span className={label}>Votre e-mail</span>
        <input type="email" required maxLength={254} autoComplete="email" className={inputClass} placeholder="email@exemple.com"
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </label>
      <label className="block space-y-1">
        <span className={label}>Votre message</span>
        <textarea required minLength={10} maxLength={5000} rows={4} className={`${inputClass} resize-none`} placeholder="Votre message ici…"
          value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
      </label>
      <button type="submit" disabled={pending}
        className="w-full bg-black text-white py-6 flex items-center justify-center gap-4 group hover:bg-neutral-900 transition-all disabled:bg-neutral-200">
        {pending ? <Loader2 size={16} className="animate-spin" /> : (
          <>
            <span className="text-[11px] uppercase tracking-[0.12em]">Envoyer ma demande</span>
            <Send size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </>
        )}
      </button>
      {error && <p role="alert" className="text-[14px] border-l border-black pl-4">{error}</p>}
    </form>
  );
}
