// Téléphone français (décision de Jaelle, 2026-11-04 : numéro français seulement, indicatif +33 affiché avec le
// drapeau). Pur, utilisé par le navigateur (champ) et le serveur (validation). Mobile ou fixe métropolitain.
import { z } from 'zod';

// « 06 12 34 56 78 », « 6 12 34 56 78 », « +33 6… » ou « 0033 6… » → « +33612345678 ».
export const frenchPhone = z.string().trim().max(30)
  .transform((v) => v.replace(/[\s.\-()]/g, ''))
  .refine((v) => /^(?:\+33|0033|0)?[1-9]\d{8}$/.test(v))
  .transform((v) => `+33${v.replace(/^(?:\+33|0033|0)/, '')}`);

// Partie nationale affichée dans le champ, après « +33 » : « +33612345678 » → « 6 12 34 56 78 ».
export function nationalPart(e164: string): string {
  const digits = e164.replace(/^\+33/, '').replace(/^0/, '').replace(/\D/g, '');
  return digits.replace(/^(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4 $5');
}
