import { describe, expect, it } from 'vitest';
import type { NewOrder } from '../checkout/logic';
import { cartReminder, newsletterWelcome, orderConfirmation, orderPreparing, reviewRequest, welcome } from './templates';
import { EMAIL_DEFINITIONS, EMAIL_KINDS, defaultText, emailTextInput, fillVars, resolveTexts, unknownVars } from './texts';

const order = (): NewOrder => ({
  userId: 'u1',
  reference: 'JJC-261104-ABCD',
  items: [{ productId: 'a', variantId: 'unique', sku: 'S', name: 'Cape', variantLabel: '', image: '', unitPriceCents: 8900, quantity: 1 }],
  amounts: { subtotalCents: 8900, deliveryCents: 0, totalCents: 8900 },
  customer: { uid: 'u1', email: 'cliente@exemple.fr', name: 'Camille', phone: '' },
  shipping: { line1: '1 rue A', line2: '', zipCode: '75001', city: 'Paris', country: 'FR' },
  gift: { wrap: false, message: '' },
  stripe: { sessionId: 'cs_test_x', paymentIntentId: 'pi_x', eventId: 'evt_x' },
  status: 'paid', refund: null, tracking: null,
  emails: { cliente: 'en_attente', boutique: 'en_attente' },
});

describe('textes des e-mails : valeurs par défaut', () => {
  it('textes d’EDITORIAL.md inchangés à l’envoi', () => {
    expect(orderConfirmation(order()).subject).toBe('Votre commande Jaelle & JC — JJC-261104-ABCD');
    expect(orderConfirmation(order()).html).toContain('<p style="color:#666;">Nous préparons votre sélection avec le plus grand soin. Voici le détail de votre commande :</p>');
    expect(welcome('a@exemple.fr', 'https://x').html).toContain("<p>Nous sommes ravis de vous compter parmi nous. L'Atelier Jaelle &amp; JC est né d'une envie simple");
    expect(welcome('a@exemple.fr', 'https://x').html).toContain("Bienvenue à l'Atelier</h1>");
    const n = newsletterWelcome('a@exemple.fr', 'u', 'https://x').html;
    expect(n).toContain('<p style="margin:0 0 8px;">Nous vous remercions de votre inscription à la lettre Jaelle &amp; JC');
    expect(n).toContain('<p style="margin:0;">Chaque pièce y est cousue main');
    expect(reviewRequest('a@exemple.fr', 'JJC-1', 'https://x/opt').html).toContain('Il y a deux semaines, votre commande JJC-1 arrivait chez vous.');
  });

  it('chaque e-mail a un texte par défaut valable', () => {
    for (const kind of EMAIL_KINDS) {
      const t = defaultText(kind);
      expect(emailTextInput.safeParse({ kind, ...t }).success).toBe(true);
      expect(unknownVars(kind, t.subject, t.title, t.body)).toEqual([]);
    }
  });
});

describe('textes réglés dans l’Atelier', () => {
  const custom = { subject: 'Merci ! {référence}', title: 'Un grand <merci>', body: 'Ligne 1\nligne 2\n\nParagraphe & suite', personal: false };

  it('objet, titre et texte repris ; mots remplacés ; texte échappé', () => {
    const m = orderPreparing(order(), { text: custom });
    expect(m.subject).toBe('Merci ! JJC-261104-ABCD');
    expect(m.html).toContain('Un grand &lt;merci&gt;</h1>');
    expect(m.html).toContain('<p>Ligne 1<br>ligne 2</p>\n<p>Paragraphe &amp; suite</p>');
    expect(m.text).toContain('Paragraphe & suite');
  });

  it('paragraphe personnalisé ajouté (échappé) après le texte ; absent sinon', () => {
    const lines = [{ name: 'Cape', variantLabel: '', image: null }];
    const withP = cartReminder(1, 'a@exemple.fr', lines, 'https://x', 'https://x/opt', { personal: 'Une cape <douce>.' });
    expect(withP.html).toContain('<p>Une cape &lt;douce&gt;.</p>');
    expect(withP.text).toContain('Une cape <douce>.');
    expect(cartReminder(1, 'a@exemple.fr', lines, 'https://x', 'https://x/opt').html).not.toContain('douce');
  });

  it('objet sur une seule ligne, mots inconnus refusés', () => {
    expect(emailTextInput.safeParse({ kind: 'avis', ...custom, subject: 'A\nBcc: x@y.z' }).success).toBe(false);
    expect(unknownVars('bienvenue', 'Bonjour {nom}', '{référence}')).toEqual(['nom', 'référence']);
    expect(unknownVars('avis', 'Commande {référence}')).toEqual([]);
    expect(fillVars('{référence} {autre}', { référence: 'R1' })).toBe('R1 {autre}');
  });

  it('textes enregistrés relus : abîmés → texte par défaut ; Mistral jamais pour un e-mail qui ne le propose pas', () => {
    const t = resolveTexts({
      avis: { ...custom, subject: 'Votre avis' },
      bienvenue: { ...custom, subject: 'B', personal: true },
      preparation: { subject: '' },
      arrivee: { ...custom, body: 'Bonjour {nom}' },
    });
    expect(t.avis.subject).toBe('Votre avis');
    expect(t.bienvenue.personal).toBe(false);
    expect(t.preparation).toEqual(defaultText('preparation'));
    expect(t.arrivee).toEqual(defaultText('arrivee'));
    expect(resolveTexts(undefined).confirmation).toEqual(defaultText('confirmation'));
  });

  it('paragraphe personnalisé : jamais pour les e-mails envoyés pendant le paiement', () => {
    expect(EMAIL_DEFINITIONS.confirmation.personal).toBeNull();
    expect(EMAIL_DEFINITIONS.excuses.personal).toBeNull();
  });
});
