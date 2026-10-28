'use client';

import Link from 'next/link';

// Erreur côté serveur (base momentanément injoignable…) : message sobre, aucun détail technique affiché.
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="py-40 px-6 text-center">
      <h1 className="font-serif text-4xl md:text-5xl italic mb-8">L&apos;atelier est momentanément indisponible.</h1>
      <div className="flex justify-center gap-10">
        <button onClick={reset} className="text-[10px] uppercase tracking-[0.4em] text-neutral-500 hover:text-black transition-colors">
          Réessayer
        </button>
        <Link href="/" className="text-[10px] uppercase tracking-[0.4em] text-neutral-500 hover:text-black transition-colors">
          Accueil
        </Link>
      </div>
    </section>
  );
}
