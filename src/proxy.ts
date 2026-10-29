// Chaque visite renouvelle la durée du cookie du panier (7 jours après la dernière activité).
// Le contenu du panier n'est pas lu ici : le serveur vérifie toujours l'expiration en base.
import { NextResponse, type NextRequest } from 'next/server';
import { CART_COOKIE, cartCookieOptions, isValidToken } from './server/cart/token';

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const token = request.cookies.get(CART_COOKIE)?.value;
  if (isValidToken(token)) {
    response.cookies.set(CART_COOKIE, token, cartCookieOptions(request.headers.get('host')));
  }
  return response;
}

// Pages seulement : ni fichiers statiques, ni images, ni optimiseur d'images.
export const config = {
  matcher: ['/((?!_next/static|_next/image|api/|assets/|favicon|robots.txt|sitemap.xml).*)'],
};
