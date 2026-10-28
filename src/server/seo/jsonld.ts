// Données structurées (schema.org) : faits vérifiables uniquement (CLAUDE.md §5).
// Nom légal, adresse de l'atelier, délais : à compléter par Jaelle (EDITORIAL.md §8), donc absents ici.
import type { ProductView } from '../catalog/types';
import type { Article } from '../content/articles';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.jaellejc.com').replace(/\/$/, '');
export const absolute = (path: string) => (path.startsWith('http') ? path : `${SITE_URL}${path}`);

const ORGANIZATION_ID = `${SITE_URL}/#organisation`;

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: 'Jaelle & JC',
    url: SITE_URL,
    logo: absolute('/assets/Logo%20noir%20Jaelle&JC_V2.png'),
    sameAs: ['https://instagram.com/jaellejc'],
  };
}

export function productJsonLd(product: ProductView, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || product.accroche || undefined,
    image: product.images.map((i) => i.url),
    sku: product.id,
    url: absolute(path),
    category: [product.categoryName, product.subName].filter(Boolean).join(' > ') || undefined,
    material: product.materials.length ? product.materials.join(', ') : undefined,
    brand: { '@type': 'Brand', name: 'Jaelle & JC' },
    offers: {
      '@type': 'Offer',
      url: absolute(path),
      priceCurrency: 'EUR',
      price: (product.priceCents / 100).toFixed(2),
      availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@id': ORGANIZATION_ID },
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: absolute(item.path) })),
  };
}

export function articleJsonLd(article: Article) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    datePublished: article.isoDate,
    image: absolute(encodeURI(article.image)),
    url: absolute(`/blog/${article.slug}`),
    author: { '@id': ORGANIZATION_ID, '@type': 'Organization', name: 'Jaelle & JC' },
    publisher: { '@id': ORGANIZATION_ID },
  };
}

// Séparateurs de ligne Unicode (U+2028, U+2029), invalides dans un script ancien.
const LINE_SEPARATOR = new RegExp(String.fromCharCode(0x2028), 'g');
const PARAGRAPH_SEPARATOR = new RegExp(String.fromCharCode(0x2029), 'g');

// Sérialisation sûre dans une balise <script> : aucun « </script> » ni « <!-- » ne peut s'y glisser.
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(LINE_SEPARATOR, '\\u2028')
    .replace(PARAGRAPH_SEPARATOR, '\\u2029');
}
