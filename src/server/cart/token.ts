// Jeton du cookie `cart_token` : 32 octets aléatoires. Seule son empreinte SHA-256 est stockée
// (identifiant du document `carts/{empreinte}`) : une fuite de la base ne donne accès à aucun panier.
import { createHash, randomBytes } from 'node:crypto';
import { serverCookieOptions } from '../http/cookies';
import { CART_TTL_DAYS } from './logic';

export const CART_COOKIE = 'cart_token';

const TOKEN = /^[A-Za-z0-9_-]{43}$/;

export const newToken = () => randomBytes(32).toString('base64url');
export const isValidToken = (value: string | undefined): value is string => !!value && TOKEN.test(value);
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

// Durée renouvelée à chaque visite (src/proxy.ts).
export const cartCookieOptions = (host: string | null) => serverCookieOptions(host, CART_TTL_DAYS * 24 * 60 * 60);
