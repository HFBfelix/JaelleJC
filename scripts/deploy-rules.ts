// Publie firestore.rules sur le projet de test, avec le seul droit « Administrateur des règles Firebase »
// du compte technique (pas besoin des droits supplémentaires que demande Firebase CLI).
//   node scripts/deploy-rules.ts --project jaellejc-staging
// Jamais la production : ses règles sont déployées par Jaelle, à la bascule (SECURITE.md §2).
import { readFileSync } from 'node:fs';
import { getSecurityRules } from 'firebase-admin/security-rules';
import { getApps } from 'firebase-admin/app';
import { EMULATOR, PRODUCTION, arg, connect } from './lib/admin.ts';

const project = arg('project');
if (project === PRODUCTION) throw new Error('Les règles de production sont déployées par Jaelle, à la bascule.');
if (project === EMULATOR) throw new Error('L’émulateur lit firestore.rules directement : rien à publier.');
connect(project);

const source = readFileSync('firestore.rules', 'utf8');
const ruleset = await getSecurityRules(getApps()[0]).releaseFirestoreRulesetFromSource(source);
console.log(`Règles Firestore publiées sur ${project} (jeu de règles ${ruleset.name.split('/').pop()}).`);
