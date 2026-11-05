// E-mails du parcours d'achat (EDITORIAL.md §6), purs et testés. Tout texte venu d'une cliente ou de la base
// (nom, adresse, mot pour la naissance, noms des pièces) est échappé avant d'entrer dans le HTML.
// Style repris de l'e-mail de confirmation de l'ancien site, typographie « Atelier » (droit, 11 px au moins).
// Objet, titre et texte des e-mails aux clientes : réglables dans l'Atelier (texts.ts), textes d'EDITORIAL.md par défaut ;
// un court paragraphe rédigé par Mistral (personal.ts) peut suivre le texte, sinon le texte fixe part seul.
import type { NewOrder } from '../checkout/logic';
import { defaultText, fillVars, type EmailKind, type EmailText } from './texts';

export type EmailMessage = { to: string; subject: string; html: string; text: string };
type MailOrder = Omit<NewOrder, 'tracking'>;

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

// Objet d'e-mail : une seule ligne (aucun saut de ligne injectable dans les en-têtes).
const oneLine = (value: string) => value.replace(/[\r\n]+/g, ' ').trim();

// Texte réglable : échappé, paragraphes séparés par une ligne vide, retour à la ligne simple gardé.
const escapeText = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const paragraphs = (body: string) => body.split(/\r?\n\s*\r?\n/).map((p) => p.trim()).filter(Boolean);
function htmlParagraphs(body: string, style = '', lastStyle = style) {
  const list = paragraphs(body);
  return list.map((p, i) => {
    const css = i === list.length - 1 ? lastStyle : style;
    return `<p${css ? ` style="${css}"` : ''}>${escapeText(p).replace(/\r?\n/g, '<br>')}</p>`;
  }).join('\n');
}
const personalHtml = (personal: string | null) => (personal ? `<p>${escapeText(personal)}</p>` : '');

// `greeting` : nom de la salutation, tiré du compte de la personne qui a commandé (src/server/account/greeting.ts) ;
// absent : « Bonjour, ». Jamais le nom de l'adresse de livraison (un cadeau peut être envoyé à quelqu'un d'autre).
export type TextOptions = { text?: EmailText; personal?: string | null; greeting?: string | null };
// Textes de l'e-mail, mots entre accolades remplacés (« {référence} »).
function texts(kind: EmailKind, opts: TextOptions, vars: Record<string, string> = {}) {
  const t = opts.text ?? defaultText(kind);
  const fill = (v: string) => fillVars(v, vars);
  return { subject: oneLine(fill(t.subject)), title: escapeText(fill(t.title)), titleText: fill(t.title), body: fill(t.body), personal: opts.personal ?? null, greeting: opts.greeting ?? null };
}
const helloText = (greeting: string | null) => `Bonjour${greeting ? ` ${greeting}` : ''},`;
const hello = (greeting: string | null) => `<p>${escapeHtml(helloText(greeting))}</p>`;
const plain = (t: { titleText: string; body: string; personal: string | null; greeting?: string | null }, withHello = true) =>
  [t.titleText, withHello ? helloText(t.greeting ?? null) : '', ...paragraphs(t.body), t.personal ?? ''].filter(Boolean);

const euros = (cents: number) => (cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2).replace('.', ','));

const layout = (body: string) => `<!doctype html><html lang="fr"><body style="margin:0;background:#ffffff;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;padding:40px 24px;font-family:'Source Sans 3',Arial,sans-serif;font-size:14px;line-height:1.7;color:#000;">
<tr><td>${body}
<p style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#999;margin-top:48px;">Jaelle &amp; JC — cousu main en Île-de-France</p>
</td></tr></table></body></html>`;

function itemsTable(order: MailOrder) {
  const rows = order.items.map((i) => `<tr>
<td style="padding:12px 0;border-bottom:0.5px solid #eee;">${escapeHtml(i.name)}${i.variantLabel ? ` — ${escapeHtml(i.variantLabel)}` : ''}</td>
<td align="center" style="padding:12px 0;border-bottom:0.5px solid #eee;color:#666;">${i.quantity}</td>
<td align="right" style="padding:12px 0;border-bottom:0.5px solid #eee;">${euros(i.unitPriceCents * i.quantity)} €</td></tr>`).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-top:0.5px solid #000;">${rows}</table>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
<tr><td style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#999;">Livraison</td><td align="right">${order.amounts.deliveryCents ? `${euros(order.amounts.deliveryCents)} €` : 'Offerte'}</td></tr>
<tr><td style="padding-top:12px;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;font-weight:600;">Total</td><td align="right" style="padding-top:12px;font-size:20px;">${euros(order.amounts.totalCents)} €</td></tr></table>`;
}

// Adresse au nom du destinataire (`shipping.name`, depuis le 2026-11-04) ; commandes d'avant : nom de `customer`.
type ShippingWithRecipient = MailOrder['shipping'] & { name?: string; phone?: string };
const recipient = (order: MailOrder) => {
  const ship = order.shipping as ShippingWithRecipient;
  return { name: ship.name || order.customer.name, phone: ship.phone || order.customer.phone };
};
const address = (order: MailOrder) => [recipient(order).name, order.shipping.line1, order.shipping.line2,
  `${order.shipping.zipCode} ${order.shipping.city}`.trim()].filter(Boolean).map(escapeHtml).join('<br>');

function giftBlock(order: MailOrder) {
  if (!order.gift.wrap) return '';
  const message = order.gift.message
    ? `<p style="margin:8px 0 0;">« ${escapeHtml(order.gift.message).replace(/\r?\n/g, '<br>')} »</p>` : '';
  return `<div style="border-left:0.5px solid #000;padding:4px 0 4px 20px;margin:24px 0;">
<p style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#999;margin:0;">Emballage cadeau</p>${message}</div>`;
}

export function orderConfirmation(order: MailOrder, opts: TextOptions = {}): EmailMessage {
  const t = texts('confirmation', opts, { référence: order.reference });
  const html = layout(`
<p style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#999;">Commande confirmée</p>
<h1 style="font-family:'Crimson Pro',Georgia,serif;font-weight:400;font-size:28px;margin:8px 0;">${t.title}</h1>
<p style="color:#666;">Référence : ${escapeHtml(order.reference)}</p>
${hello(t.greeting)}
${htmlParagraphs(t.body, 'color:#666;')}${personalHtml(t.personal)}
${itemsTable(order)}${giftBlock(order)}
<div style="background:#F7F7F7;padding:20px;margin-top:24px;">
<p style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#999;margin:0 0 8px;">Livraison</p>
<p style="margin:0;">${address(order)}</p></div>`);
  const text = [...plain(t), `Référence : ${order.reference}`, ...order.items.map((i) => `${i.quantity} × ${i.name} : ${euros(i.unitPriceCents * i.quantity)} €`),
    `Total : ${euros(order.amounts.totalCents)} €`].join('\n');
  return { to: order.customer.email, subject: t.subject, html, text };
}

// Motif « stock » : titre et texte réglables ; motif « montant » (rare) : texte fixe.
export function stockApology(order: MailOrder, opts: TextOptions = {}): EmailMessage {
  const stock = order.refund?.reason !== 'montant';
  const t = texts('excuses', opts, { référence: order.reference });
  const fixed = 'Un problème est survenu pendant votre paiement. Nous sommes sincèrement désolées.';
  const html = layout(`
<h1 style="font-family:'Crimson Pro',Georgia,serif;font-weight:400;font-size:28px;margin:8px 0;">${stock ? t.title : 'Votre commande n’a pas pu aboutir.'}</h1>
${hello(t.greeting)}
${stock ? htmlParagraphs(t.body) : `<p>${fixed}</p>`}
<p>Votre paiement de ${euros(order.amounts.totalCents)} € vous est intégralement remboursé. Le remboursement apparaît sur votre relevé sous quelques jours, selon votre banque.</p>
<p style="color:#666;">Référence : ${escapeHtml(order.reference)}</p>`);
  const text = [...(stock ? plain({ ...t, personal: null }) : [fixed]),
    `Vos ${euros(order.amounts.totalCents)} € vous sont intégralement remboursés. Référence : ${order.reference}.`].join('\n');
  return { to: order.customer.email, subject: t.subject, html, text };
}

export function shopNotification(order: MailOrder, shopEmail: string): EmailMessage {
  const refunded = order.status === 'refunded';
  const html = layout(`
<h1 style="font-family:'Crimson Pro',Georgia,serif;font-weight:400;font-size:24px;margin:8px 0;">${refunded ? 'Commande remboursée automatiquement' : 'Nouvelle commande'}</h1>
<p>Référence : ${escapeHtml(order.reference)}${refunded ? ` — motif : ${order.refund?.reason === 'stock' ? 'stock insuffisant' : 'montant inattendu'}` : ''}</p>
${itemsTable(order)}${giftBlock(order)}
<p style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#999;margin:24px 0 4px;">Livraison</p>
<p style="margin:0;">${address(order)}<br>Téléphone : ${escapeHtml(recipient(order).phone || 'non renseigné')}</p>
<p style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#999;margin:24px 0 4px;">Commande passée par</p>
<p style="margin:0;">${escapeHtml(order.customer.name || 'non renseigné')}<br>Téléphone : ${escapeHtml(order.customer.phone || 'non renseigné')}<br>E-mail : ${escapeHtml(order.customer.email)}</p>`);
  const text = `${refunded ? 'Commande remboursée' : 'Nouvelle commande'} ${order.reference} : ${euros(order.amounts.totalCents)} €.`;
  return { to: shopEmail, subject: oneLine(`${refunded ? 'Remboursement' : 'Nouvelle commande'} — ${order.reference}`), html, text };
}

// Lien de connexion envoyé par le serveur (espace créatrice) : texte d'EDITORIAL.md §6.
export function signInLink(to: string, link: string): EmailMessage {
  const html = layout(`
<h1 style="font-family:'Crimson Pro',Georgia,serif;font-weight:400;font-size:28px;margin:8px 0;">Votre lien de connexion</h1>
<p>Voici votre lien pour vous connecter. Il ne fonctionne qu'une fois.</p>
<p style="margin:32px 0;"><a href="${escapeHtml(link)}" style="background:#000;color:#fff;text-decoration:none;padding:16px 32px;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;">Me connecter</a></p>
<p style="color:#666;">Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>`);
  const text = `Voici votre lien pour vous connecter. Il ne fonctionne qu'une fois.\n${link}\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.`;
  return { to, subject: 'Votre lien de connexion Jaelle & JC', html, text };
}

// Commande passée « en préparation » dans l'espace créatrice.
export function orderPreparing(order: MailOrder, opts: TextOptions = {}): EmailMessage {
  const t = texts('preparation', opts, { référence: order.reference });
  const html = layout(`
<p style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#999;">Référence : ${escapeHtml(order.reference)}</p>
<h1 style="font-family:'Crimson Pro',Georgia,serif;font-weight:400;font-size:28px;margin:8px 0;">${t.title}</h1>
${hello(t.greeting)}
${htmlParagraphs(t.body)}${personalHtml(t.personal)}
${itemsTable(order)}${giftBlock(order)}`);
  const text = [...plain(t), `Référence : ${order.reference}`].join('\n');
  return { to: order.customer.email, subject: t.subject, html, text };
}

// Colis remis au transporteur (EDITORIAL.md §6) : numéro de suivi recopié par Jaelle et lien du transporteur.
export type ShippedOrder = Omit<NewOrder, 'tracking'> & { tracking: { carrier: string; number: string; url: string } };
export function orderShipped(order: ShippedOrder, opts: TextOptions = {}): EmailMessage {
  const t = texts('expedition', opts, { référence: order.reference });
  const { carrier, number, url } = order.tracking;
  const link = url.startsWith('https://') ? url : '';
  const html = layout(`
<p style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#999;">Référence : ${escapeHtml(order.reference)}</p>
<h1 style="font-family:'Crimson Pro',Georgia,serif;font-weight:400;font-size:28px;margin:8px 0;">${t.title}</h1>
${hello(t.greeting)}
${htmlParagraphs(t.body)}${personalHtml(t.personal)}
<div style="background:#F7F7F7;padding:20px;margin:24px 0;">
<p style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#999;margin:0 0 8px;">${escapeHtml(carrier)}</p>
<p style="margin:0;">Numéro de suivi : ${escapeHtml(number)}</p>
${link ? `<p style="margin:16px 0 0;"><a href="${escapeHtml(link)}" style="color:#000;">Suivre mon colis</a></p>` : ''}</div>
<div style="padding:0 0 8px;"><p style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#999;margin:0 0 8px;">Livraison</p>
<p style="margin:0;">${address(order)}</p></div>`);
  const text = [...plain(t), `Référence : ${order.reference}`, `${carrier} — numéro de suivi : ${number}`, link].filter(Boolean).join('\n');
  return { to: order.customer.email, subject: t.subject, html, text };
}

// Bienvenue (création de compte) : texte de l'ancien site conservé, sans « vestiaire de l'essentiel » (EDITORIAL.md §6).
export function welcome(to: string, origin: string, opts: TextOptions = {}): EmailMessage {
  const t = texts('bienvenue', opts);
  const html = layout(`
<h1 style="font-family:'Crimson Pro',Georgia,serif;font-weight:400;font-size:28px;margin:8px 0;">${t.title}</h1>
${hello(t.greeting)}
${htmlParagraphs(t.body)}
<p style="margin:32px 0;"><a href="${escapeHtml(`${origin}/collection`)}" style="background:#000;color:#fff;text-decoration:none;padding:16px 32px;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;">Explorer la collection</a></p>
<p style="color:#666;">« De belles matières, l'amour de l'artisanat. »</p>`);
  const text = [...plain(t), `${origin}/collection`].join('\n');
  return { to, subject: t.subject, html, text };
}

// Inscription à la newsletter (décision de Jaelle, 2026-11-04, sur le modèle épuré d'une grande maison) : remerciement
// centré, une seule grande photo d'une pièce en stock, lien vers la collection, « À bientôt. » ; pied de page gris :
// services (emballage cadeau, livraison), Instagram, contact, et la désinscription, obligatoire mais discrète.
export type MailPiece = { name: string; priceCents: number; image: string | null; url: string };
export const INSTAGRAM_URL = 'https://www.instagram.com/jaellejc/';

export function newsletterWelcome(to: string, unsubscribeUrl: string, origin: string, piece: MailPiece | null = null, opts: TextOptions = {}): EmailMessage {
  const t = texts('newsletter', opts);
  const serif = "font-family:'Crimson Pro',Georgia,serif;font-weight:400;color:#000;";
  const small = 'font-size:11px;text-transform:uppercase;letter-spacing:0.12em;';
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#F7F7F7;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F7;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;font-family:'Source Sans 3',Arial,sans-serif;font-size:14px;line-height:1.7;color:#333;text-align:center;">
<tr><td style="padding:44px 32px 8px;"><a href="${escapeHtml(origin)}"><img src="${escapeHtml(`${origin}/assets/Logo%20noir%20Jaelle%26JC_V2.png`)}" alt="Jaelle &amp; JC" width="170" style="display:inline-block;border:0;"></a></td></tr>
<tr><td style="padding:24px 40px 8px;">
<h1 style="${serif}font-size:30px;line-height:1.2;margin:0 0 20px;">${t.title}</h1>
${htmlParagraphs(t.body, 'margin:0 0 8px;', 'margin:0;')}
</td></tr>
${piece?.image ? `<tr><td style="padding:32px 32px 0;"><a href="${escapeHtml(piece.url)}"><img src="${escapeHtml(piece.image)}" alt="${escapeHtml(piece.name)}" width="536" style="display:block;width:100%;height:auto;border:0;background:#F7F7F7;"></a>
<p style="margin:12px 0 0;color:#999;font-size:13px;">${escapeHtml(piece.name)}</p></td></tr>` : ''}
<tr><td style="padding:28px 40px 0;"><p style="margin:0;color:#999;">Découvrez dès à présent <a href="${escapeHtml(`${origin}/collection`)}" style="color:#999;">la collection</a> sur jaellejc.com.</p></td></tr>
<tr><td style="padding:28px 40px 48px;"><p style="${serif}font-size:22px;margin:0;">À bientôt.</p></td></tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;font-family:'Source Sans 3',Arial,sans-serif;color:#666;text-align:center;">
<tr><td style="padding:32px 24px 8px;${serif}font-size:16px;color:#333;">Emballage cadeau avec un mot pour la naissance &nbsp;·&nbsp; Livraison à domicile en France</td></tr>
<tr><td style="padding:16px 24px;"><a href="${INSTAGRAM_URL}" style="color:#333;${small}text-decoration:none;">Instagram</a></td></tr>
<tr><td style="padding:0 24px 8px;font-size:13px;"><a href="mailto:contact@jaellejc.com" style="color:#666;">contact@jaellejc.com</a> &nbsp;·&nbsp; <a href="${escapeHtml(origin)}" style="color:#666;">jaellejc.com</a></td></tr>
<tr><td style="padding:8px 24px 40px;font-size:11px;color:#999;line-height:1.6;">Vous recevez cet e-mail à la suite de votre inscription sur jaellejc.com. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#999;">Se désinscrire</a></td></tr>
</table>
</td></tr></table></body></html>`;
  const text = [
    ...plain(t, false),
    `Découvrez dès à présent la collection : ${origin}/collection`,
    'À bientôt.',
    `Instagram : ${INSTAGRAM_URL} — contact@jaellejc.com`,
    `Se désinscrire : ${unsubscribeUrl}`,
  ].join('\n');
  return { to, subject: t.subject, html, text };
}

// Double confirmation de la newsletter (décision de Jaelle, 2026-11-05) : même cadre épuré que l'e-mail de bienvenue
// de la lettre ; un seul bouton. Rien n'est inscrit ni envoyé à Brevo avant le clic.
export function newsletterConfirmRequest(to: string, confirmUrl: string, origin: string, opts: TextOptions = {}): EmailMessage {
  const t = texts('newsletterConfirmation', opts);
  const serif = "font-family:'Crimson Pro',Georgia,serif;font-weight:400;color:#000;";
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#F7F7F7;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F7;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;font-family:'Source Sans 3',Arial,sans-serif;font-size:14px;line-height:1.7;color:#333;text-align:center;">
<tr><td style="padding:44px 32px 8px;"><a href="${escapeHtml(origin)}"><img src="${escapeHtml(`${origin}/assets/Logo%20noir%20Jaelle%26JC_V2.png`)}" alt="Jaelle &amp; JC" width="170" style="display:inline-block;border:0;"></a></td></tr>
<tr><td style="padding:24px 40px 8px;">
<h1 style="${serif}font-size:30px;line-height:1.2;margin:0 0 20px;">${t.title}</h1>
${htmlParagraphs(t.body, 'margin:0 0 8px;', 'margin:0;')}
</td></tr>
<tr><td style="padding:32px 40px 48px;"><a href="${escapeHtml(confirmUrl)}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:16px 32px;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;">Confirmer mon inscription</a></td></tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;font-family:'Source Sans 3',Arial,sans-serif;text-align:center;">
<tr><td style="padding:24px 24px 40px;font-size:11px;color:#999;line-height:1.6;">Ce lien est valable 48 heures. <a href="mailto:contact@jaellejc.com" style="color:#999;">contact@jaellejc.com</a></td></tr>
</table>
</td></tr></table></body></html>`;
  const text = [...plain(t, false), `Confirmer mon inscription : ${confirmUrl}`, 'Ce lien est valable 48 heures.'].join('\n');
  return { to, subject: t.subject, html, text };
}

// Alerte à la boutique (recherche par usage, 2026-11-04) : un plafond du site atteint ou Mistral en échec répété.
// Une seule par sorte et par jour ; jamais de phrase de cliente ni d'adresse IP.
export type SearchAlertKind = 'heure' | 'jour' | 'echecs';
const SEARCH_ALERTS: Record<SearchAlertKind, { subject: string; text: string }> = {
  heure: {
    subject: 'Recherche par usage : plafond de l’heure atteint',
    text: 'Le site a atteint 500 recherches par l’IA dans l’heure. Jusqu’à l’heure suivante, la recherche fonctionne par mots seulement.',
  },
  jour: {
    subject: 'Recherche par usage : plafond du jour atteint',
    text: 'Le site a atteint 2 000 recherches par l’IA aujourd’hui. Jusqu’à minuit (heure UTC), la recherche fonctionne par mots seulement.',
  },
  echecs: {
    subject: 'Recherche par usage : Mistral ne répond pas',
    text: 'Mistral a échoué 10 fois aujourd’hui. La recherche fonctionne par mots seulement quand Mistral ne répond pas.',
  },
};

export function searchAlert(to: string, kind: SearchAlertKind, day: string, counts: Record<string, number>, origin: string): EmailMessage {
  const a = SEARCH_ALERTS[kind];
  const rows = Object.entries(counts).map(([k, n]) => `${k} : ${n}`);
  const html = layout(`${h1(a.subject)}<p>${escapeHtml(a.text)}</p>
<p>Si ces recherches ne viennent pas de vraies personnes (robots), aucune action n’est nécessaire : la facture reste plafonnée.</p>
<p style="color:#666;">Compteurs du ${escapeHtml(day)} :<br>${rows.map(escapeHtml).join('<br>')}</p>
${button(`${origin}/atelier/reglages`, 'Voir le compteur')}`);
  const text = [a.subject, a.text, `Compteurs du ${day} :`, ...rows, `${origin}/atelier/reglages`].join('\n');
  return { to, subject: a.subject, html, text };
}

// --- Envois automatiques (lot 4) : relances de panier, « colis arrivé ? », avis à J+14 ---
// Chaque message porte un lien « ne plus recevoir ces messages » (préférence gardée côté serveur).
const followUp = (body: string, optOutUrl: string) => layout(`${body}
<p style="font-size:11px;color:#999;line-height:1.6;margin-top:40px;">Vous recevez ce message à la suite de votre visite ou de votre commande sur jaellejc.com. <a href="${escapeHtml(optOutUrl)}" style="color:#999;">Ne plus recevoir ces messages</a></p>`);
const h1 = (t: string) => `<h1 style="font-family:'Crimson Pro',Georgia,serif;font-weight:400;font-size:28px;line-height:1.2;margin:8px 0 16px;">${t}</h1>`;
const button = (href: string, label: string) =>
  `<p style="margin:32px 0;"><a href="${escapeHtml(href)}" style="background:#000;color:#fff;text-decoration:none;padding:16px 32px;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;">${label}</a></p>`;

export type ReminderLine = { name: string; variantLabel: string; image: string | null };
export function cartReminder(stage: 1 | 2 | 3, to: string, lines: ReminderLine[], origin: string, optOutUrl: string, opts: TextOptions = {}): EmailMessage {
  const t = texts(`relance${stage}`, opts);
  const list = lines.slice(0, 6).map((l) => `<tr>
<td width="72" style="padding:8px 12px 8px 0;">${l.image ? `<img src="${escapeHtml(l.image)}" alt="" width="64" style="display:block;border:0;background:#F7F7F7;">` : ''}</td>
<td style="padding:8px 0;">${escapeHtml(l.name)}${l.variantLabel ? `<br><span style="color:#666;font-size:13px;">${escapeHtml(l.variantLabel)}</span>` : ''}</td></tr>`).join('');
  const html = followUp(`${h1(t.title)}${hello(t.greeting)}${htmlParagraphs(t.body)}${personalHtml(t.personal)}
<table width="100%" cellpadding="0" cellspacing="0" style="border-top:0.5px solid #eee;margin-top:16px;">${list}</table>
${button(`${origin}/panier`, 'Retrouver ma sélection')}`, optOutUrl);
  const text = [...plain(t), ...lines.slice(0, 6).map((l) => `- ${l.name}${l.variantLabel ? ` (${l.variantLabel})` : ''}`), `${origin}/panier`, `Ne plus recevoir ces messages : ${optOutUrl}`].join('\n');
  return { to, subject: t.subject, html, text };
}

export function arrivalCheck(to: string, reference: string, optOutUrl: string, opts: TextOptions = {}): EmailMessage {
  const t = texts('arrivee', opts, { référence: reference });
  const html = followUp(`${h1(t.title)}${hello(t.greeting)}${htmlParagraphs(t.body)}`, optOutUrl);
  const text = [...plain({ ...t, personal: null }), `Ne plus recevoir ces messages : ${optOutUrl}`].join('\n');
  return { to, subject: t.subject, html, text };
}

export function reviewRequest(to: string, reference: string, optOutUrl: string, opts: TextOptions = {}): EmailMessage {
  const t = texts('avis', opts, { référence: reference });
  const html = followUp(`${h1(t.title)}${hello(t.greeting)}${htmlParagraphs(t.body)}${personalHtml(t.personal)}`, optOutUrl);
  const text = [...plain(t), `Ne plus recevoir ces messages : ${optOutUrl}`].join('\n');
  return { to, subject: t.subject, html, text };
}
