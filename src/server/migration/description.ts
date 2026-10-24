// Découpage d'une ancienne description (un seul bloc de texte) en sous-parties de la fiche produit :
// accroche, description, « Dimensions & détails », matières, entretien.
// C'est une PROPOSITION : rien n'est inventé (seuls des morceaux du texte d'origine sont réutilisés),
// les affirmations interdites sans preuve (EDITORIAL.md §1) sont écartées et listées pour Jaelle.
import {
  DIMENSION, capitalize, formatDimension, normalizeSpaces, splitSentences, stripQuotes,
} from './text.ts';

export type ClaimFlag = {
  phrase: string;
  kind: 'retirer' | 'conseil';
  reason: string;
};

export type DescriptionProposal = {
  accroche: string;
  description: string;
  details: string[];
  materials: string[];
  entretien: string;
  removed: ClaimFlag[]; // phrases écartées de la proposition, en attente de l'accord de Jaelle
  advice: ClaimFlag[]; // phrases conservées, avec une suggestion de formulation
  toComplete: string[]; // champs restés vides
};

const CLAIMS: { pattern: RegExp; kind: ClaimFlag['kind']; reason: string }[] = [
  {
    pattern: /[ée]co-?responsable|[ée]cologique|respectueu(?:x|se) de l.environnement|consommation responsable|mode responsable|\bdurables?\b|z[ée]ro d[ée]chet|\bvert(?:e|es)?\b/iu,
    kind: 'retirer',
    reason: 'Promesse environnementale générale : interdite sans preuve précise (EDITORIAL.md §1, loi Climat et résilience).',
  },
  {
    pattern: /labellis|certifi|oeko|\bgots\b|\bbio\b|biologique/iu,
    kind: 'retirer',
    reason: 'Label ou certification : citer le label exact avec sa preuve, sinon retirer (EDITORIAL.md §1).',
  },
  {
    pattern: /lavable|lavage|passe en machine|\bmachine\b/iu,
    kind: 'retirer',
    reason: '« Lavable » est à confirmer avant d’être écrit (EDITORIAL.md §1).',
  },
  {
    pattern: /hypoallerg|sans produits? chimiques?|non toxique|antibact/iu,
    kind: 'retirer',
    reason: 'Allégation de santé : interdite sans preuve.',
  },
  {
    pattern: /made in france|fabriqu[ée]e?s? (?:avec soin )?en france|fabrication fran[çc]aise|savoir-faire local/iu,
    kind: 'conseil',
    reason: 'Origine exacte mais vague : préférer « cousu main dans notre atelier d’Île-de-France ».',
  },
  {
    pattern: /!/u,
    kind: 'conseil',
    reason: 'Ton : pas de point d’exclamation (EDITORIAL.md §1).',
  },
];

const MATERIALS = [
  'double gaze de coton', 'gaze de coton', 'éponge de bambou', 'éponge de coton', 'éponge', 'nid d’abeille',
  'jersey', 'lin', 'velours', 'laine', 'coton',
];

// Introduction d'une liste : « …, ce coffret contient : » (la liste suit).
const LIST_SEPARATOR = /\s[-–•]\s|\n\s*[-–•]\s*/u;
const SECTION_HEADING = /^(?:pourquoi choisir[^?]*\?)\s*/iu;
const CARE = /^(?:laver|lavage à|ne pas (?:blanchir|laver|sécher|repasser)|repassage|séchage|nettoyage à sec)|ne pas blanchir|ne pas sécher en tambour/iu;

function flagsFor(sentence: string): ClaimFlag[] {
  return CLAIMS.filter((c) => c.pattern.test(sentence)).map((c) => ({ phrase: sentence, kind: c.kind, reason: c.reason }));
}

function itemLabel(item: string): string {
  // « Un lange pour bébé en tissu doux, idéal pour… » → « Un lange pour bébé en tissu doux »
  const first = item.split(/[,.;]/u)[0] ?? item;
  return capitalize(normalizeSpaces(first));
}

function accrocheFromIntro(intro: string): string {
  const text = normalizeSpaces(intro).replace(/\s*:$/u, '');
  if (!/:\s*$/u.test(intro.trim())) return '';
  // « Conçu pour accompagner…, ce coffret contient » → « Conçu pour accompagner… »
  const cut = text.lastIndexOf(',');
  return cut > 0 ? `${text.slice(0, cut).trim()}.` : '';
}

function splitMaterials(raw: string): string[] {
  return raw
    .split(/[,;/&+]|\bet\b/iu)
    .map((m) => normalizeSpaces(m).toLocaleLowerCase('fr-FR'))
    .filter((m) => m.length > 1);
}

function detectMaterials(text: string): string[] {
  const lower = text.toLocaleLowerCase('fr-FR').replace(/'/g, '’');
  const found: string[] = [];
  for (const material of MATERIALS) {
    // Mot entier : « lin » ne doit pas être trouvé dans « lingettes ».
    const whole = new RegExp(`(^|[^\\p{L}])${material}([^\\p{L}]|$)`, 'u');
    if (whole.test(lower) && !found.some((f) => f.includes(material))) found.push(material);
  }
  return found;
}

export function splitDescription(input: {
  description?: unknown;
  matieres?: unknown;
  dimensions?: unknown;
  entretien?: unknown;
}): DescriptionProposal {
  const original = typeof input.description === 'string' ? stripQuotes(input.description) : '';
  const details: string[] = [];
  let intro = original;
  let body = '';

  const parts = original.split(LIST_SEPARATOR);
  if (parts.length > 1) {
    intro = parts[0] ?? '';
    let lastItem: number | null = null;
    for (let i = 1; i < parts.length; i += 1) {
      const part = normalizeSpaces(parts[i] ?? '');
      const dim = part.match(DIMENSION);
      if (dim && dim.index === 0) {
        const value = formatDimension(dim);
        if (lastItem !== null) details[lastItem] = `${details[lastItem]} : ${value}`;
        else details.push(value);
        lastItem = null;
        const rest = part.slice(dim[0].length).trim();
        if (rest) {
          // Fin de liste : le texte qui suit la dernière dimension est le corps de la description.
          body = [rest, ...parts.slice(i + 1)].join(' - ');
          break;
        }
      } else if (part) {
        details.push(itemLabel(part));
        lastItem = details.length - 1;
      }
    }
  } else {
    intro = '';
    body = original;
  }

  // Dimensions de l'ancien champ dédié, si elles ne figurent pas déjà dans la liste.
  // « 35*56*38 cm - 60 cm hauteur des sangles » : une ligne par élément.
  if (typeof input.dimensions === 'string' && normalizeSpaces(input.dimensions)) {
    for (const piece of normalizeSpaces(input.dimensions).split(/\s+-\s+/u)) {
      const dim = piece.match(DIMENSION);
      const line = capitalize(dim ? piece.replace(DIMENSION, formatDimension(dim)) : piece);
      if (line && !details.some((d) => d.includes(dim ? formatDimension(dim) : line))) details.push(line);
    }
  }

  let accroche = accrocheFromIntro(intro);
  const kept: string[] = [];
  const care: string[] = [];
  const removed: ClaimFlag[] = [];
  const advice: ClaimFlag[] = [];

  const bodySentences = splitSentences(body.replace(SECTION_HEADING, ''))
    .flatMap((s) => splitSentences(s.replace(SECTION_HEADING, '')))
    .flatMap((s) => {
      // « … ? Pratique et… » : un intertitre-question au milieu d'une phrase est retiré.
      const pieces = s.split(/(?<=\?)\s+/u);
      return pieces.filter((p) => !SECTION_HEADING.test(p));
    });
  // Si l'introduction n'annonce pas une liste, elle fait partie du texte.
  const introSentences = accroche || !intro ? [] : splitSentences(intro);

  for (const sentence of [...introSentences, ...bodySentences]) {
    // Consignes d'entretien écrites par Jaelle (« Laver à 30° / Ne pas blanchir… ») : rubrique Entretien.
    if (CARE.test(sentence)) {
      care.push(sentence);
      continue;
    }
    const flags = flagsFor(sentence);
    if (flags.some((f) => f.kind === 'retirer')) removed.push(...flags.filter((f) => f.kind === 'retirer'));
    else {
      kept.push(sentence);
      advice.push(...flags);
    }
  }

  // Sans phrase d'introduction de liste : une première phrase courte sert d'accroche.
  if (!accroche && kept.length >= 2 && kept[0]!.length <= 120) accroche = kept.shift()!;

  const matieresField = typeof input.matieres === 'string' ? splitMaterials(input.matieres) : [];
  const materials = matieresField.length ? matieresField : detectMaterials(original);
  for (const m of materials) {
    if (/\bgaz\b/u.test(m)) advice.push({ phrase: m, kind: 'conseil', reason: 'Orthographe : sans doute « gaze de coton ».' });
  }
  const entretienRaw = typeof input.entretien === 'string' ? normalizeSpaces(input.entretien) : '';
  const entretienFlags = entretienRaw ? flagsFor(entretienRaw).filter((f) => f.kind === 'retirer') : [];
  removed.push(...entretienFlags);
  const entretien = [entretienFlags.length ? '' : entretienRaw, ...care].filter(Boolean).join(' ');

  const description = kept.join(' ').replace(/([^.?!…])$/u, '$1.');
  const proposal = { accroche, description, details, materials, entretien };
  const toComplete = (Object.keys(proposal) as (keyof typeof proposal)[]).filter((k) => {
    const v = proposal[k];
    return Array.isArray(v) ? v.length === 0 : !v;
  });

  return { ...proposal, removed, advice, toComplete };
}
