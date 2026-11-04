import { describe, expect, it } from 'vitest';
import { PERSONAL_MAX, parsePersonal, personalFacts, personalPrompt, type PieceFacts } from './personal-logic';

const pieces: PieceFacts[] = [{ nom: 'Cape de bain', variante: 'Écru · 0-6M', accroche: 'Une cape douce pour le premier bain.', matieres: ['gaze de coton'], usages: ['naissance'] }];
const reply = (paragraphe: string) => JSON.stringify({ paragraphe });

describe('paragraphe personnalisé : contrôle de la réponse de Mistral', () => {
  it('réponse sobre acceptée', () => {
    expect(parsePersonal(reply('Votre cape de bain en gaze de coton accompagnera les premiers bains en douceur.'), pieces))
      .toBe('Votre cape de bain en gaze de coton accompagnera les premiers bains en douceur.');
  });

  it.each([
    ['JSON illisible', 'pas du json'],
    ['clé absente', JSON.stringify({ texte: 'Votre cape vous attend avec impatience.' })],
    ['trop court', reply('Merci.')],
    ['trop long', reply('a'.repeat(PERSONAL_MAX + 1))],
    ['lien', reply('Retrouvez votre cape sur https://exemple.fr dès maintenant.')],
    ['prix', reply('Votre cape à 45 € vous attend à l’atelier.')],
    ['point d’exclamation', reply('Votre cape vous attend avec impatience !')],
    ['nombre inventé', reply('Votre cape sera livrée sous 3 jours ouvrés.')],
    ['balise', reply('Votre cape <b>douce</b> vous attend à l’atelier.')],
  ])('%s : refusé, le texte fixe part seul', (_, raw) => {
    expect(parsePersonal(raw, pieces)).toBeNull();
  });

  it('nombre présent dans les faits (taille) : accepté', () => {
    expect(parsePersonal(reply('Votre cape en taille 0-6M est prête à envelopper bébé.'), pieces)).not.toBeNull();
  });

  it('faits envoyés : catalogue seulement, au plus 6 pièces ; consigne sans fait inventé', () => {
    const facts = personalFacts(Array(8).fill(pieces[0]));
    expect(JSON.parse(facts.replace(/^FAITS : /, ''))).toHaveLength(6);
    expect(facts).not.toMatch(/@|adresse|email/i);
    expect(personalPrompt('avis')).toContain("N'utilise que les FAITS");
  });
});
