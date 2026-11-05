import type { Metadata } from 'next';
import Link from 'next/link';

// Rendu repris de legacy/src/pages/legal/PrivacyPolicy.tsx (typographie « Atelier »). Texte mis à jour pour la refonte :
// l'ancien texte affirmait que les données n'étaient « jamais communiquées à des tiers », ce qui n'est plus exact
// (paiement, e-mails, hébergement, vérification d'adresse). Chaque ligne correspond au code : durées et destinataires
// relevés dans src/server (panier 7 jours, session 5 jours, demande de newsletter 48 h, commandes 10 ans…).
export const metadata: Metadata = {
  title: 'Politique de confidentialité | Jaelle & JC',
  description: 'Les données que Jaelle & JC traite, pourquoi, pour combien de temps, avec qui elles sont partagées et comment exercer vos droits.',
  alternates: { canonical: '/confidentialite' },
};

const h2 = 'font-sans text-[11px] uppercase tracking-[0.12em] font-bold text-black mb-4';
const link = 'underline';

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-white pt-32 pb-24 px-6 font-sans antialiased text-justify">
      <div className="max-w-3xl mx-auto text-[14px] text-neutral-600 leading-relaxed">
        <h1 className="font-serif text-3xl mb-12 text-black">Politique de confidentialité</h1>

        <section className="mb-10">
          <p className="mb-6">
            L’entreprise <strong>Jaelle &amp; JC</strong> s’engage à traiter les données personnelles collectées en conformité avec la
            règlementation en vigueur (RGPD et loi Informatique et Libertés). Elle ne collecte que ce qui est nécessaire à votre commande,
            à votre compte et aux échanges que vous avez choisis, et obtient votre consentement chaque fois que la loi l’exige
            (mesure d’audience, lettre d’information).
          </p>
        </section>

        <section className="mb-10">
          <h2 className={h2}>Les données traitées et pourquoi</h2>
          <ul className="list-disc pl-5 space-y-3">
            <li><strong>Votre compte</strong> : adresse e-mail, et si vous les donnez civilité, prénom, nom et téléphone, pour vous connecter, préparer et suivre vos commandes, vous joindre au sujet d’une livraison.</li>
            <li><strong>Vos adresses</strong> : seulement celles que vous choisissez d’enregistrer, pour la livraison.</li>
            <li><strong>Vos commandes</strong> : pièces, montants, adresse de livraison, message cadeau, suivi du colis. Le paiement par carte est traité par Stripe : nous ne voyons ni ne gardons jamais votre numéro de carte.</li>
            <li><strong>Votre sélection (panier)</strong> : les pièces choisies, rattachées à votre navigateur ou à votre compte.</li>
            <li><strong>Vos messages</strong> : le formulaire de contact (nom, e-mail, message), pour vous répondre.</li>
            <li><strong>La lettre d’information</strong> : votre e-mail, seulement après votre confirmation par le lien reçu (double confirmation).</li>
            <li><strong>Les e-mails liés à votre compte</strong> : confirmation et suivi de commande ; rappel d’une sélection laissée en attente, question sur la bonne arrivée du colis et demande d’avis. Chacun de ces trois derniers contient un lien pour ne plus les recevoir.</li>
            <li><strong>La recherche par usage</strong> : la phrase tapée dans la recherche de la collection peut être transmise à Mistral AI pour trouver les pièces qui conviennent ; elle n’est ni enregistrée ni rattachée à votre personne.</li>
            <li><strong>La sécurité du site</strong> : une empreinte de votre adresse IP (jamais l’adresse elle-même) sert à limiter les envois abusifs de formulaires.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className={h2}>Avec qui elles sont partagées</h2>
          <p className="mb-4">Vos données ne sont ni vendues ni louées. Elles sont confiées aux seuls prestataires nécessaires au fonctionnement du site :</p>
          <ul className="list-disc pl-5 space-y-3">
            <li><strong>Google (Firebase)</strong> : hébergement des comptes, des commandes et des photos des pièces ; <strong>Vercel</strong> : hébergement du site.</li>
            <li><strong>Stripe</strong> : paiement par carte.</li>
            <li><strong>Brevo</strong> : envoi des e-mails et de la lettre d’information (données traitées en Europe).</li>
            <li><strong>Base Adresse Nationale</strong> (service public de l’État) : l’adresse de livraison que vous tapez lui est envoyée pour vérifier qu’elle existe.</li>
            <li><strong>Mistral AI</strong> (données traitées en Europe) : la phrase de la recherche par usage, et, pour certains e-mails, la description publique des pièces commandées ; jamais votre nom, votre adresse ni votre e-mail.</li>
            <li><strong>Le transporteur</strong> : nom, adresse et téléphone du destinataire, pour la livraison.</li>
          </ul>
          <p className="mt-4">Elles peuvent aussi être communiquées si la loi l’impose (demande d’une autorité, protection de nos droits).</p>
        </section>

        <section className="mb-10">
          <h2 className={h2}>Combien de temps</h2>
          <ul className="list-disc pl-5 space-y-3">
            <li>Compte, coordonnées et adresses : jusqu’à la suppression de votre compte, que vous pouvez faire vous-même depuis <Link href="/compte/donnees" className={link}>Mon compte → Mes données</Link>.</li>
            <li>Commandes : 10 ans (obligation comptable). À la suppression du compte, elles sont gardées sans lien avec lui.</li>
            <li>Sélection (panier) : 7 jours après votre dernière visite.</li>
            <li>Demande d’inscription à la lettre non confirmée : 48 heures. Inscription confirmée : jusqu’à votre désinscription, possible depuis chaque lettre.</li>
            <li>Messages du formulaire de contact : gardés pour suivre votre demande, jusqu’à ce que vous en demandiez la suppression à contact@jaellejc.com.</li>
            <li>Journal de l’espace d’administration : les gestes sensibles (dont la suppression d’un compte) y sont notés avec un identifiant technique, sans votre e-mail.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className={h2}>Cookies et traceurs</h2>
          <p className="mb-4">
            Conformément aux recommandations de la CNIL, certains cookies sont dispensés du recueil préalable de consentement, lorsqu’ils sont
            strictement nécessaires au fonctionnement du site. C’est le cas du cookie de session (connexion à votre compte, 5 jours) et du cookie
            de votre sélection (7 jours). Votre navigateur garde aussi, sur votre appareil seulement, votre choix sur les cookies et, le temps
            d’ouvrir le lien de connexion reçu par e-mail, l’adresse à laquelle il a été envoyé.
          </p>
          <p className="mb-4">
            La mesure d’audience (Google Analytics) ne se charge qu’après votre accord, donné par « Tout accepter » dans le bandeau. « Continuer
            sans accepter » ne dépose aucun traceur.
          </p>
          <p>
            Vous pouvez aussi paramétrer, bloquer ou supprimer les cookies depuis votre navigateur, selon les préconisations de la CNIL :{' '}
            <a href="https://www.cnil.fr/fr/cookies-les-outils-pour-les-maitriser" className={link}>https://www.cnil.fr/fr/cookies-les-outils-pour-les-maitriser</a>.
          </p>
        </section>

        <section className="mb-10">
          <h2 className={h2}>Vos droits</h2>
          <p className="mb-4">
            Vous disposez d’un droit d’accès, de rectification, de suppression, de portabilité, d’opposition et de retrait de votre consentement.
            Depuis <Link href="/compte/donnees" className={link}>Mon compte → Mes données</Link>, vous pouvez télécharger toutes vos données et supprimer votre compte.
            Pour toute autre demande : <strong>contact@jaellejc.com</strong>.
          </p>
          <p>Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la CNIL (cnil.fr).</p>
        </section>

        <p className="text-[11px] uppercase tracking-[0.12em] text-neutral-300 pt-4">Dernière mise à jour : novembre 2026</p>
      </div>
    </div>
  );
}
