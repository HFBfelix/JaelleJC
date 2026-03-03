import React, { useState } from 'react';

const Contact = () => {
  const [botField, setBotField] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (botField !== "") return;
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-white">

      {/* HERO */}
      <section className="px-6 md:px-16 pt-8 pb-16 border-b-[0.5px] border-neutral-100">
        <span className="text-[9px] uppercase tracking-[0.6em] text-neutral-300 block mb-3">Maison</span>
        <h1 className="font-serif text-5xl md:text-7xl italic leading-none">Nous écrire</h1>
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
              onClick={() => window.location.href = "mailto:" + "contact" + "@" + "jaelleandjc.fr"}
              className="flex items-center gap-3 group"
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
            <div className="h-full flex flex-col justify-center">
              <div className="h-[0.5px] w-12 bg-black mb-8" />
              <p className="font-serif text-2xl italic mb-3">Message envoyé.</p>
              <p className="text-[11px] text-neutral-400 italic">Nous vous répondrons sous 48h ouvrées.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-10">
              {/* Honeypot invisible */}
              <input
                type="text"
                name="username_hp"
                style={{ display: 'none' }}
                tabIndex={-1}
                autoComplete="off"
                onChange={(e) => setBotField(e.target.value)}
              />

              <div className="space-y-10">
                <div className="border-b border-neutral-100 focus-within:border-black transition-colors pb-1">
                  <input
                    type="text"
                    placeholder="Nom"
                    className="w-full py-2 outline-none bg-transparent text-sm font-serif italic placeholder:text-neutral-300"
                    required
                  />
                </div>
                <div className="border-b border-neutral-100 focus-within:border-black transition-colors pb-1">
                  <input
                    type="email"
                    placeholder="E-mail"
                    className="w-full py-2 outline-none bg-transparent text-sm font-serif italic placeholder:text-neutral-300"
                    required
                  />
                </div>
                <div className="border-b border-neutral-100 focus-within:border-black transition-colors pb-1">
                  <textarea
                    placeholder="Votre message"
                    rows={5}
                    className="w-full py-2 outline-none bg-transparent text-sm font-serif italic placeholder:text-neutral-300 resize-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="bg-black text-white px-12 py-4 text-[9px] uppercase tracking-[0.4em] hover:bg-neutral-800 transition-all w-full md:w-auto"
              >
                Envoyer
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Contact;