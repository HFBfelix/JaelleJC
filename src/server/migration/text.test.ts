import { describe, expect, it } from 'vitest';
import { frenchTitle } from './text';

describe('typographie française des titres (EDITORIAL.md)', () => {
  it('nom saisi tout en majuscules : une seule capitale', () => {
    expect(frenchTitle('VESTE SHERPA KAKI')).toBe('Veste sherpa kaki');
    expect(frenchTitle('COUVERTURE MOUTARDE IMPRIMÉ FLEURS')).toBe('Couverture moutarde imprimé fleurs');
  });

  it('majuscules de style anglais retirées : la couleur n’est pas un nom', () => {
    expect(frenchTitle('Cabas Imprimé Bleu')).toBe('Cabas imprimé bleu');
    expect(frenchTitle('Résonances Esthétiques')).toBe('Résonances esthétiques');
  });

  it('nom déjà correct : inchangé', () => {
    expect(frenchTitle('Cabas moutarde imprimé fleurs blanches')).toBe('Cabas moutarde imprimé fleurs blanches');
    expect(frenchTitle('Coffret bébé blanc imprimé pétales de fleur')).toBe('Coffret bébé blanc imprimé pétales de fleur');
  });

  it('première lettre en capitale, y compris une famille saisie en minuscules', () => {
    expect(frenchTitle('linges de lit')).toBe('Linges de lit');
    expect(frenchTitle('sur-mesure')).toBe('Sur-mesure');
    expect(frenchTitle('baptême')).toBe('Baptême');
  });

  it('noms propres et sigles conservés', () => {
    expect(frenchTitle('CABAS JAELLE & JC FABRIQUÉ EN FRANCE')).toBe('Cabas Jaelle & JC fabriqué en France');
    expect(frenchTitle('Atelier en île-de-france')).toBe('Atelier en Île-de-France');
  });

  it('après deux-points, minuscule ; élision en début de titre', () => {
    expect(frenchTitle("L'âme du Cabas imprimé bleu : Entre héritage et modernité"))
      .toBe("L'âme du cabas imprimé bleu : entre héritage et modernité");
    expect(frenchTitle("l'âme du VESTE SHERPA kaki")).toBe("L'âme du veste sherpa kaki");
  });

  it('espaces normalisés, texte vide sans erreur', () => {
    expect(frenchTitle('  Cabas   Bleu ')).toBe('Cabas bleu');
    expect(frenchTitle('')).toBe('');
  });
});
