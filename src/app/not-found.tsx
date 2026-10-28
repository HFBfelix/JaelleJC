import Link from 'next/link';

// Page introuvable (l'ancien site affichait l'accueil à toute adresse inconnue, ce que les moteurs pénalisent).
export default function NotFound() {
  return (
    <section className="py-40 px-6 text-center">
      <h1 className="font-serif text-4xl md:text-5xl mb-8">Cette page n&apos;existe pas.</h1>
      <Link href="/collection" className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 hover:text-black transition-colors">
        Découvrir les collections
      </Link>
    </section>
  );
}
