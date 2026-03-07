import React, { useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { ArrowRight, Check } from 'lucide-react';

const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [hp, setHp] = useState(""); // HoneyPot anti-bot
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'exists'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hp !== "") return; // Bloque les robots

    setStatus('loading');

    try {
      // Vérifier si l'email existe déjà
      const q = query(collection(db, "newsletter"), where("email", "==", email.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setStatus('exists');
        return;
      }

      // Inscription
      await addDoc(collection(db, "newsletter"), {
        email: email.toLowerCase(),
        subscribedAt: serverTimestamp(),
        source: "footer_site"
      });

      setStatus('success');
      setEmail("");
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  return (
    <section className="py-24 px-6 border-t border-neutral-100 bg-white">
      <div className="max-w-xl mx-auto text-center">
        <span className="text-[9px] uppercase tracking-[0.5em] text-neutral-400 block mb-6">Le Journal</span>
        <h2 className="font-serif text-3xl md:text-4xl italic mb-8">Restez informé de nos prochaines créations</h2>
        
        {status === 'success' ? (
          <div className="flex items-center justify-center gap-3 text-neutral-900 animate-in fade-in duration-700">
            <Check size={16} strokeWidth={1} />
            <p className="text-[11px] uppercase tracking-widest italic font-serif">Vous faites désormais partie de l'Atelier.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="relative max-w-sm mx-auto">
            {/* Honeypot invisible */}
            <input 
              type="text" 
              className="hidden" 
              tabIndex={-1} 
              autoComplete="off" 
              onChange={(e) => setHp(e.target.value)} 
            />

            <div className="relative border-b border-neutral-200 focus-within:border-black transition-colors">
              <input
                type="email"
                required
                placeholder="Votre adresse e-mail"
                className="w-full bg-transparent py-3 pr-10 outline-none text-[13px] font-serif italic placeholder:text-neutral-300"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button 
                type="submit"
                disabled={status === 'loading'}
                className="absolute right-0 top-1/2 -translate-y-1/2 hover:opacity-50 transition-opacity disabled:opacity-20"
              >
                <ArrowRight size={18} strokeWidth={1} />
              </button>
            </div>

            {status === 'exists' && (
              <p className="text-[9px] text-neutral-400 mt-4 uppercase tracking-widest italic">Cet e-mail est déjà inscrit.</p>
            )}
            {status === 'error' && (
              <p className="text-[9px] text-red-400 mt-4 uppercase tracking-widest italic">Une erreur est survenue.</p>
            )}
          </form>
        )}
        
        <p className="text-[8px] uppercase tracking-[0.2em] text-neutral-500 mt-12 leading-relaxed max-w-xs mx-auto">
          En vous inscrivant, vous acceptez de recevoir nos actualités. 
          Désinscription possible à tout moment.
        </p>
      </div>
    </section>
  );
};

export default Newsletter;