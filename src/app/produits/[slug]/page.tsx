import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BuyButton from '@/components/products/BuyButton';
import ProductCard from '@/components/products/ProductCard';
import ProductDetail from '@/components/products/ProductDetail';
import JsonLd from '@/components/seo/JsonLd';
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
      <ProductDetail product={product} buy={<BuyButton productId={product.id} variants={product.variants} />} />

      {/* ── SECTION RÉSONANCES ESTHÉTIQUES ── */}
      {similarProducts.length > 0 && (
        <div className="px-6 md:px-16 py-32 border-t-[0.5px] border-neutral-100 bg-neutral-50/20">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex flex-col items-center mb-20 text-center">
              <span className="text-[11px] uppercase tracking-[0.12em] text-neutral-400 mb-4">Poursuivre la découverte</span>
              <h2 className="font-serif text-3xl text-black">Résonances esthétiques</h2>
              <p className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 mt-2">
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
                  <span className="text-[11px] uppercase tracking-[0.12em] text-black group-hover:opacity-50 transition-opacity">
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
