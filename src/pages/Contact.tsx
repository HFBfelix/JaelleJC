import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, Loader2, CheckCircle } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Style aligné : Droit (pas d'italique), 11px, Uppercase, Tracking large
const inputClass = "w-full py-4 outline-none bg-transparent text-[11px] tracking-[0.2em] border-b border-neutral-200 focus:border-black placeholder:text-neutral-300 transition-colors uppercase";

const Contact = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Ajout de 'honeypot' dans l'état initial
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: "DEMANDE D'INFORMATION",
    message: '',
    honeypot: '' 
  });

  // LOGIQUE SENIOR : Validation et Envoi
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. SÉCURITÉ HONEYPOT : Si ce champ est rempli, c'est un robot. 
    // On simule un succès pour le robot (pour ne pas qu'il réessaie) mais on n'envoie rien à Firebase.
    if (formData.honeypot !== '') {
      console.warn("Spam détecté (Honeypot)");
      setSuccess(true);
      return;
    }
    
    // 2. Validation de l'email via Regex (Standard UX)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert("Veuillez entrer une adresse email valide.");
      return;
    }

    // 3. Vérification du message (min 10 caractères pour éviter le spam)
    if (formData.message.trim().length < 10) {
      alert("Votre message est trop court.");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'messages'), {
        name: formData.name.toUpperCase(),
        email: formData.email.toLowerCase(),
        subject: formData.subject,
        message: formData.message,
        createdAt: serverTimestamp(),
        status: 'unread'
      });
      setSuccess(true);
      setFormData({ name: '', email: '', subject: "DEMANDE D'INFORMATION", message: '', honeypot: '' });
    } catch (error) {
      console.error("Erreur envoi message:", error);
      alert("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pt-32 pb-20 px-6 font-sans antialiased">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-20">
          <span className="text-[9px] uppercase tracking-[0.6em] text-neutral-400 block mb-4">Contact</span>
          <h1 className="font-serif text-5xl italic text-neutral-800">L'Atelier vous écoute</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
          {/* Infos de contact */}
          <div className="space-y-12">
            <p className="font-serif italic text-lg text-neutral-600 leading-relaxed lowercase">
              Pour toute question sur une création, une commande spéciale ou l'histoire de nos matières, notre équipe vous répondra avec soin.
            </p>
            
            <div className="space-y-8 pt-8 border-t border-neutral-100">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-400">
                  <Mail size={18} strokeWidth={1} />
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-neutral-400 block">Demande par formulaire</span>
                  <p className="text-[11px] tracking-widest uppercase">Réponse sous 24h-48h</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-400">
                  <MapPin size={18} strokeWidth={1} />
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-neutral-400 block">Atelier</span>
                  <p className="text-[11px] tracking-widest uppercase">PARIS, FRANCE</p>
                </div>
              </div>
            </div>
          </div>

          {/* Formulaire */}
          <div className="bg-neutral-50/50 p-10 md:p-16 border border-neutral-100">
            {success ? (
              <div className="text-center py-10 animate-in fade-in duration-700">
                <CheckCircle size={40} className="mx-auto mb-6 text-neutral-800" strokeWidth={1} />
                <h2 className="font-serif text-2xl italic mb-4">Message envoyé</h2>
                <p className="text-[10px] uppercase tracking-widest text-neutral-500">Nous reviendrons vers vous sous peu.</p>
                <button onClick={() => setSuccess(false)} className="mt-8 text-[10px] uppercase tracking-[0.4em] border-b border-black pb-1">Nouvel envoi</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-10">
                
                {/* CHAMP HONEYPOT - INVISIBLE POUR L'HUMAIN */}
                <div className="hidden" aria-hidden="true">
                  <input 
                    type="text" 
                    name="website" 
                    tabIndex={-1} 
                    autoComplete="off"
                    value={formData.honeypot}
                    onChange={(e) => setFormData({...formData, honeypot: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-neutral-400">Votre Nom</label>
                  <input 
                    type="text" 
                    required 
                    className={inputClass}
                    placeholder="JEAN DUPONT"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-neutral-400">Votre Email</label>
                  <input 
                    type="email" 
                    required 
                    className={inputClass}
                    placeholder="EMAIL@EXAMPLE.COM"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-neutral-400">Votre Message</label>
                  <textarea 
                    required 
                    rows={4}
                    className={`${inputClass} resize-none`}
                    placeholder="VOTRE MESSAGE ICI..."
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-black text-white py-6 flex items-center justify-center gap-4 group hover:bg-neutral-900 transition-all disabled:bg-neutral-200"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : (
                    <>
                      <span className="text-[10px] uppercase tracking-[0.4em]">Envoyer ma demande</span>
                      <Send size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;