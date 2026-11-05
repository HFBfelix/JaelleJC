import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

// Mise en page reprise de legacy/src/pages/NotrePromesse.tsx ; texte d'EDITORIAL.md §3 (l'histoire d'abord, « les
// défis de l'industrie » ramenés à une phrase). Pas de nombre d'exemplaires ni de matières tant que Jaelle ne les a
// pas donnés (EDITORIAL.md : ne jamais inventer).
export const metadata: Metadata = {
  title: 'Notre promesse | Jaelle & JC, atelier d’Île-de-France',
  description: 'L’histoire de Jaelle & JC : des créations cousues main en Île-de-France, nées d’une attente de maternité. Séries limitées, pensées pour durer.',
  alternates: { canonical: '/notre-promesse' },
};

export default function NotrePromessePage() {
  return (
    <div className="min-h-screen bg-white pb-24">
      <section className="py-32 px-6 md:px-12 max-w-4xl mx-auto text-center border-b-[0.5px] border-neutral-100">
        <span className="text-[11px] uppercase tracking-[0.12em] mb-8 block text-neutral-400">Notre promesse</span>
        <h1 className="font-serif text-3xl md:text-5xl leading-tight mb-12">Une histoire de mains et de naissances.</h1>
        <p className="text-[15px] leading-relaxed text-neutral-600 font-light max-w-2xl mx-auto">Nous faisons peu, mais nous le faisons bien.</p>
      </section>

      <section className="py-24 px-6 md:px-12 max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row gap-16 items-start">
          <div className="md:w-1/3">
            <h2 className="font-serif text-3xl">Le Nouveau Souffle</h2>
          </div>
          <div className="md:w-2/3 space-y-8 text-[15px] leading-relaxed text-neutral-600 font-light">
            <p>
              Jaelle &amp; JC a toujours eu à cœur de proposer des créations faites main, avec amour. Après une pause de dix mois,
              un grand bouleversement personnel est venu enrichir l’aventure.
            </p>
            <blockquote className="text-black font-medium">
              « La maternité a apporté un nouveau souffle à Jaelle &amp; JC. En attendant mon premier enfant, j’ai pris conscience de
              l’importance de produits de qualité, sûrs et artisanaux. »
            </blockquote>
            <p>
              C’est ainsi qu’est née la gamme dédiée aux bébés : des capes de bain et des couvertures pensées pour être pratiques,
              douces et belles.
            </p>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 md:px-12 max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 border-t-[0.5px] border-neutral-100">
        <div className="flex flex-col justify-center space-y-12">
          <div className="border-l-[0.5px] border-black pl-6 py-1">
            <h2 className="font-serif text-2xl mb-4">L’atelier</h2>
            <p className="text-[14px] text-neutral-500 font-light leading-relaxed">Tout est fait en Île-de-France, de la conception à l’étiquetage.</p>
          </div>
          <div className="border-l-[0.5px] border-black pl-6 py-1">
            <h2 className="font-serif text-2xl mb-4">Les séries limitées</h2>
            <p className="text-[14px] text-neutral-500 font-light leading-relaxed">Nous produisons peu, pour soigner chaque finition.</p>
          </div>
        </div>
        <div className="bg-neutral-50 aspect-[4/5] overflow-hidden flex items-center justify-center p-8 relative">
          <Image src="/assets/estampille.png" alt="Estampille de l’atelier Jaelle & JC" fill sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-contain grayscale p-8" />
        </div>
      </section>

      <section className="py-24 bg-galerie/20 px-6 md:px-12 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-3xl mb-8">Le choix de l’intemporel</h2>
          <p className="text-[15px] leading-relaxed text-neutral-800 mb-8">
            Des coupes simples, des lignes nettes : une pièce qui traverse les modes et se transmet.
          </p>
          <div className="h-[0.5px] w-24 bg-black mx-auto" />
        </div>
      </section>

      <section className="py-24 px-6 text-center">
        <h2 className="font-serif text-2xl mb-6">Écrivez-nous</h2>
        <p className="text-[14px] text-neutral-500 mb-8 max-w-lg mx-auto">
          Une question, une demande pour une naissance à venir ? Nous répondons nous-mêmes.
        </p>
        <Link href="/contact" className="inline-block border-b border-black pb-2 text-[11px] uppercase tracking-[0.12em]">Nous écrire</Link>
      </section>
    </div>
  );
}
