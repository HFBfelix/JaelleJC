import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import JsonLd from '@/components/seo/JsonLd';
import { ARTICLES, getArticle } from '@/server/content/articles';
import { articleJsonLd, breadcrumbJsonLd } from '@/server/seo/jsonld';

// Rendu repris de legacy/src/pages/BlogPost.tsx.
export const dynamicParams = false;
export const generateStaticParams = () => ARTICLES.map((a) => ({ slug: a.slug }));

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = getArticle((await params).slug);
  if (!article) return {};
  return {
    title: `${article.title} | Le journal de Jaelle & JC`,
    description: article.excerpt,
    alternates: { canonical: `/blog/${article.slug}` },
    openGraph: { type: 'article', title: article.title, description: article.excerpt, images: [encodeURI(article.image)] },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const article = getArticle((await params).slug);
  if (!article) notFound();
  const otherArticles = ARTICLES.filter((a) => a.slug !== article.slug).slice(0, 2);

  return (
    <article className="min-h-screen bg-white">
      <JsonLd data={articleJsonLd(article)} />
      <JsonLd data={breadcrumbJsonLd([
        { name: 'Accueil', path: '/' },
        { name: 'Le journal', path: '/blog' },
        { name: article.title, path: `/blog/${article.slug}` },
      ])} />

      <div className="w-full aspect-[16/7] md:aspect-[16/5] overflow-hidden bg-neutral-100 relative">
        <Image src={article.image} alt={article.title} fill sizes="100vw" priority className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute bottom-0 left-0 right-0 px-6 md:px-16 pb-10 md:pb-16">
          <span className="text-[11px] uppercase tracking-[0.12em] text-white/60 block mb-3">
            {article.category} — {article.date}
          </span>
          <h1 className="font-serif text-3xl md:text-5xl text-white leading-tight max-w-3xl">
            {article.title}
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-16 md:py-24">
        <Link href="/blog" className="flex items-center gap-3 mb-16 hover:opacity-50 transition-opacity group">
          <div className="h-[0.5px] w-6 bg-black group-hover:w-10 transition-all" />
          <span className="text-[11px] uppercase tracking-[0.12em]">Le Journal</span>
        </Link>

        <div className="space-y-6">
          {article.content.split('\n\n').filter((p) => p.trim()).map((paragraph, i) => (
            <p key={i} className="font-serif text-[18px] md:text-[19px] leading-[1.7] text-neutral-800">
              {paragraph.trim()}
            </p>
          ))}
        </div>

        <div className="flex items-center gap-4 mt-16 pt-10 border-t-[0.5px] border-neutral-100">
          <div className="h-[0.5px] w-8 bg-neutral-300" />
          <span className="text-[11px] uppercase tracking-[0.12em] text-neutral-400">Jaelle & JC</span>
        </div>
      </div>

      <div className="px-6 md:px-16 py-16 bg-neutral-50 text-center border-t-[0.5px] border-neutral-100">
        <h2 className="font-serif text-2xl mb-8">Inspiré par cet article ?</h2>
        <Link
          href="/collection"
          className="inline-block bg-black text-white px-12 py-4 text-[11px] uppercase tracking-[0.12em] hover:bg-neutral-800 transition-all"
        >
          Découvrir la Collection
        </Link>
      </div>

      {otherArticles.length > 0 && (
        <div className="px-6 md:px-16 py-20 border-t-[0.5px] border-neutral-100">
          <span className="text-[11px] uppercase tracking-[0.12em] text-neutral-400 block mb-12">Continuer la lecture</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {otherArticles.map((a) => (
              <Link key={a.slug} href={`/blog/${a.slug}`} className="group cursor-pointer block">
                <div className="aspect-[4/3] overflow-hidden bg-neutral-50 mb-5 relative">
                  <Image
                    src={a.image}
                    alt={a.title}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <span className="text-[11px] uppercase tracking-[0.12em] text-neutral-400 block mb-2">{a.category} — {a.date}</span>
                <h2 className="font-serif text-xl group-hover:text-neutral-500 transition-colors">{a.title}</h2>
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
