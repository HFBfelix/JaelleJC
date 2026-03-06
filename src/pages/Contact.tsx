import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const Contact = () => {
  const [botField, setBotField] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // États pour les champs (pour pouvoir les envoyer à Firebase)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (botField !== "") return;
    setLoading(true);
  
    try {
      await addDoc(collection(db, "contacts"), {
        name,
        email,
        messageContent: message,
        createdAt: serverTimestamp(),
        
        // CONFIGURATION DE L'EMAIL REÇU PAR L'ATELIER
        to: "contact@jaellejc.com",
        message: {
          subject: `Atelier Contact — ${name}`,
          html: `
            <div style="background-color: #ffffff; padding: 40px; font-family: 'Times New Roman', Times, serif; color: #1a1a1a; max-width: 600px; margin: auto; border: 0.5px solid #f0f0f0;">
              <div style="text-align: center; margin-bottom: 40px;">
                <h1 style="font-weight: normal; font-style: italic; font-size: 24px; margin: 0;">Jaelle & JC</h1>
                <p style="text-transform: uppercase; font-family: sans-serif; font-size: 9px; letter-spacing: 3px; color: #a3a3a3; margin-top: 10px;">Atelier France</p>
              </div>
  
              <div style="border-top: 0.5px solid #eeeeee; padding-top: 30px;">
                <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #737373; margin-bottom: 20px;">Nouveau Message</p>
                
                <div style="margin-bottom: 25px;">
                  <p style="margin: 0; font-size: 14px;"><strong>Expéditeur :</strong> ${name}</p>
                  <p style="margin: 0; font-size: 14px;"><strong>E-mail :</strong> ${email}</p>
                </div>
  
                <div style="font-style: italic; line-height: 1.6; color: #404040; font-size: 16px; margin-top: 30px; padding: 20px; background-color: #fafafa;">
                  "${message.replace(/\n/g, '<br>')}"
                </div>
              </div>
  
              <div style="margin-top: 50px; text-align: center; border-top: 0.5px solid #eeeeee; padding-top: 20px;">
                <p style="font-size: 10px; color: #d4d4d4; text-transform: uppercase; letter-spacing: 2px;">© 2026 Jaelle & JC — Message via l'Atelier</p>
              </div>
            </div>
          `,
        }
      });
      
      setSent(true);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* HERO */}
      <section className="px-6 md:px-16 pt-8 pb-16 border-b-[0.5px] border-neutral-100">
        <span className="text-[9px] uppercase tracking-[0.6em] text-neutral-300 block mb-3">Contact</span>
        <h1 className="font-serif text-5xl md:text-7xl italic leading-none lowercase">Nous écrire</h1>
      </section>

      <div className="max-w-4xl mx-auto px-6 md:px-16 py-16 md:py-24 grid grid-cols-1 md:grid-cols-2 gap-20 md:gap-32">

        {/* COLONNE GAUCHE — Infos */}
        <div className="flex flex-col justify-between gap-12">
          <div>
            <img
              src="/assets/Logo noir Jaelle&JC_V2.png"
              alt="Logo Jaelle & JC"
              className="h-[32px] w-auto object-contain mb-8"
            />
            <p className="text-[12px] text-neutral-500 leading-relaxed font-light italic mb-2">
              Atelier en France
            </p>
            <p className="text-[12px] text-neutral-400 leading-relaxed font-light italic">
              Chaque message est lu avec attention.<br />
              Nous répondons sous 48h ouvrées.
            </p>
          </div>

          <div className="space-y-4">
            <div className="h-[0.5px] bg-neutral-100 w-full" />
            <button
              onClick={() => window.location.href = "mailto:contact@jaellejc.com"}
              className="flex items-center gap-3 group text-left"
            >
              <div className="h-[0.5px] w-5 bg-black group-hover:w-8 transition-all" />
              <span className="text-[9px] uppercase tracking-[0.3em] group-hover:opacity-50 transition-opacity">
                Nous écrire par e-mail
              </span>
            </button>
            <a
              href="https://instagram.com/jaellejc"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 group"
            >
              <div className="h-[0.5px] w-5 bg-black group-hover:w-8 transition-all" />
              <span className="text-[9px] uppercase tracking-[0.3em] group-hover:opacity-50 transition-opacity">
                Instagram
              </span>
            </a>
          </div>
        </div>

        {/* COLONNE DROITE — Formulaire */}
        <div>
          {sent ? (
            <div className="h-full flex flex-col justify-center animate-in fade-in duration-700">
              <div className="h-[0.5px] w-12 bg-black mb-8" />
              <p className="font-serif text-2xl italic mb-3">Message envoyé.</p>
              <p className="text-[11px] text-neutral-400 italic">Nous vous répondrons sous 48h ouvrées.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-10">
              {/* Honeypot invisible pour les robots */}
              <input
                type="text"
                name="username_hp"
                className="hidden"
                tabIndex={-1}
                autoComplete="off"
                onChange={(e) => setBotField(e.target.value)}
              />

              <div className="space-y-10">
                <div className="border-b border-neutral-100 focus-within:border-black transition-colors pb-1">
                  <input
                    type="text"
                    placeholder="Nom"
                    className="w-full py-2 outline-none bg-transparent text-sm font-serif italic placeholder:text-neutral-500"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="border-b border-neutral-100 focus-within:border-black transition-colors pb-1">
                  <input
                    type="email"
                    placeholder="E-mail"
                    className="w-full py-2 outline-none bg-transparent text-sm font-serif italic placeholder:text-neutral-500"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="border-b border-neutral-100 focus-within:border-black transition-colors pb-1">
                  <textarea
                    placeholder="Votre message"
                    rows={5}
                    className="w-full py-2 outline-none bg-transparent text-sm font-serif italic placeholder:text-neutral-500 resize-none"
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-black text-white px-12 py-4 text-[9px] uppercase tracking-[0.4em] hover:bg-neutral-800 transition-all w-full md:w-auto disabled:opacity-30"
              >
                {loading ? "Transmission..." : "Envoyer"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Contact;