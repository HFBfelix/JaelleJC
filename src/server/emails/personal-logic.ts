// Paragraphe personnalisé des e-mails (lot 5), partie pure et testée : consigne, faits envoyés, contrôle de la réponse.
// Seuls des faits du catalogue partent chez Mistral (nom de la pièce, coloris et taille, accroche, matières, usages) :
// jamais le nom, l'adresse, l'e-mail ni le mot pour la naissance de la cliente.
import { z } from 'zod';
import type { EmailKind } from './texts';

export const PERSONAL_MAX = 300;

export type PieceFacts = { nom: string; variante: string; accroche: string; matieres: string[]; usages: string[] };

const MOMENTS: Partial<Record<EmailKind, string>> = {
  preparation: 'la commande vient de passer en préparation à l’atelier',
  expedition: 'le colis vient de partir de l’atelier',
  relance1: 'la cliente a laissé ces pièces dans sa sélection hier',
  relance2: 'la cliente a laissé ces pièces dans sa sélection il y a quelques jours',
  relance3: 'la sélection de la cliente sera bientôt retirée',
  avis: 'la cliente a reçu ces pièces il y a deux semaines',
};

export function personalPrompt(kind: EmailKind): string {
  return `Tu écris pour Jaelle & JC, atelier de couture en Île-de-France (cadeaux de naissance cousus main, petites séries),
un court paragraphe ajouté à un e-mail déjà rédigé. Moment : ${MOMENTS[kind] ?? 'e-mail à une cliente'}.

RÈGLES ABSOLUES
- N'utilise que les FAITS fournis sur les pièces. N'invente aucune matière, dimension, date, délai, promesse, remise,
  vertu écologique ou propriété. Ne cite ni prix ni stock. Ne suppose rien sur la cliente ni sur l'occasion.
- 1 ou 2 phrases, ${PERSONAL_MAX} caractères au plus, vouvoiement, ton sobre et chaleureux, aucun point d'exclamation,
  pas de salutation ni de signature (l'e-mail les contient déjà), aucun lien.

Réponds uniquement en JSON : {"paragraphe": ""}`;
}

export const personalFacts = (pieces: PieceFacts[]) => `FAITS : ${JSON.stringify(pieces.slice(0, 6))}`;

const reply = z.object({ paragraphe: z.string() });

// Réponse refusée (le texte fixe part seul) si elle est vide, trop longue, contient un lien, une adresse, un prix,
// ou un nombre absent des faits (date ou délai inventés).
export function parsePersonal(raw: string, pieces: PieceFacts[]): string | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = reply.safeParse(json);
  if (!parsed.success) return null;
  const text = parsed.data.paragraphe.replace(/\s+/g, ' ').trim();
  if (text.length < 20 || text.length > PERSONAL_MAX) return null;
  if (/https?:|www\.|@|€|%|!|<|>/i.test(text)) return null;
  const known = JSON.stringify(pieces);
  if ((text.match(/\d+/g) ?? []).some((n) => !known.includes(n))) return null;
  return text;
}
