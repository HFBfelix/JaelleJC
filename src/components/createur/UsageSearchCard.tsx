import type { UsageDay } from '@/server/catalog/usage-service';
import { USAGE_LIMITS } from '@/server/catalog/usage-search';
import { Card, label, missingText } from './ui';

const ROWS = [
  ['ia', 'Recherches faites par l’IA'],
  ['memoire', 'Réponses resservies de mémoire (sans appel)'],
  ['refus-visiteur', `Refus : plus de ${USAGE_LIMITS.parVisiteurHeure} recherches par heure pour un visiteur`],
  ['refus-heure', `Refus : plafond du site atteint (${USAGE_LIMITS.siteHeure} par heure)`],
  ['refus-jour', `Refus : plafond du site atteint (${USAGE_LIMITS.siteJour} par jour)`],
  ['echec', 'Mistral n’a pas répondu'],
] as const;
const ALERTS = { heure: 'plafond de l’heure', jour: 'plafond du jour', echecs: 'échecs de Mistral' } as const;

// Réglages de l'Atelier : compteur de la recherche par usage (aujourd'hui, hier). Beaucoup de refus « visiteur » ou
// de plafonds atteints : probablement des robots ; la facture reste plafonnée, la recherche par mots reste ouverte.
export default function UsageSearchCard({ days }: { days: UsageDay[] }) {
  return (
    <section aria-label="Recherche par usage">
      <Card className="mt-8">
        <h2 className={`${label} mb-4`}>Recherche par usage (IA)</h2>
        <p className="text-[14px] text-neutral-600 mb-6">
          Quand les mots seuls ne trouvent rien, l’IA choisit les pièces qui conviennent à la phrase. Les refus et les échecs
          laissent la recherche par mots fonctionner. Jour compté en heure UTC.
        </p>
        <table className="w-full text-[14px]">
          <thead>
            <tr className={label}>
              <th className="text-left font-normal pb-2" />
              {days.map((d, i) => <th key={d.day} className="text-right font-normal pb-2">{i === 0 ? 'Aujourd’hui' : 'Hier'}</th>)}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([key, text]) => (
              <tr key={key} className="border-t-[0.5px] border-neutral-200">
                <td className="py-2 pr-4">{text}</td>
                {days.map((d) => <td key={d.day} className="py-2 text-right tabular-nums">{d.counts[key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {days.map((d, i) => d.alertes.length > 0 && (
          <p key={d.day} className={`text-[13px] ${missingText} mt-4`}>
            {i === 0 ? 'Aujourd’hui' : 'Hier'} : alerte envoyée ({d.alertes.map((a) => ALERTS[a]).join(', ')}).
          </p>
        ))}
      </Card>
    </section>
  );
}
