// Textes réglables des e-mails aux clientes (lot 5) : objet, titre et texte de chaque e-mail, modifiables dans
// l'Atelier → Réglages. Les valeurs par défaut sont les textes d'EDITORIAL.md §6. Le reste de l'e-mail (détail de la
// commande, adresse, suivi, boutons, liens de désinscription) reste fixe. Pur et testé.
// Le lien de connexion et l'alerte à la boutique ne sont pas réglables.
import { z } from 'zod';

export const EMAIL_KINDS = [
  'confirmation', 'excuses', 'preparation', 'expedition', 'bienvenue', 'newsletter',
  'relance1', 'relance2', 'relance3', 'arrivee', 'avis',
] as const;
export type EmailKind = (typeof EMAIL_KINDS)[number];

export type EmailText = { subject: string; title: string; body: string; personal: boolean };

// `vars` : mots entre accolades remplacés à l'envoi. `personal` : paragraphe personnalisé par Mistral proposé
// (null : jamais pour cet e-mail, faute de pièces à décrire ou parce qu'il part pendant le paiement).
type Definition = { label: string; vars: readonly string[]; personal: boolean | null; defaults: Omit<EmailText, 'personal'> };

export const EMAIL_DEFINITIONS: Record<EmailKind, Definition> = {
  confirmation: {
    label: 'Confirmation de commande', vars: ['référence'], personal: null,
    defaults: {
      subject: 'Votre commande Jaelle & JC — {référence}',
      title: 'Merci pour votre commande.',
      body: 'Nous préparons votre sélection avec le plus grand soin. Voici le détail de votre commande :',
    },
  },
  excuses: {
    label: 'Pièce partie pendant le paiement (remboursement)', vars: ['référence'], personal: null,
    defaults: {
      subject: 'Votre commande Jaelle & JC — {référence} : remboursement',
      title: 'Votre pièce a trouvé preneur.',
      body: 'Pendant votre paiement, la dernière pièce disponible a été commandée. Nous sommes sincèrement désolées.',
    },
  },
  preparation: {
    label: 'Commande en préparation', vars: ['référence'], personal: true,
    defaults: {
      subject: 'Votre commande Jaelle & JC — {référence} : en préparation',
      title: 'Votre commande est en préparation.',
      body: "Votre sélection est en préparation à l'atelier. Nous vous écrirons dès son départ, avec le numéro de suivi du colis.",
    },
  },
  expedition: {
    label: 'Colis en route', vars: ['référence'], personal: true,
    defaults: {
      subject: 'Votre colis est en route — {référence}',
      title: 'Votre colis est en route.',
      body: "Votre commande vient de partir de l'atelier.",
    },
  },
  bienvenue: {
    label: 'Bienvenue (création du compte)', vars: [], personal: null,
    defaults: {
      subject: "Bienvenue dans l'univers Jaelle & JC",
      title: "Bienvenue à l'Atelier",
      body: "Nous sommes ravis de vous compter parmi nous. L'Atelier Jaelle & JC est né d'une envie simple : que chaque pièce raconte une histoire de transmission et de savoir-faire français.",
    },
  },
  newsletter: {
    label: 'Inscription à la newsletter', vars: [], personal: null,
    defaults: {
      subject: 'Bienvenue dans la lettre Jaelle & JC',
      title: 'Bienvenue',
      body: "Nous vous remercions de votre inscription à la lettre Jaelle & JC et de l'intérêt que vous portez à notre atelier.\n\nChaque pièce y est cousue main, en Île-de-France, en petite série. Nous vous écrirons quelques fois par an, quand une nouvelle pièce sort de l'atelier.",
    },
  },
  relance1: {
    label: 'Relance du panier — 1 jour', vars: [], personal: true,
    defaults: {
      subject: 'Votre sélection vous attend',
      title: 'Votre sélection vous attend.',
      body: 'Vous avez laissé quelques pièces dans votre sélection. Elle vous attend, telle que vous l’avez laissée.',
    },
  },
  relance2: {
    label: 'Relance du panier — 3 jours', vars: [], personal: true,
    defaults: {
      subject: 'Votre sélection est toujours là',
      title: 'Votre sélection est toujours là.',
      body: 'Nos pièces sont cousues main, en petite série : votre sélection vous attend encore quelques jours.',
    },
  },
  relance3: {
    label: 'Relance du panier — 5 jours', vars: [], personal: true,
    defaults: {
      subject: 'Votre sélection sera retirée dans 2 jours',
      title: 'Votre sélection sera retirée dans 2 jours.',
      body: 'Sans commande de votre part, les pièces de votre sélection seront retirées dans 2 jours.',
    },
  },
  arrivee: {
    label: '« Votre colis est-il bien arrivé ? »', vars: ['référence'], personal: null,
    defaults: {
      subject: 'Votre colis est-il bien arrivé ? — {référence}',
      title: 'Votre colis est-il bien arrivé ?',
      body: "Votre commande {référence} est partie de l'atelier il y a quelques jours. Est-elle bien arrivée ?\n\nEn cas de souci, répondez simplement à cet e-mail : nous nous en occupons.",
    },
  },
  avis: {
    label: 'Demande d’avis (14 jours après la livraison)', vars: ['référence'], personal: true,
    defaults: {
      subject: 'Comment se passe la vie avec votre pièce ?',
      title: 'Comment se passe la vie avec votre pièce ?',
      body: "Il y a deux semaines, votre commande {référence} arrivait chez vous. Nous aimerions savoir comment elle a été accueillie.\n\nRépondez simplement à cet e-mail : chaque mot est lu à l'atelier.",
    },
  },
};

export const defaultText = (kind: EmailKind): EmailText =>
  ({ ...EMAIL_DEFINITIONS[kind].defaults, personal: EMAIL_DEFINITIONS[kind].personal === true });

export type EmailTexts = Record<EmailKind, EmailText>;
export const defaultTexts = (): EmailTexts =>
  Object.fromEntries(EMAIL_KINDS.map((k) => [k, defaultText(k)])) as EmailTexts;

// Saisie de l'Atelier. Objet sur une seule ligne (aucun en-tête injectable).
export const emailTextInput = z.strictObject({
  kind: z.enum(EMAIL_KINDS),
  subject: z.string().trim().min(1).max(150).regex(/^[^\r\n]*$/),
  title: z.string().trim().min(1).max(150).regex(/^[^\r\n]*$/),
  body: z.string().trim().min(1).max(2000),
  personal: z.boolean(),
});

// Mots entre accolades inconnus pour cet e-mail (fautes de frappe : refusées à l'enregistrement).
export function unknownVars(kind: EmailKind, ...values: string[]): string[] {
  const allowed = EMAIL_DEFINITIONS[kind].vars;
  const found = values.flatMap((v) => [...v.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]!));
  return [...new Set(found.filter((name) => !allowed.includes(name)))];
}

// Textes enregistrés relus : un texte abîmé ou absent revient au texte par défaut ; le paragraphe personnalisé
// n'est jamais activé pour un e-mail qui ne le propose pas.
const stored = emailTextInput.omit({ kind: true });
export function resolveTexts(raw: unknown): EmailTexts {
  const saved = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return Object.fromEntries(EMAIL_KINDS.map((kind) => {
    const parsed = stored.safeParse(saved[kind]);
    const text = parsed.success && !unknownVars(kind, parsed.data.subject, parsed.data.title, parsed.data.body).length
      ? parsed.data : defaultText(kind);
    return [kind, { ...text, personal: EMAIL_DEFINITIONS[kind].personal !== null && text.personal }];
  })) as EmailTexts;
}

export const fillVars = (value: string, vars: Partial<Record<string, string>>) =>
  value.replace(/\{([^{}]*)\}/g, (all, name: string) => vars[name] ?? all);
