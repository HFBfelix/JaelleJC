// Coordonnées de la personne qui achète (décisions de Jaelle, 2026-11-04) et salutation. Pur et testé ; utilisé par
// « Mon compte », la page panier (paiement refusé tant que le profil est incomplet) et les e-mails.
//   Profil complet : civilité, prénom, nom, téléphone français (+33) — tous obligatoires.
//   Salutation : civilité choisie + nom → « Bonjour Madame Martin » ; sinon prénom → « Bonjour Camille » ;
//   rien → « Bonjour, ».
// Les noms sont écrits tels que la personne les a saisis (jamais corrigés : « de La Tour » reste « de La Tour »).
import { z } from 'zod';
import { frenchPhone } from '../checkout/phone';

export const CIVILITES = { madame: 'Madame', monsieur: 'Monsieur', mademoiselle: 'Mademoiselle', 'non-precise': 'Ne pas préciser' } as const;
export type Civilite = keyof typeof CIVILITES;

const oneLine = (max: number) => z.string().trim().max(max).regex(/^[^\r\n<>]*$/);

// Saisie de la personne : tout est obligatoire (civilité, dont « Ne pas préciser », prénom, nom, téléphone).
export const profileInput = z.strictObject({
  civilite: z.enum(Object.keys(CIVILITES) as [Civilite, ...Civilite[]]),
  prenom: oneLine(50).min(1),
  nom: oneLine(80).min(1),
  telephone: frenchPhone,
});
export type ProfileInput = z.infer<typeof profileInput>;
export type Profile = { civilite: Civilite | null; prenom: string; nom: string; telephone: string };

// Profil lu en base : un champ abîmé est ignoré (profil incomplet : redemandé avant le paiement, jamais d'erreur).
export function readProfile(data: unknown): Profile {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const civilite = typeof d.civilite === 'string' && d.civilite in CIVILITES ? (d.civilite as Civilite) : null;
  const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const phone = frenchPhone.safeParse(d.telephone);
  return { civilite, prenom: text(d.prenom, 50), nom: text(d.nom, 80), telephone: phone.success ? phone.data : '' };
}

export const isProfileComplete = (p: Profile) => !!(p.civilite && p.prenom && p.nom && p.telephone);

// « Camille Martin » : nom de la personne qui achète (commande, livraison quand ce n'est pas un cadeau).
export const fullName = (p: Profile) => [p.prenom, p.nom].filter(Boolean).join(' ');

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
