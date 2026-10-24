import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [hp, setHp] = useState(''); // Honeypot anti-bot
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'exists'>('idle');

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hp !== '') return; // Bloquer les robots
    if (!email) return;
    setStatus('loading');

    try {
      const q = query(collection(db, "newsletter"), where("email", "==", email.toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) { setStatus('exists'); return; }

      await addDoc(collection(db, "newsletter"), {
        email: email.toLowerCase(),
        subscribedAt: serverTimestamp(),
        source: "footer_site"
      });

      setStatus('success');
      setEmail('');
    } catch {
      setStatus('error');
    }
  };

  return (
    <footer className="w-full bg-white border-t-[0.5px] border-neutral-200 pt-20 pb-10 px-6 md:px-12">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">

          {/* Colonne 1 : La Maison */}
          <div className="flex flex-col gap-4">
            <h3 className="font-serif italic text-lg mb-2">Jaelle & JC</h3>
            <p className="text-sans text-[13px] leading-relaxed text-neutral-500 max-w-[200px]">
              Basiques & Intemporels. Confection artisanale française.
            </p>
          </div>

          {/* Colonne 2 : Service Client */}
          <div className="flex flex-col gap-3">
            <span className="text-sans text-[11px] uppercase tracking-[0.2em] mb-2 text-black">Service Client</span>
            <Link to="/contact" className="text-sans text-[13px] text-neutral-500 hover:text-black transition-colors">Contact</Link>
            <Link to="/livraison-et-retours" className="text-sans text-[13px] text-neutral-500 hover:text-black transition-colors">Livraison & Retours</Link>
            <Link to="/CGV" className="text-sans text-[13px] text-neutral-500 hover:text-black transition-colors">CGV</Link>
          </div>

          {/* Colonne 3 : Informations */}
          <div className="flex flex-col gap-3">
            <span className="text-sans text-[11px] uppercase tracking-[0.2em] mb-2 text-black">Informations</span>
            <Link to="/confidentialite" className="text-sans text-[13px] text-neutral-500 hover:text-black transition-colors">Confidentialité</Link>
            <Link to="/mentions-legales" className="text-sans text-[13px] text-neutral-500 hover:text-black transition-colors">Mentions Légales</Link>
          </div>

          {/* Colonne 4 : Newsletter */}
          <div className="flex flex-col gap-4">
            <span className="text-sans text-[11px] uppercase tracking-[0.2em] mb-2 text-black">Newsletter</span>
            {status === 'success' ? (
              <div className="flex items-center gap-2 text-neutral-800 animate-in fade-in duration-500">
                <Check size={12} strokeWidth={1.5} />
                <p className="text-[11px] font-serif italic">Vous faites partie de l'Atelier.</p>
              </div>
            ) : (
              <form onSubmit={handleNewsletter} className="relative border-b-[0.5px] border-neutral-300 pb-2 focus-within:border-black transition-colors">
                <input type="text" className="hidden" tabIndex={-1} autoComplete="off" onChange={(e) => setHp(e.target.value)} />
                <input
                  type="email"
                  required
                  placeholder="Votre adresse email"
                  className="w-full bg-transparent text-sans text-[13px] outline-none placeholder:text-neutral-300 pr-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="absolute right-0 top-1/2 -translate-y-1/2 hover:opacity-50 transition-opacity disabled:opacity-20"
                >
                  <ArrowRight size={16} strokeWidth={1} />
                </button>
              </form>
            )}
            {status === 'exists' && <p className="text-[9px] text-neutral-400 uppercase tracking-widest italic">Déjà inscrit.</p>}
            {status === 'error' && <p className="text-[9px] text-red-400 uppercase tracking-widest italic">Une erreur est survenue.</p>}
          </div>
        </div>

        {/* Bas du Footer - LOGO CORRIGÉ ICI */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-10 border-t-[0.5px] border-neutral-100">
          <img
            src="/assets/logo.png"
            alt="Jaelle & JC"
            /* J'ai augmenté l'opacité à 80% et retiré le grayscale agressif */
            className="h-6 opacity-80 hover:opacity-100 transition-opacity duration-300"
          />
          <p className="text-sans text-[10px] uppercase tracking-[0.1em] text-neutral-500">
            © {currentYear} Jaelle & JC — Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;