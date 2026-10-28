import { serializeJsonLd } from '@/server/seo/jsonld';

// Données structurées dans le HTML initial (lues par les moteurs, y compris ceux qui n'exécutent pas le JavaScript).
// Contenu sérialisé par serializeJsonLd : aucune balise ne peut s'en échapper.
const JsonLd = ({ data }: { data: unknown }) => (
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />
);

export default JsonLd;
