// Outils de texte de la migration (sans dépendance Firebase : testables et rejouables).

export function normalizeSpaces(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function stripQuotes(text: string): string {
  return text.replace(/^["«“\s]+|["»”\s]+$/g, '').trim();
}

// « Bébé & Co » → « bebe-co ». Jamais vide : repli sur `fallback`.
export function slugify(text: string, fallback = 'sans-nom'): string {
  const slug = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' et ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  return slug || fallback;
}

// Slug unique dans `taken` (ajoute -2, -3…), et l'y réserve.
export function uniqueSlug(base: string, taken: Set<string>): string {
  let candidate = base;
  for (let i = 2; taken.has(candidate); i += 1) candidate = `${base.slice(0, 76)}-${i}`;
  taken.add(candidate);
  return candidate;
}

export function capitalize(text: string): string {
  return text ? text.charAt(0).toLocaleUpperCase('fr-FR') + text.slice(1) : text;
}

// Découpe en phrases sur . ? ! suivis d'une majuscule (sans couper « 70.5 » ni « etc. »).
export function splitSentences(text: string): string[] {
  return normalizeSpaces(text)
    .split(/(?<=[.?!])\s+(?=[A-ZÀÂÉÈÊÎÔÛÇ0-9«"])/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

// « 70*70 cm », « 70x70cm », « 70 X 70 » (avec cm) → « 70 × 70 cm ».
export const DIMENSION = /(\d+(?:[.,]\d+)?)\s*[*x×X]\s*(\d+(?:[.,]\d+)?)(?:\s*[*x×X]\s*(\d+(?:[.,]\d+)?))?\s*cm\b/u;

export function formatDimension(match: RegExpMatchArray): string {
  return `${[match[1], match[2], match[3]].filter(Boolean).join(' × ')} cm`;
}
