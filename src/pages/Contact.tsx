import React, { useState } from 'react';

const Contact = () => {
  // Honeypot state pour bloquer les robots
  const [botField, setBotField] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (botField !== "") {
      console.log("Robot détecté"); // Le formulaire n'est pas envoyé
      return;
    }
    // Logique d'envoi humaine ici
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-20">
      <h1 className="font-serif text-4xl italic mb-12">Contact</h1>
      
      <div className="mb-16 text-neutral-600 space-y-4">
        <p className="font-serif italic text-lg text-black">Maison Jaelle & JC</p>
        <p className="text-sm tracking-wide">Atelier en France</p>
        
        {/* L'adresse email n'est plus écrite en dur pour éviter le scan des robots */}
        <button 
          onClick={() => window.location.href = "mailto:" + "contact" + "@" + "jaelleandjc.fr"}
          className="text-sm border-b border-black pb-1 hover:opacity-50 transition-opacity"
        >
          Nous écrire par e-mail
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* CHAMP HONEYPOT (Invisible pour l'humain, piège pour le robot) */}
        <input 
          type="text" 
          name="username_hp" 
          style={{ display: 'none' }} 
          tabIndex={-1} 
          autoComplete="off"
          onChange={(e) => setBotField(e.target.value)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <input type="text" placeholder="Nom" className="w-full border-b border-neutral-200 py-2 outline-none focus:border-black transition-colors" required />
          <input type="email" placeholder="E-mail" className="w-full border-b border-neutral-200 py-2 outline-none focus:border-black transition-colors" required />
        </div>
        <textarea placeholder="Votre message" rows={4} className="w-full border-b border-neutral-200 py-2 outline-none focus:border-black transition-colors" required></textarea>
        
        <button type="submit" className="bg-black text-white px-12 py-4 text-[10px] uppercase tracking-[0.3em] hover:bg-neutral-800 transition-colors">
          Envoyer
        </button>
      </form>
    </div>
  );
};

export default Contact;