// Rapport de migration en Markdown : ce que Jaelle relit et valide avant toute écriture.
// Aucune donnée personnelle : les commandes, profils et inscriptions n'apparaissent qu'en nombres.
import type { Issue, ProductResult } from './transform.ts';

export type MigrationSummary = {
  project: string;
  mode: 'simulation' | 'écriture';
  date: string;
  categories: { oldId: string; slug: string; subs: string[] }[];
  products: ProductResult[];
  skippedProducts: string[]; // déjà migrés
  counts: Record<string, number>;
  globalIssues: Issue[];
};

// Texte du catalogue inséré dans le Markdown : HTML neutralisé, ni titre ni liste parasite en début de ligne.
export const esc = (text: string) => text
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ')
  .replace(/^([#*+-]|\d+\.)/, '\\$1');
const list = (items: string[]) => (items.length ? items.map((i) => `- ${esc(i)}`).join('\n') : '- *(vide — à compléter)*');

export function buildReport(s: MigrationSummary): string {
  const errors = s.products.filter((p) => p.issues.some((i) => i.level === 'erreur'));
  const published = s.products.filter((p) => p.newStatus === 'published');
  const lines: string[] = [
    `# Rapport de migration — ${s.project} (${s.mode})`,
    '',
    `Date : ${s.date} · Script : \`scripts/migrate-v2.ts\``,
    '',
    s.mode === 'simulation' ? '**Simulation : rien n’a été écrit dans la base.**' : '**Écriture effectuée** (sauvegarde prise juste avant).',
    '',
    '## Résumé',
    '',
    '| Élément | Nombre |',
    '|---|---|',
    `| Catégories | ${s.categories.length} |`,
    `| Produits migrés | ${s.products.length} |`,
    `| dont en ligne après migration | ${published.length} |`,
    `| dont avec erreur (remis en brouillon) | ${errors.length} |`,
    `| Produits déjà migrés (ignorés) | ${s.skippedProducts.length} |`,
    ...Object.entries(s.counts).map(([k, v]) => `| ${k} | ${v} |`),
    '',
  ];

  if (s.globalIssues.length) {
    lines.push('## Points généraux', '', ...s.globalIssues.map((i) => `- **${i.level}** : ${esc(i.message)}`), '');
  }

  lines.push('## Catégories', '', '| Ancien nom | Nouvel identifiant | Familles |', '|---|---|---|');
  for (const c of s.categories) lines.push(`| ${esc(c.oldId)} | \`${c.slug}\` | ${esc(c.subs.join(', ')) || '—'} |`);
  lines.push('');

  lines.push(
    '## Statut des produits : à décider par Jaelle',
    '',
    'Règle appliquée : un produit déjà « en ligne » le reste, tout le reste passe en brouillon. Rien n’est publié sans votre décision (`scripts/migration/decisions.json`).',
    '',
    '| Produit | Ancien statut | Après migration | Erreurs | Alertes |',
    '|---|---|---|---|---|',
  );
  for (const p of s.products) {
    const e = p.issues.filter((i) => i.level === 'erreur').length;
    const a = p.issues.filter((i) => i.level === 'alerte').length;
    lines.push(`| ${esc(p.name)} | ${p.oldStatus} | **${p.newStatus}** | ${e} | ${a} |`);
  }
  lines.push('');

  lines.push('## Fiches produit : proposition de découpage des descriptions', '');
  lines.push('Chaque description d’origine est répartie dans les sous-parties de la fiche. Aucun mot n’est inventé. Les phrases contraires à `EDITORIAL.md` sont écartées en attendant votre accord.', '');
  for (const p of s.products) {
    const pr = p.proposal;
    lines.push(
      `### ${esc(p.name)}`,
      '',
      `Identifiant \`${p.id}\` · adresse \`/produits/${String(p.write.slug)}\` · ${(Number(p.write.priceCents) / 100).toFixed(2).replace('.', ',')} € · statut **${p.newStatus}**`,
      '',
      '**Texte d’origine**',
      '',
      `> ${esc(p.original.description) || '*(aucun)*'}`,
      '',
      `**Accroche** : ${esc(pr.accroche) || '*(à écrire)*'}`,
      '',
      `**Description** : ${esc(pr.description) || '*(à écrire)*'}`,
      '',
      '**Dimensions & détails**',
      '',
      list(pr.details),
      '',
      '**Matières**',
      '',
      list(pr.materials),
      '',
      `**Entretien** : ${esc(pr.entretien) || '*(à compléter — ne jamais écrire « lavable » sans l’avoir vérifié)*'}`,
      '',
    );
    if (pr.removed.length) {
      lines.push('**Phrases écartées (à confirmer ou à justifier)**', '');
      for (const r of pr.removed) lines.push(`- « ${esc(r.phrase)} » — ${r.reason}`);
      lines.push('');
    }
    if (pr.advice.length) {
      lines.push('**Conseils de formulation (phrases gardées)**', '');
      for (const r of pr.advice) lines.push(`- « ${esc(r.phrase)} » — ${r.reason}`);
      lines.push('');
    }
    if (p.issues.length) {
      lines.push('**Contrôles**', '');
      for (const i of p.issues) lines.push(`- ${i.level} : ${esc(i.message)}`);
      lines.push('');
    }
  }
  return `${lines.join('\n')}\n`;
}
