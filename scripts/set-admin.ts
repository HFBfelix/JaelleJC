// Pose (ou retire) le droit administrateur `admin: true` sur un compte existant (BACKOFFICE.md §6.5).
//   node scripts/set-admin.ts --project demo-jaellejc --email admin@exemple.test
//   node scripts/set-admin.ts --project jaellejc-staging --email <e-mail> [--remove]
// Le compte doit se reconnecter pour que le droit soit pris en compte.
import { arg, connect, flag } from './lib/admin.ts';

const email = arg('email');
if (!email) throw new Error('Préciser --email.');
const { auth } = connect(arg('project'));

const user = await auth.getUserByEmail(email);
const claims = { ...(user.customClaims ?? {}) };
if (flag('remove')) delete claims.admin;
else claims.admin = true;
await auth.setCustomUserClaims(user.uid, claims);
await auth.revokeRefreshTokens(user.uid); // force une reconnexion
console.log(`${flag('remove') ? 'Droit admin retiré' : 'Droit admin posé'} pour ${email}.`);
