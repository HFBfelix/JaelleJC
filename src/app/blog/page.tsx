import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ARTICLES } from '@/server/content/articles';

// Rendu repris de legacy/src/pages/Blog.tsx (liens <a> au lieu de clics JavaScript : lisibles par les robots).
export const metadata: Metadata = {
  title: 'Le journal | Jaelle & JC',
  description: 'Les chroniques de Jaelle & JC : matières, savoir-faire et histoire de l’atelier.',
  alternates: { canonical: '/blog' },
};

export default function BlogPage() {
  const featured = ARTICLES[ARTICLES.length - 1]!;
  const others = ARTICLES.slice(0, ARTICLES.length - 1);

  return (
    <div className="min-h-screen bg-white">

      <section className="px-6 md:px-16 pt-8 pb-16 border-b-[0.5px] border-neutral-100">
        <span className="text-[11px] uppercase tracking-[0.12em] text-neutral-300 block mb-3"> </span>
        <h1 className="font-serif text-5xl md:text-7xl leading-none mb-2">Le journal</h1>
        <p className="text-[11px] uppercase tracking-[0.12em] text-neutral-400 mt-4">
          Les chroniques de Jaelle & JC
        </p>
      </section>

      <Link href={`/blog/${featured.slug}`} className="block">
        <section className="relative cursor-pointer group overflow-hidden">
          <div className="aspect-[16/7] md:aspect-[16/6] overflow-hidden bg-neutral-100 relative">
            <Image
              src={featured.image}
              alt={featured.title}
              fill
              sizes="100vw"
              className="w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-all duration-500" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
            <span className="text-[11px] uppercase tracking-[0.12em] text-white/60 block mb-3">
              {featured.category} — {featured.date}
            </span>
            <h2 className="font-serif text-2xl md:text-4xl text-white leading-tight max-w-2xl">
              {featured.title}
            </h2>
            <div className="flex items-center gap-3 mt-6">
              <div className="h-[0.5px] w-6 bg-white/60 group-hover:w-12 transition-all duration-300" />
              <span className="text-[11px] uppercase tracking-[0.12em] text-white/60">Lire l&apos;article</span>
            </div>
          </div>
        </section>
      </Link>

      <section className="px-6 md:px-16 py-20 md:py-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-20">
          {others.map((article, idx) => (
            <Link key={article.slug} href={`/blog/${article.slug}`} className={`block ${idx === 1 ? 'md:mt-20' : ''}`}>
              <article className="group cursor-pointer">
                <div className="aspect-[3/4] overflow-hidden bg-neutral-50 mb-6 relative">
                  <Image
                    src={article.image}
                    alt={article.title}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <span className="text-[11px] uppercase tracking-[0.12em] text-neutral-400 mb-3 block">
                  {article.category} — {article.date}
                </span>
                <h2 className="font-serif text-xl md:text-2xl mb-4 leading-tight group-hover:text-neutral-500 transition-colors">
                  {article.title}
                </h2>
                <p className="text-[12px] text-neutral-400 leading-relaxed line-clamp-3 mb-6">
                  {article.excerpt}
                </p>
                <div className="flex items-center gap-3 group-hover:gap-5 transition-all">
                  <div className="h-[0.5px] w-5 bg-black" />
                  <span className="text-[11px] uppercase tracking-widest">Lire</span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-16 py-20 border-t-[0.5px] border-neutral-100 bg-neutral-50">
        <div className="max-w-xl mx-auto text-center">
          <span className="text-[11px] uppercase tracking-[0.12em] text-neutral-400 block mb-4">Carnets privés</span>
          <h3 className="font-serif text-3xl mb-3">S&apos;inscrire aux Chroniques</h3>
          <p className="text-[11px] text-neutral-400 mb-10">Aucun spam. Désinscription en un clic.</p>
          <div className="flex gap-0 border-b border-black">
            <input
              type="email"
              aria-label="Votre adresse e-mail"
              placeholder="Votre adresse e-mail"
              className="flex-grow py-3 outline-none bg-transparent text-sm placeholder:text-neutral-300"
            />
            <button className="text-[11px] uppercase tracking-[0.12em] px-6 hover:opacity-50 transition-opacity">
              Rejoindre
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
