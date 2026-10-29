// Règles de connexion, pures (testées sans base).
import { z } from 'zod';

export const SESSION_COOKIE = '__session';
export const SESSION_DAYS = 5; // cookie de session Firebase (14 jours au plus) ; ensuite, nouvelle connexion
// Une session ne s'ouvre qu'avec une connexion de moins de 5 minutes (jeton volé plus ancien : refusé),
// et le mot de passe ne se change qu'après une connexion de moins de 10 minutes.
export const RECENT_SIGN_IN_SECONDS = 5 * 60;
export const SENSITIVE_ACTION_SECONDS = 10 * 60;
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

export const isRecent = (authTimeSeconds: number, maxAgeSeconds: number, nowMs = Date.now()) =>
  nowMs / 1000 - authTimeSeconds <= maxAgeSeconds;

export const passwordSchema = z.string().min(PASSWORD_MIN).max(PASSWORD_MAX);
export const emailSchema = z.string().trim().toLowerCase().email().max(254);

// Pages où renvoyer après la connexion : liste fermée (jamais une adresse fournie telle quelle, ni un autre site).
const RETURN_PATHS = ['/panier', '/compte', '/createur'] as const;
export type ReturnPath = (typeof RETURN_PATHS)[number];

export const safeReturn = (value: unknown, fallback: ReturnPath = '/compte'): ReturnPath =>
  RETURN_PATHS.find((p) => p === value) ?? fallback;
