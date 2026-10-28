import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BuyButton from '@/components/products/BuyButton';
import ProductCard from '@/components/products/ProductCard';
import { BackButton, MobileGallery } from '@/components/products/ProductGallery';
import { ProductAccordions, ProductQuote } from '@/components/products/ProductInfo';
import JsonLd from '@/components/seo/JsonLd';
import { formatEuros, productQuote, productSections } from '@/server/catalog/mapping';
import { getProductBySlug, listRelated } from '@/server/catalog/repository';
import { breadcrumbJsonLd, productJsonLd } from '@/server/seo/jsonld';

// Fiche produit : rendu repris de legacy/src/pages/ProductDetail.tsx, lue côté serveur.
// Seuls les produits publiés existent pour le public (brouillon ou archive : 404).
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return { title: 'Pièce introuvable | Jaelle & JC', robots: { index: false } };
  const path = `/produits/${product.slug}`;
  const description = product.summary || `${product.name}, cousu main en Île-de-France par Jaelle & JC.`;
  return {
    title: `${product.name} | Jaelle & JC`,
    description,
    alternates: { canonical: path },
    openGraph: { type: 'website', title: product.name, description, url: path, images: product.images.slice(0, 1).map((i) => i.url) },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();
  const similarProducts = await listRelated(product);
  const path = `/produits/${product.slug}`;
  const price = formatEuros(product.priceCents);
  // Seuls les textes affichés partent vers les composants du navigateur.
  const quote = productQuote(product);
  const sections = productSections(product);
  const category = product.categorySlug ? { name: product.categoryName, path: `/collection?category=${product.categorySlug}` } : null;

  return (
    <div className="bg-white font-sans antialiased">
      <JsonLd data={productJsonLd(product, path)} />
      <JsonLd data={breadcrumbJsonLd([
        { name: 'Accueil', path: '/' },
        { name: 'Les collections', path: '/collection' },
        ...(category ? [category] : []),
        { name: product.name, path },
      ])} />
      <style>
        {`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}
      </style>

      {/* ── VUE MOBILE ── */}
      <div className="lg:hidden">
        <MobileGallery images={product.images} name={product.name} />
        <div className="px-6 py-8" data-zone="infos-produit">
          <span className="text-[9px] uppercase tracking-[0.4em] text-neutral-500 mb-2 block">{product.categoryName}</span>
          <h1 className="font-serif text-3xl italic mb-4">{product.name}</h1>
          <p className="text-lg font-light mb-8">{price} €</p>

          <BuyButton inStock={product.inStock} />

          {/* Ajout de la refonte : la fiche mobile affiche aussi l'accroche et les rubriques. */}
          <div className="mt-10">
            <ProductQuote quote={quote} />
            <ProductAccordions sections={sections} />
          </div>
        </div>
      </div>

      {/* ── VUE ORDINATEUR ── */}
      <div className="hidden lg:flex" style={{ height: '100vh' }}>
        <div
          className="w-[62%] overflow-y-scroll no-scrollbar"
          style={{ scrollSnapType: 'y mandatory', height: '100vh' }}
        >
          {product.images.map((img, i) => (
            <div
              key={img.url}
              style={{ scrollSnapAlign: 'start', height: '100vh' }}
              className="relative overflow-hidden bg-neutral-50"
            >
              <Image
                src={img.url}
                alt={img.alt || `${product.name} ${i + 1}`}
                fill
                sizes="62vw"
                priority={i === 0}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-8 left-8 text-[9px] uppercase tracking-[0.3em] text-white/60">
                {String(i + 1).padStart(2, '0')} / {String(product.images.length).padStart(2, '0')}
              </div>
            </div>
          ))}
        </div>

        <div className="w-[38%] h-screen flex flex-col justify-center px-12 xl:px-16 border-l border-neutral-100 overflow-y-auto" data-zone="infos-produit">
          <div className="max-w-sm mx-auto w-full py-12">

            <BackButton />

            <span className="text-[9px] uppercase tracking-[0.5em] text-neutral-500 block mb-3">
              {product.categoryName} {product.subName && `— ${product.subName}`}
            </span>
            {/* Une seule balise <h1> par page (vue mobile) ; ici, titre équivalent pour les lecteurs d'écran. */}
            <p role="heading" aria-level={1} className="font-serif text-3xl xl:text-4xl italic leading-tight mb-4 lowercase">
              {product.name}
            </p>
            <p className="text-sm font-light tracking-[0.2em] mb-10 text-neutral-800">
              {price} €
            </p>

            <ProductQuote quote={quote} />

            <div className="mb-10">
              <BuyButton inStock={product.inStock} />
            </div>

            <ProductAccordions sections={sections} />
          </div>
        </div>
      </div>

      {/* ── SECTION RÉSONANCES ESTHÉTIQUES ── */}
      {similarProducts.length > 0 && (
        <div className="px-6 md:px-16 py-32 border-t-[0.5px] border-neutral-100 bg-neutral-50/20">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex flex-col items-center mb-20 text-center">
              <span className="text-[9px] uppercase tracking-[0.6em] text-neutral-400 mb-4 italic">Poursuivre la découverte</span>
              <h2 className="font-serif text-3xl italic text-black">Résonances Esthétiques</h2>
              <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mt-2 italic">
                D&apos;autres créations de l&apos;univers {product.categoryName}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 xl:gap-16 mb-20">
              {similarProducts.map((p) => (
                <div key={p.id} className="animate-in fade-in slide-in-from-bottom-2 duration-700">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>

            {category && (
              <div className="flex justify-center mt-20">
                <Link href={category.path} className="group flex flex-col items-center gap-4">
                  <span className="text-[10px] uppercase tracking-[0.5em] text-black group-hover:opacity-50 transition-opacity">
                    Découvrir toute la collection {product.categoryName}
                  </span>
                  <div className="h-[0.5px] w-24 bg-black group-hover:w-40 transition-all duration-700 opacity-20" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
