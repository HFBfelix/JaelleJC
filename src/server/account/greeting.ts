// Civilité, prénom, nom et salutation (décision de Jaelle, 2026-11-04). Pur et testé ; utilisé par la page
// « Mon compte » et par les e-mails. Règle de salutation :
//   civilité choisie + nom → « Bonjour Madame Martin » ;
//   sinon prénom → « Bonjour Camille » ;
//   rien → « Bonjour, ».
// Les noms sont écrits tels que la personne les a saisis (jamais corrigés : « de La Tour » reste « de La Tour »).
import { z } from 'zod';

export const CIVILITES = { madame: 'Madame', monsieur: 'Monsieur', mademoiselle: 'Mademoiselle', 'non-precise': 'Ne pas préciser' } as const;
export type Civilite = keyof typeof CIVILITES;

const oneLine = (max: number) => z.string().trim().max(max).regex(/^[^\r\n<>]*$/);

// Saisie de la personne : prénom demandé, civilité et nom facultatifs.
export const profileInput = z.strictObject({
  civilite: z.enum(Object.keys(CIVILITES) as [Civilite, ...Civilite[]]).nullable(),
  prenom: oneLine(50).min(1),
  nom: oneLine(80),
});
export type ProfileInput = z.infer<typeof profileInput>;
export type Profile = { civilite: Civilite | null; prenom: string; nom: string };

// Profil lu en base : un champ abîmé est ignoré (salutation plus simple, jamais d'erreur).
export function readProfile(data: unknown): Profile {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const civilite = typeof d.civilite === 'string' && d.civilite in CIVILITES ? (d.civilite as Civilite) : null;
  const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  return { civilite, prenom: text(d.prenom, 50), nom: text(d.nom, 80) };
}

// Nom à placer après « Bonjour » ; null : « Bonjour, ».
export function greetingName(p: Profile | null): string | null {
  if (!p) return null;
  if (p.civilite && p.civilite !== 'non-precise' && p.nom) return `${CIVILITES[p.civilite]} ${p.nom}`;
  return p.prenom || null;
}

export const salutation = (p: Profile | null) => {
  const name = greetingName(p);
  return name ? `Bonjour ${name}` : 'Bonjour';
};
