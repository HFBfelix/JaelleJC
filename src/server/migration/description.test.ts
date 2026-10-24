import { describe, expect, it } from 'vitest';
import { splitDescription } from './description';

// Description réelle du coffret, telle qu'affichée aujourd'hui sur sa fiche (capture du 2026-10-24).
const COFFRET = '"Conçu pour accompagner les premiers moments de bébé, ce coffret contient : - Un lange pour bébé en tissu doux et absorbant, idéal pour les soins du quotidien. - 70*70 cm - Trois lingettes réutilisables ultra-douces, parfaites pour une toilette délicate et respectueuse de la peau sensible de bébé. - 15*15 cm - Une cape de bain élégante et confortable, conçue pour envelopper bébé de chaleur et de tendresse après le bain. - 80*80 cm Fabriqué avec soin en France, ce coffret allie qualité artisanale et design intemporel, parfait pour les parents en quête d\'élégance et de praticité. Pourquoi choisir ce coffret ? Pratique et éco-responsable : des produits réutilisables et durables pour une consommation responsable. Un cadeau idéal : un design chic et moderne, parfait pour une naissance, un baptême ou tout autre moment spécial. Made in France : un savoir-faire local et une attention portée à chaque détail."';

describe('découpage de la description du coffret', () => {
  const p = splitDescription({ description: COFFRET });

  it('accroche tirée de la phrase d’introduction', () => {
    expect(p.accroche).toBe('Conçu pour accompagner les premiers moments de bébé.');
  });

  it('composition et dimensions dans « Dimensions & détails »', () => {
    expect(p.details).toEqual([
      'Un lange pour bébé en tissu doux et absorbant : 70 × 70 cm',
      'Trois lingettes réutilisables ultra-douces : 15 × 15 cm',
      'Une cape de bain élégante et confortable : 80 × 80 cm',
    ]);
  });

  it('la promesse environnementale est écartée et signalée', () => {
    expect(p.description).not.toMatch(/éco-responsable|durables|consommation responsable/);
    expect(p.removed.map((r) => r.phrase)).toContain(
      'Pratique et éco-responsable : des produits réutilisables et durables pour une consommation responsable.',
    );
  });

  it('l’intertitre « Pourquoi choisir ce coffret ? » disparaît', () => {
    expect(p.description).not.toContain('Pourquoi choisir');
  });

  it('les phrases d’origine sont gardées avec un conseil de formulation', () => {
    expect(p.description).toContain('Fabriqué avec soin en France, ce coffret allie qualité artisanale');
    expect(p.description).toContain('Un cadeau idéal : un design chic et moderne');
    expect(p.advice.some((a) => a.phrase.startsWith('Made in France'))).toBe(true);
  });

  it('rien n’est inventé : matières et entretien restent à compléter', () => {
    expect(p.materials).toEqual([]);
    expect(p.entretien).toBe('');
    expect(p.toComplete).toEqual(['materials', 'entretien']);
  });

  it('chaque mot de la proposition vient du texte d’origine', () => {
    const source = COFFRET.replace(/\*/g, ' × ').toLocaleLowerCase('fr-FR');
    const words = [p.accroche, p.description, ...p.details].join(' ').toLocaleLowerCase('fr-FR')
      .split(/[^a-zàâäéèêëîïôöùûüç0-9'’-]+/u).filter((w) => w.length > 2);
    for (const word of words) expect(source).toContain(word);
  });
});

describe('autres formes de description', () => {
  it('texte simple sans liste : première phrase courte en accroche, le reste en description', () => {
    const p = splitDescription({ description: 'Une cape de bain en gaze de coton. Cousue main dans notre atelier.' });
    expect(p.accroche).toBe('Une cape de bain en gaze de coton.');
    expect(p.details).toEqual([]);
    expect(p.description).toBe('Cousue main dans notre atelier.');
    expect(p.materials).toEqual(['gaze de coton']);
  });

  it('une seule phrase : pas d’accroche inventée', () => {
    const p = splitDescription({ description: 'Une cape de bain en gaze de coton' });
    expect(p.accroche).toBe('');
    expect(p.description).toBe('Une cape de bain en gaze de coton.');
  });

  it('couverture : consignes de lavage en Entretien, matières séparées, orthographe signalée', () => {
    const p = splitDescription({
      description: 'Couverture pour bébé réalisée avec soin, cette couverture associe deux matières ultra-douces : une face en gaz de coton respirante, et une face en polaire pour une chaleur réconfortante. 100% Made in France.   Laver à 30° / Ne pas blanchir / Ne pas sécher en tambour / Repassage autorisé, maximum 110° ',
      matieres: 'gaz de coton & polaire',
      dimensions: 'Dimensions 70*90 cm',
    });
    expect(p.entretien).toBe('Laver à 30° / Ne pas blanchir / Ne pas sécher en tambour / Repassage autorisé, maximum 110°');
    expect(p.description).not.toContain('Laver');
    expect(p.materials).toEqual(['gaz de coton', 'polaire']);
    expect(p.advice.some((a) => a.reason.includes('gaze de coton'))).toBe(true);
    expect(p.details).toEqual(['Dimensions 70 × 90 cm']);
  });

  it('cabas : dimensions combinées sur deux lignes', () => {
    const p = splitDescription({ description: 'Un cabas.', dimensions: 'Dimensions : 35*56*38 cm - 60 cm hauteur des sangles' });
    expect(p.details).toEqual(['Dimensions : 35 × 56 × 38 cm', '60 cm hauteur des sangles']);
  });

  it('veste : élément après un tiret rangé dans les détails, phrase d’ouverture en accroche', () => {
    const p = splitDescription({
      description: "L'élégance artisanale faite main en France. Ce cocon de douceur est l'allié idéal de la mi-saison. Sa coupe généreuse taille grand pour durer plus longtemps - Délai de confection et livraison : 2 semaines.",
    });
    expect(p.accroche).toBe("L'élégance artisanale faite main en France.");
    expect(p.details).toContain('Délai de confection et livraison : 2 semaines');
    expect(p.description).toMatch(/plus longtemps\.$/);
  });

  it('anciens champs matières et dimensions repris', () => {
    const p = splitDescription({ description: 'Un cabas.', matieres: 'Coton, lin', dimensions: '40x35cm' });
    expect(p.materials).toEqual(['coton', 'lin']);
    expect(p.details).toEqual(['40 × 35 cm']);
  });

  it('« lavable » écarté, y compris dans l’entretien', () => {
    const p = splitDescription({ description: 'Une couverture douce. Lavable en machine à 30 °C.', entretien: 'Lavable à 30 °C' });
    expect(p.description).toBe('Une couverture douce.');
    expect(p.entretien).toBe('');
    expect(p.removed).toHaveLength(2);
  });

  it('description absente ou invalide : tout est à compléter, sans erreur', () => {
    for (const description of [undefined, null, 42, '']) {
      const p = splitDescription({ description });
      expect(p.description).toBe('');
      expect(p.toComplete).toContain('description');
    }
  });

  it('texte avec HTML : conservé comme texte (l’affichage l’échappera)', () => {
    const p = splitDescription({ description: 'Une cape <script>alert(1)</script> douce.' });
    expect(p.description).toContain('<script>');
  });
});
