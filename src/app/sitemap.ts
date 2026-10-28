import type { MetadataRoute } from 'next';
import { listCategories, listPublishedProducts } from '@/server/catalog/repository';
import { ARTICLES } from '@/server/content/articles';
import { absolute } from '@/server/seo/jsonld';

// Plan du site généré à chaque demande : produits publiés seulement, catégories, journal.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([listPublishedProducts(), listCategories()]);
  return [
    { url: absolute('/'), changeFrequency: 'weekly', priority: 1 },
    { url: absolute('/collection'), changeFrequency: 'weekly', priority: 0.9 },
    ...categories.map((c) => ({ url: absolute(`/collection?category=${c.slug}`), changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...products.map((p) => ({ url: absolute(`/produits/${p.slug}`), changeFrequency: 'weekly' as const, priority: 0.8 })),
    { url: absolute('/blog'), changeFrequency: 'monthly', priority: 0.5 },
    ...ARTICLES.map((a) => ({ url: absolute(`/blog/${a.slug}`), lastModified: a.isoDate, changeFrequency: 'yearly' as const, priority: 0.4 })),
  ];
}
