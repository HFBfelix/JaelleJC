import type { NextConfig } from 'next';
import { ARTICLES } from './src/server/content/articles';

// En-têtes de sécurité de base (CLAUDE.md §4). La politique CSP complète arrive à l'étape 9 :
// pour l'instant, seule la directive frame-ancestors est posée (interdiction d'affichage en iframe).
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Catalogue PDF et export Excel de l'Atelier : bibliothèques serveur, polices et logo lus sur le disque.
  // react-pdf : chargé hors du paquet de Next, avec le React du projet (son moteur de rendu ne lit pas le React interne de Next).
  serverExternalPackages: ['@react-pdf/renderer', 'exceljs', 'sharp'],
  outputFileTracingIncludes: {
    '/api/createur/catalogue': ['./src/server/catalogue/fonts/*.ttf', './public/assets/Logo noir Jaelle&JC_V2.png'],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Micro autorisé pour ce site seulement dans l'Atelier (dictée de la fiche) ; refusé partout ailleurs.
      { source: '/atelier/:path*', headers: [{ key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' }] },
    ];
  },
  // Photos produits servies par Firebase Storage (production et projet de test).
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/v0/b/jaellejc.firebasestorage.app/**' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/v0/b/jaellejc-staging.firebasestorage.app/**' },
    ],
  },
  // Anciennes adresses du journal (/blog/<numéro>) : redirection permanente vers l'adresse lisible.
  // Espace créatrice renommé « Atelier » (décision de Jaelle, 2026-11-01) : /createur → /atelier.
  async redirects() {
    return [
      ...ARTICLES.map((a) => ({ source: `/blog/${a.legacyId}`, destination: `/blog/${a.slug}`, statusCode: 301 as const })),
      { source: '/createur', destination: '/atelier', statusCode: 301 as const },
      { source: '/createur/:path*', destination: '/atelier/:path*', statusCode: 301 as const },
    ];
  },
};

export default nextConfig;
