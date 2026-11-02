// E-mails du parcours d'achat (EDITORIAL.md §6), purs et testés. Tout texte venu d'une cliente ou de la base
// (nom, adresse, mot pour la naissance, noms des pièces) est échappé avant d'entrer dans le HTML.
// Style repris de l'e-mail de confirmation de l'ancien site, typographie « Atelier » (droit, 11 px au moins).
import type { NewOrder } from '../checkout/logic';

export type EmailMessage = { to: string; subject: string; html: string; text: string };
type MailOrder = Omit<NewOrder, 'tracking'>;

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

// Objet d'e-mail : une seule ligne (aucun saut de ligne injectable dans les en-têtes).
const oneLine = (value: string) => value.replace(/[\r\n]+/g, ' ').trim();

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

const address = (order: MailOrder) => [order.customer.name, order.shipping.line1, order.shipping.line2,
  `${order.shipping.zipCode} ${order.shipping.city}`.trim()].filter(Boolean).map(escapeHtml).join('<br>');

function giftBlock(order: MailOrder) {
  if (!order.gift.wrap) return '';
  const message = order.gift.message
    ? `<p style="margin:8px 0 0;">« ${escapeHtml(order.gift.message).replace(/\r?\n/g, '<br>')} »</p>` : '';
  return `<div style="border-left:0.5px solid #000;padding:4px 0 4px 20px;margin:24px 0;">
<p style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#999;margin:0;">Emballage cadeau</p>${message}</div>`;
}

export function orderConfirmation(order: MailOrder): EmailMessage {
  const html = layout(`
<p style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#999;">Commande confirmée</p>
<h1 style="font-family:'Crimson Pro',Georgia,serif;font-weight:400;font-size:28px;margin:8px 0;">Merci pour votre commande.</h1>
<p style="color:#666;">Référence : ${escapeHtml(order.reference)}</p>
<p>Bonjour ${escapeHtml(order.customer.name || '')},</p>
<p style="color:#666;">Nous préparons votre sélection avec le plus grand soin. Voici le détail de votre commande :</p>
${itemsTable(order)}${giftBlock(order)}
<div style="background:#F7F7F7;padding:20px;margin-top:24px;">
<p style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#999;margin:0 0 8px;">Livraison</p>
<p style="margin:0;">${address(order)}</p></div>`);
  const text = [`Merci pour votre commande ${order.reference}.`, ...order.items.map((i) => `${i.quantity} × ${i.name} : ${euros(i.unitPriceCents * i.quantity)} €`),
    `Total : ${euros(order.amounts.totalCents)} €`].join('\n');
  return { to: order.customer.email, subject: oneLine(`Votre commande Jaelle & JC — ${order.reference}`), html, text };
}

export function stockApology(order: MailOrder): EmailMessage {
  const stock = order.refund?.reason !== 'montant';
  const html = layout(`
<h1 style="font-family:'Crimson Pro',Georgia,serif;font-weight:400;font-size:28px;margin:8px 0;">${stock ? 'Votre pièce a trouvé preneur.' : 'Votre commande n’a pas pu aboutir.'}</h1>
<p>Bonjour ${escapeHtml(order.customer.name || '')},</p>
<p>${stock ? 'Pendant votre paiement, la dernière pièce disponible a été commandée.' : 'Un problème est survenu pendant votre paiement.'} Nous sommes sincèrement désolées.</p>
<p>Votre paiement de ${euros(order.amounts.totalCents)} € vous est intégralement remboursé. Le remboursement apparaît sur votre relevé sous quelques jours, selon votre banque.</p>
<p style="color:#666;">Référence : ${escapeHtml(order.reference)}</p>`);
  const text = `Votre pièce a trouvé preneur pendant votre paiement. Vos ${euros(order.amounts.totalCents)} € vous sont intégralement remboursés. Référence : ${order.reference}.`;
  return { to: order.customer.email, subject: oneLine(`Votre commande Jaelle & JC — ${order.reference} : remboursement`), html, text };
}

export function shopNotification(order: MailOrder, shopEmail: string): EmailMessage {
  const refunded = order.status === 'refunded';
  const html = layout(`
<h1 style="font-family:'Crimson Pro',Georgia,serif;font-weight:400;font-size:24px;margin:8px 0;">${refunded ? 'Commande remboursée automatiquement' : 'Nouvelle commande'}</h1>
<p>Référence : ${escapeHtml(order.reference)}${refunded ? ` — motif : ${order.refund?.reason === 'stock' ? 'stock insuffisant' : 'montant inattendu'}` : ''}</p>
${itemsTable(order)}${giftBlock(order)}
<p>${address(order)}<br>Téléphone : ${escapeHtml(order.customer.phone || 'non renseigné')}<br>E-mail : ${escapeHtml(order.customer.email)}</p>`);
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
export function orderPreparing(order: MailOrder): EmailMessage {
  const html = layout(`
<p style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#999;">Référence : ${escapeHtml(order.reference)}</p>
<h1 style="font-family:'Crimson Pro',Georgia,serif;font-weight:400;font-size:28px;margin:8px 0;">Votre commande est en préparation.</h1>
<p>Bonjour ${escapeHtml(order.customer.name || '')},</p>
<p>Votre sélection est en préparation à l'atelier. Nous vous écrirons dès son départ, avec le numéro de suivi du colis.</p>
${itemsTable(order)}${giftBlock(order)}`);
  const text = `Votre commande ${order.reference} est en préparation à l'atelier. Nous vous écrirons dès son départ, avec le numéro de suivi du colis.`;
  return { to: order.customer.email, subject: oneLine(`Votre commande Jaelle & JC — ${order.reference} : en préparation`), html, text };
}

// Colis remis au transporteur (EDITORIAL.md §6) : numéro de suivi recopié par Jaelle et lien du transporteur.
export type ShippedOrder = Omit<NewOrder, 'tracking'> & { tracking: { carrier: string; number: string; url: string } };
export function orderShipped(order: ShippedOrder): EmailMessage {
  const { carrier, number, url } = order.tracking;
  const link = url.startsWith('https://') ? url : '';
  const html = layout(`
<p style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#999;">Référence : ${escapeHtml(order.reference)}</p>
<h1 style="font-family:'Crimson Pro',Georgia,serif;font-weight:400;font-size:28px;margin:8px 0;">Votre colis est en route.</h1>
<p>Bonjour ${escapeHtml(order.customer.name || '')},</p>
<p>Votre commande vient de partir de l'atelier.</p>
<div style="background:#F7F7F7;padding:20px;margin:24px 0;">
<p style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#999;margin:0 0 8px;">${escapeHtml(carrier)}</p>
<p style="margin:0;">Numéro de suivi : ${escapeHtml(number)}</p>
${link ? `<p style="margin:16px 0 0;"><a href="${escapeHtml(link)}" style="color:#000;">Suivre mon colis</a></p>` : ''}</div>
<div style="padding:0 0 8px;"><p style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#999;margin:0 0 8px;">Livraison</p>
<p style="margin:0;">${address(order)}</p></div>`);
  const text = [`Votre colis est en route (${order.reference}).`, `${carrier} — numéro de suivi : ${number}`, link].filter(Boolean).join('\n');
  return { to: order.customer.email, subject: oneLine(`Votre colis est en route — ${order.reference}`), html, text };
}

// Bienvenue (création de compte) : texte de l'ancien site conservé, sans « vestiaire de l'essentiel » (EDITORIAL.md §6).
export function welcome(to: string, origin: string): EmailMessage {
  const html = layout(`
<h1 style="font-family:'Crimson Pro',Georgia,serif;font-weight:400;font-size:28px;margin:8px 0;">Bienvenue à l'Atelier</h1>
<p>Bonjour,</p>
<p>Nous sommes ravis de vous compter parmi nous. L'Atelier Jaelle &amp; JC est né d'une envie simple : que chaque pièce raconte une histoire de transmission et de savoir-faire français.</p>
<p style="margin:32px 0;"><a href="${escapeHtml(`${origin}/collection`)}" style="background:#000;color:#fff;text-decoration:none;padding:16px 32px;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;">Explorer la collection</a></p>
<p style="color:#666;">« De belles matières, l'amour de l'artisanat. »</p>`);
  const text = `Bienvenue à l'Atelier.\nNous sommes ravis de vous compter parmi nous. L'Atelier Jaelle & JC est né d'une envie simple : que chaque pièce raconte une histoire de transmission et de savoir-faire français.\n${origin}/collection`;
  return { to, subject: "Bienvenue dans l'univers Jaelle & JC", html, text };
}

// Inscription à la newsletter : confirmation et lien de désinscription (un clic, puis confirmation sur le site).
export function newsletterWelcome(to: string, unsubscribeUrl: string): EmailMessage {
  const html = layout(`
<h1 style="font-family:'Crimson Pro',Georgia,serif;font-weight:400;font-size:28px;margin:8px 0;">Merci pour votre inscription.</h1>
<p>Vous recevrez la lettre de Jaelle &amp; JC une fois par mois : les nouvelles pièces et les coulisses de l'atelier.</p>
<p style="color:#666;font-size:13px;margin-top:32px;">Vous pouvez vous désinscrire à tout moment : <a href="${escapeHtml(unsubscribeUrl)}" style="color:#666;">se désinscrire</a>.</p>`);
  const text = `Merci pour votre inscription. Vous recevrez la lettre de Jaelle & JC une fois par mois : les nouvelles pièces et les coulisses de l'atelier.\nSe désinscrire : ${unsubscribeUrl}`;
  return { to, subject: 'Votre inscription à la lettre Jaelle & JC', html, text };
}
