import type { Metadata } from 'next';
import { Suspense } from 'react';
import { permanentRedirect } from 'next/navigation';
import CollectionView from '@/components/products/CollectionView';
import JsonLd from '@/components/seo/JsonLd';
import { listCategories, listPublishedProductsNewestFirst } from '@/server/catalog/repository';
import { breadcrumbJsonLd } from '@/server/seo/jsonld';
import { slugify } from '@/server/migration/text';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const slug = (await searchParams).category;
  const category = typeof slug === 'string' ? (await listCategories()).find((c) => c.slug === slug) : undefined;
  if (category) {
    return {
      title: `${category.name} | Collections | Jaelle & JC`,
      description: `Les pièces ${category.name} de Jaelle & JC, cousues main en Île-de-France.`,
      alternates: { canonical: `/collection?category=${category.slug}` },
    };
  }
  return {
    title: 'Les collections | Jaelle & JC',
    description: 'Capes de bain, couvertures, coffrets et cabas cousus main en Île-de-France, en séries limitées.',
    alternates: { canonical: '/collection' },
  };
}

export default async function CollectionPage({ searchParams }: Props) {
  const params = await searchParams;
  const [products, categories] = await Promise.all([listPublishedProductsNewestFirst(), listCategories()]);

  // Anciennes adresses ?category=<nom> (« Bébé ») : redirection vers le slug (« bebe »).
  const requested = typeof params.category === 'string' ? params.category : null;
  if (requested && !categories.some((c) => c.slug === requested)) {
    const match = categories.find((c) => c.slug === slugify(requested));
    if (match) permanentRedirect(`/collection?category=${match.slug}`);
  }

  const category = categories.find((c) => c.slug === requested);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([
        { name: 'Accueil', path: '/' },
        { name: 'Les collections', path: '/collection' },
        ...(category ? [{ name: category.name, path: `/collection?category=${category.slug}` }] : []),
      ])} />
      <Suspense>
        <CollectionView products={products} categories={categories} />
      </Suspense>
    </>
  );
}
