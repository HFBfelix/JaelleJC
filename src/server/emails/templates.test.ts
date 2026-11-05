import { describe, expect, it } from 'vitest';
import type { NewOrder } from '../checkout/logic';
import { arrivalCheck, cartReminder, escapeHtml, newsletterConfirmRequest, newsletterWelcome, reviewRequest, orderConfirmation, orderPreparing, orderShipped, shopNotification, stockApology } from './templates';

const order = (over: Partial<NewOrder> = {}): NewOrder => ({
  userId: 'u1',
  reference: 'JJC-261029-ABCD',
  items: [{ productId: 'a', variantId: 'unique', sku: 'S', name: 'Cape <b>bleue</b>', variantLabel: '', image: '', unitPriceCents: 8900, quantity: 1 }],
  amounts: { subtotalCents: 8900, deliveryCents: 0, totalCents: 8900 },
  customer: { uid: 'u1', email: 'cliente@exemple.fr', name: '<script>alert(1)</script>', phone: '' },
  shipping: { line1: '1 rue "A"', line2: '', zipCode: '75001', city: 'Paris', country: 'FR' },
  gift: { wrap: true, message: "<img src=x onerror=alert(1)>\nBienvenue" },
  stripe: { sessionId: 'cs_test_x', paymentIntentId: 'pi_x', eventId: 'evt_x' },
  status: 'paid',
  refund: null,
  tracking: null,
  emails: { cliente: 'en_attente', boutique: 'en_attente' },
  ...over,
});

describe('e-mails : tout texte saisi est échappé', () => {
  it('échappement', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });

  it.each([
    ['confirmation', orderConfirmation(order())],
    ['excuses', stockApology(order({ status: 'refunded', refund: { reason: 'stock', id: null } }))],
    ['boutique', shopNotification(order(), 'contact@jaellejc.com')],
  ])('%s : aucune balise de la cliente ou de la base dans le HTML', (_, mail) => {
    expect(mail.html).not.toMatch(/<script|<img|<b>bleue/);
  });

  it('confirmation : objet, destinataire, référence, cadeau', () => {
    const mail = orderConfirmation(order());
    expect(mail.to).toBe('cliente@exemple.fr');
    expect(mail.subject).toBe('Votre commande Jaelle & JC — JJC-261029-ABCD');
    expect(mail.html).toContain('Emballage cadeau');
    expect(mail.html).toContain('&lt;img src=x onerror=alert(1)&gt;<br>Bienvenue');
    expect(mail.html).toContain('Offerte');
  });

  it('objet sur une seule ligne (pas d’en-tête injecté)', () => {
    expect(orderConfirmation(order({ reference: 'R\r\nBcc: x@y.z' })).subject).not.toMatch(/[\r\n]/);
  });

  it('excuses : montant remboursé ; motif « montant » sans parler de stock', () => {
    expect(stockApology(order({ status: 'refunded', refund: { reason: 'stock', id: null } })).html).toContain('trouvé preneur');
    expect(stockApology(order({ status: 'refunded', refund: { reason: 'montant', id: null } })).html).not.toContain('trouvé preneur');
  });

  it('boutique : adresse de notification choisie par Jaelle', () => {
    expect(shopNotification(order(), 'contact@jaellejc.com').to).toBe('contact@jaellejc.com');
  });
});

describe('e-mails de suivi de commande', () => {
  it('en préparation : texte échappé, objet sur une ligne', () => {
    const m = orderPreparing(order());
    expect(m.subject).toBe('Votre commande Jaelle & JC — JJC-261029-ABCD : en préparation');
    expect(m.html).not.toContain('<script>');
    expect(m.to).toBe('cliente@exemple.fr');
  });

  it('colis en route : numéro et lien du transporteur ; lien non https ignoré', () => {
    const shipped = { ...order(), tracking: { carrier: 'Colissimo', number: '6A12345678901', url: 'https://www.laposte.fr/outils/suivre-vos-envois?code=6A12345678901' } };
    const m = orderShipped(shipped);
    expect(m.subject).toBe('Votre colis est en route — JJC-261029-ABCD');
    expect(m.html).toContain('6A12345678901');
    expect(m.html).toContain('href="https://www.laposte.fr/outils/suivre-vos-envois?code=6A12345678901"');
    const bad = orderShipped({ ...shipped, tracking: { ...shipped.tracking, url: 'javascript:alert(1)' } });
    expect(bad.html).not.toContain('javascript:');
  });
});

describe('e-mail d’inscription à la newsletter', () => {
  it('pièce échappée, lien de désinscription, Instagram ; sans pièce : pas de photo', () => {
    const m = newsletterWelcome('a@exemple.fr', 'https://www.jaellejc.com/newsletter/desinscription?id=1&t=2', 'https://www.jaellejc.com',
      { name: '<b>Cabas</b>', priceCents: 6500, image: 'https://firebasestorage.googleapis.com/x.jpg', url: 'https://www.jaellejc.com/produits/cabas' });
    expect(m.subject).toBe('Bienvenue dans la lettre Jaelle & JC');
    expect(m.html).toContain('&lt;b&gt;Cabas&lt;/b&gt;');
    expect(m.html).toContain('href="https://www.jaellejc.com/newsletter/desinscription?id=1&amp;t=2"');
    expect(m.html).toContain('https://www.instagram.com/jaellejc/');
    expect(newsletterWelcome('a@exemple.fr', 'u', 'https://www.jaellejc.com').html).not.toContain('firebasestorage');
  });
});

describe('envois automatiques', () => {
  it('relances : objet par étape, pièces échappées, lien du panier et de désinscription', () => {
    const lines = [{ name: '<i>Cape</i>', variantLabel: 'Écru · 3M', image: null }];
    expect(cartReminder(1, 'a@exemple.fr', lines, 'https://www.jaellejc.com', 'https://x/opt').subject).toBe('Votre sélection vous attend');
    const last = cartReminder(3, 'a@exemple.fr', lines, 'https://www.jaellejc.com', 'https://x/opt');
    expect(last.subject).toBe('Votre sélection sera retirée dans 2 jours');
    expect(last.html).toContain('&lt;i&gt;Cape&lt;/i&gt;');
    expect(last.html).toContain('href="https://www.jaellejc.com/panier"');
    expect(last.html).toContain('href="https://x/opt"');
  });
  it('colis arrivé et avis : référence échappée, lien de désinscription', () => {
    expect(arrivalCheck('a@exemple.fr', 'JJC-1', 'https://x/opt').subject).toBe('Votre colis est-il bien arrivé ? — JJC-1');
    expect(reviewRequest('a@exemple.fr', '<b>', 'https://x/opt').html).toContain('&lt;b&gt;');
    expect(reviewRequest('a@exemple.fr', 'JJC-1', 'https://x/opt').text).toContain('https://x/opt');
  });
});

describe('alerte de la recherche par usage', () => {
  it('à la boutique, objet par sorte, compteurs, lien vers l’Atelier ; jamais de phrase de cliente', async () => {
    const { searchAlert } = await import('./templates');
    const m = searchAlert('contact@jaellejc.com', 'heure', '2026-11-04', { ia: 500, 'refus-heure': 1 }, 'https://www.jaellejc.com');
    expect(m.to).toBe('contact@jaellejc.com');
    expect(m.subject).toBe('Recherche par usage : plafond de l’heure atteint');
    expect(m.text).toContain('ia : 500');
    expect(m.html).toContain('href="https://www.jaellejc.com/atelier/reglages"');
    expect(searchAlert('x@y.z', 'echecs', '2026-11-04', {}, 'https://x').subject).toBe('Recherche par usage : Mistral ne répond pas');
  });
});

describe('salutation des e-mails', () => {
  it('nom du compte (jamais l’adresse de livraison) ; sans profil : « Bonjour, »', async () => {
    const { orderConfirmation, cartReminder, welcome } = await import('./templates');
    const gift = order({ customer: { uid: 'u1', email: 'cliente@exemple.fr', name: 'Destinataire Cadeau', phone: '' } });
    const named = orderConfirmation(gift, { greeting: 'Madame Martin' });
    expect(named.html).toContain('<p>Bonjour Madame Martin,</p>');
    expect(named.html).not.toContain('Bonjour Destinataire');
    expect(named.text).toContain('Bonjour Madame Martin,');
    expect(orderConfirmation(gift).html).toContain('<p>Bonjour,</p>');
    expect(cartReminder(1, 'a@exemple.fr', [], 'https://x', 'https://x/opt', { greeting: '<b>Camille</b>' }).html)
      .toContain('<p>Bonjour &lt;b&gt;Camille&lt;/b&gt;,</p>');
    expect(welcome('a@exemple.fr', 'https://x').html).toContain('<p>Bonjour,</p>');
  });
});

describe('newsletter : demande de confirmation (double confirmation, 2026-11-05)', () => {
  it('un seul bouton vers le lien de confirmation, échappé ; aucun lien de désinscription ni photo', () => {
    const m = newsletterConfirmRequest('a@exemple.fr', 'https://www.jaellejc.com/newsletter/confirmation?id=1&t="x"', 'https://www.jaellejc.com');
    expect(m).toMatchObject({ to: 'a@exemple.fr', subject: 'Confirmez votre inscription à la lettre Jaelle & JC' });
    expect(m.html).toContain('href="https://www.jaellejc.com/newsletter/confirmation?id=1&amp;t=&quot;x&quot;"');
    expect(m.html).toContain('Confirmer mon inscription');
    expect(m.html).not.toContain('desinscription');
    expect(m.text).toContain('Confirmer mon inscription : https://www.jaellejc.com/newsletter/confirmation?id=1&t="x"');
  });

  it('texte réglé dans l’Atelier : utilisé, HTML échappé', () => {
    const m = newsletterConfirmRequest('a@exemple.fr', 'u', 'https://www.jaellejc.com', { text: { subject: 'Objet', title: '<b>Titre</b>', body: 'Texte <i>x</i>', personal: false } });
    expect(m.subject).toBe('Objet');
    expect(m.html).toContain('&lt;b&gt;Titre&lt;/b&gt;');
    expect(m.html).not.toContain('<i>x</i>');
  });
});
