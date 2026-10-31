// Adresse de livraison vérifiée dans la Base Adresse Nationale (service public de l'IGN, sans clé, données en France).
// Le navigateur s'en sert pour proposer des adresses réelles ; le serveur revérifie au clic « Payer » et garde
// l'écriture officielle (rue, code postal, ville). Aucune donnée n'est envoyée en dehors de l'adresse tapée.
export const ADDRESS_API = 'https://data.geopf.fr';
const TIMEOUT_MS = 3000;
const MIN_SCORE = 0.6;

const env = (name: string) => process.env[name]?.trim() || null;

// Service de remplacement (tests de parcours) : accepté seulement sur l'ordinateur de développement, avec les émulateurs.
export function addressApi(): string {
  const fake = env('ADDRESS_API_URL');
  if (!fake) return ADDRESS_API;
  if (env('VERCEL_ENV') || !env('FIRESTORE_EMULATOR_HOST')) throw new Error('ADDRESS_API_URL réservé aux tests locaux.');
  return fake.replace(/\/$/, '');
}

export type AddressFeature = { name: string; housenumber: string; postcode: string; city: string; score: number; type: string };

// Réponse du service → adresses au numéro près (les rues seules, lieux-dits et communes sont écartés).
export function parseFeatures(body: unknown): AddressFeature[] {
  const features = (body as { features?: unknown[] } | null)?.features;
  if (!Array.isArray(features)) return [];
  return features.flatMap((f) => {
    const p = (f as { properties?: Record<string, unknown> })?.properties ?? {};
    const ok = p.type === 'housenumber' && typeof p.name === 'string' && typeof p.housenumber === 'string'
      && typeof p.postcode === 'string' && typeof p.city === 'string' && typeof p.score === 'number';
    return ok ? [{ name: p.name as string, housenumber: p.housenumber as string, postcode: p.postcode as string,
      city: p.city as string, score: p.score as number, type: 'housenumber' }] : [];
  });
}

const numberOf = (line1: string) => /^\s*(\d+)/.exec(line1)?.[1] ?? null;

// L'adresse saisie correspond-elle à une adresse réelle : même numéro, même code postal, ressemblance suffisante ?
export function matchAddress(input: { line1: string; zipCode: string }, features: AddressFeature[]): AddressFeature | null {
  const number = numberOf(input.line1);
  if (!number) return null;
  return features.find((f) => f.housenumber.replace(/\D.*$/, '') === number && f.postcode === input.zipCode && f.score >= MIN_SCORE) ?? null;
}

// Service injoignable : on ne bloque pas la vente, mais il faut au moins un numéro et un nom de rue.
export const plausibleLine1 = (line1: string) => /^\s*\d+\s*(bis|ter|[a-z])?[\s,]+\S.*[a-zà-ÿ]{3,}/i.test(line1);

export type AddressCheck =
  | { status: 'verifiee'; line1: string; zipCode: string; city: string }
  | { status: 'non-verifiee' } // service injoignable, adresse plausible : gardée telle que saisie
  | { status: 'introuvable' };

export async function verifyAddress(input: { line1: string; zipCode: string }): Promise<AddressCheck> {
  if (!plausibleLine1(input.line1)) return { status: 'introuvable' }; // numéro et nom de rue exigés dans tous les cas
  const url = `${addressApi()}/geocodage/search?${new URLSearchParams({
    q: input.line1, postcode: input.zipCode, type: 'housenumber', limit: '5',
  })}`;
  let features: AddressFeature[];
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' });
    if (!res.ok) throw new Error(`Base Adresse : ${res.status}`);
    features = parseFeatures(await res.json());
  } catch {
    return { status: 'non-verifiee' };
  }
  const found = matchAddress(input, features);
  return found ? { status: 'verifiee', line1: found.name, zipCode: found.postcode, city: found.city } : { status: 'introuvable' };
}
