import React from 'react';

const NotrePromesse = () => {
  return (
    <div className="min-h-screen bg-white pb-24">
      {/* SECTION 1 : L'AMBITION ET LES DÉFIS (Le Pourquoi) */}
      <section className="py-32 px-6 md:px-12 max-w-4xl mx-auto text-center border-b-[0.5px] border-neutral-100">
        <span className="text-sans text-[11px] uppercase tracking-[0.4em] mb-8 block text-neutral-400">
          Notre Ambition
        </span>
        <h1 className="font-serif text-3xl md:text-5xl italic leading-tight mb-12">
          "Proposer une consommation plus responsable en encourageant la durabilité et une approche réfléchie de la mode."
        </h1>
        <p className="text-sans text-[15px] leading-relaxed text-neutral-600 font-light max-w-2xl mx-auto">
          Nous relevons chaque jour le défi de l'équilibre entre créativité, rentabilité et durabilité face à une industrie marquée par le gaspillage et le manque de traçabilité.
        </p>
      </section>

      {/* SECTION 2 : LE CONTEXTE - LES DÉFIS DE L'INDUSTRIE (IA-Ready) */}
      <section className="py-24 px-6 md:px-12 max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20">
        <div className="flex flex-col justify-center">
          <h2 className="font-serif text-2xl italic mb-10">Les défis de l'industrie auxquels nous faisons face</h2>
          <ul className="space-y-6">
            {[
              { t: "Impact Environnemental", d: "Consommation excessive de ressources et pollution chimique." },
              { t: "Conditions Humaines", d: "Précarité et exploitation liées à l'externalisation massive." },
              { t: "Fast-Fashion", d: "Production rapide et bon marché menant à un gaspillage massif." },
              { t: "Manque de Traçabilité", d: "Opacité sur l'origine et les conditions de fabrication." }
            ].map((item, i) => (
              <li key={i} className="border-l-[0.5px] border-black pl-6 py-1">
                <h4 className="text-[11px] uppercase tracking-widest font-bold mb-1">{item.t}</h4>
                <p className="text-[13px] text-neutral-500 font-light">{item.d}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-neutral-50 aspect-[4/5] overflow-hidden flex items-center justify-center p-8">
  <img 
    src="/assets/estampille.png" 
    alt="Atelier Jaelle & JC - Engagement durable" 
    className="max-w-full max-h-full object-contain grayscale" 
  />
</div>
      </section>

      {/* SECTION 3 : LA RÉPONSE JAELLE & JC - L'INTEMPOREL */}
      <section className="py-24 bg-galerie/20 px-6 md:px-12 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-3xl italic mb-8">Le choix de l'intemporel</h2>
          <p className="text-sans text-[15px] leading-relaxed text-neutral-800 mb-8">
            Un vêtement classique et intemporel traverse les tendances. Il reste élégant quel que soit le contexte ou l'époque. 
            Chez Jaelle & JC, cela se traduit par des <span className="italic">coupes simples, épurées et des lignes nettes</span>.
          </p>
          <div className="h-[0.5px] w-24 bg-black mx-auto"></div>
        </div>
      </section>

      {/* SECTION 4 : LE STORYTELLING - LE NOUVEAU SOUFFLE (La Maternité) */}
      <section className="py-24 px-6 md:px-12 max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row gap-16 items-start">
          <div className="md:w-1/3">
             <h2 className="font-serif text-3xl italic">Le Nouveau Souffle</h2>
          </div>
          <div className="md:w-2/3 space-y-8 text-sans text-[15px] leading-relaxed text-neutral-600 font-light">
            <p>
              Jaelle & JC a toujours eu à cœur de proposer des créations faites main, avec amour. Après une pause de dix mois, 
              un grand bouleversement personnel est venu enrichir notre aventure.
            </p>
            <p className="text-black italic font-medium">
              "La maternité a apporté un nouveau souffle à Jaelle & JC. En attendant mon premier enfant, 
              j’ai pris conscience de l’importance de produits de qualité, sûrs et artisanaux."
            </p>
            <p>
              C'est ainsi qu'est née notre gamme dédiée aux bébés : des capes de bain et des couvertures pensées pour être 
              pratiques, douces et belles, tout en apportant une élégance simple au quotidien des familles.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 5 : MADE IN FRANCE & QUALITÉ */}
      <section className="py-24 border-y-[0.5px] border-neutral-100 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div>
            <h3 className="text-[11px] uppercase tracking-[0.3em] mb-4">Matières Labellisées</h3>
            <p className="text-[13px] text-neutral-500 italic">Soigneusement sélectionnées pour respecter la peau et l'environnement.</p>
          </div>
          <div>
            <h3 className="text-[11px] uppercase tracking-[0.3em] mb-4">Artisanat Français</h3>
            <p className="text-[13px] text-neutral-500 italic">De la conception à l'étiquetage, tout est réalisé en France dans notre atelier.</p>
          </div>
          <div>
            <h3 className="text-[11px] uppercase tracking-[0.3em] mb-4">Séries Limitées</h3>
            <p className="text-[13px] text-neutral-500 italic">Nous limitons la fabrication pour garantir une qualité irréprochable.</p>
          </div>
        </div>
      </section>

      {/* SECTION 6 : CALL TO ACTION / ÉCHANGE */}
      <section className="py-24 px-6 text-center">
        <h2 className="font-serif text-2xl italic mb-6">Vos avis comptent</h2>
        <p className="text-sans text-[13px] text-neutral-400 mb-8 max-w-lg mx-auto uppercase tracking-widest">
          Partagez vos besoins pour cette nouvelle collection.
        </p>
        <a href="https://instagram.com/jaelleandjc" target="_blank" rel="noreferrer" className="inline-block border-b border-black pb-2 text-[11px] uppercase tracking-[0.2em]">
          Suivre notre aventure sur Instagram
        </a>
      </section>
    </div>
  );
};

export default NotrePromesse;