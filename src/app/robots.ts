import type { MetadataRoute } from 'next';
import { absolute } from '@/server/seo/jsonld';

// Production : tout est indexable sauf les espaces privés. Aperçus et local : rien n'est indexé.
export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV !== 'production') {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/createur', '/checkout', '/panier', '/profile', '/compte', '/api/'] },
    sitemap: absolute('/sitemap.xml'),
  };
}
