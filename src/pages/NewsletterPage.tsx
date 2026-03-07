import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Check, Loader2 } from 'lucide-react';

const NewsletterPage = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    // On récupère l'email de l'URL automatiquement
    const emailParam = searchParams.get('email');
    if (emailParam) setEmail(emailParam);
  }, [searchParams]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    try {
      await addDoc(collection(db, 'newsletter'), {
        email,
        source: 'email_redirect',
        createdAt: serverTimestamp(),
      });
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 pt-20">
      <div className="max-w-md w-full text-center">
        <span className="text-[9px] uppercase tracking-[0.5em] text-neutral-400 block mb-1">
          Newsletter Jaelle & JC
        </span>
        
        <h1 className="font-serif text-4xl italic mb-6">Le Fil de l'Atelier</h1>
        <p className="text-sm font-serif italic text-neutral-500 mb-12 leading-relaxed">
          Rejoignez notre cercle restreint pour suivre nos prochaines créations et l'histoire de nos matières.
        </p>

        {status === 'success' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-center mb-6 text-black">
              <Check size={30} strokeWidth={1} />
            </div>
            <p className="text-[10px] uppercase tracking-[0.3em]">Vous faites désormais partie de l'histoire.</p>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="space-y-8">
            <div className="border-b border-neutral-200 focus-within:border-black transition-colors">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="VOTRE ADRESSE EMAIL"
                className="w-full py-4 bg-transparent outline-none text-[11px] tracking-[0.2em] text-center"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-black text-white py-6 text-[10px] uppercase tracking-[0.4em] hover:bg-neutral-900 transition-all flex items-center justify-center gap-4"
            >
              {status === 'loading' ? <Loader2 size={16} className="animate-spin" /> : "Confirmer l'inscription"}
            </button>
            
            {status === 'error' && (
              <p className="text-[9px] text-red-400 uppercase tracking-widest">Une erreur est survenue. Réessayez ultérieurement.</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default NewsletterPage;