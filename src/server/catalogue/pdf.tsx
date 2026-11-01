// Modèle du catalogue imprimable (A4), à la charte de la marque : noir et blanc, gris galerie #F7F7F7,
// Crimson Pro (titres) et Source Sans 3 (texte), lignes de 0,5 pt, petites capitales espacées, aucun texte sous
// 11 pt. Couverture (logo d'origine, non modifié), introduction, une pièce par page, page de contact.
/* eslint-disable jsx-a11y/alt-text -- composants Image du PDF (react-pdf), pas des balises HTML */
/** @jsxRuntime classic */
/** @jsx h */
/** @jsxFrag Fragment */
import 'server-only';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import sharp from 'sharp';
import { formatEuros } from '../catalog/mapping';
import type { CataloguePiece } from './logic';

// Éléments créés avec le React du projet, celui que lit react-pdf (et non le React interne de Next).
const projectReact = createRequire(path.join(process.cwd(), 'package.json'))('react') as typeof import('react');
const h = projectReact.createElement;
const Fragment = projectReact.Fragment;
void Fragment;

const FONTS = path.join(process.cwd(), 'src/server/catalogue/fonts');
Font.register({ family: 'Crimson', src: path.join(FONTS, 'CrimsonPro-Regular.ttf') });
Font.register({ family: 'Source', fonts: [
  { src: path.join(FONTS, 'SourceSans3-Regular.ttf'), fontWeight: 400 },
  { src: path.join(FONTS, 'SourceSans3-SemiBold.ttf'), fontWeight: 600 },
] });
Font.registerHyphenationCallback((word) => [word]); // pas de césure automatique

const LOGO = path.join(process.cwd(), 'public/assets/Logo noir Jaelle&JC_V2.png');
const GREY = '#F7F7F7';
const MUTED = '#737373';

const s = StyleSheet.create({
  page: { fontFamily: 'Source', fontSize: 12, lineHeight: 1.7, color: '#000', backgroundColor: '#fff', padding: 48 },
  caps: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.3, color: MUTED },
  rule: { borderBottomWidth: 0.5, borderBottomColor: '#000', marginVertical: 16 },
  cover: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Crimson', fontSize: 40, lineHeight: 1.2, marginTop: 40, marginBottom: 12 },
  h2: { fontFamily: 'Crimson', fontSize: 28, lineHeight: 1.2, marginBottom: 16 },
  name: { fontFamily: 'Crimson', fontSize: 26, lineHeight: 1.2, marginTop: 6 },
  photo: { width: '100%', height: 440, objectFit: 'cover', backgroundColor: GREY },
  photoEmpty: { width: '100%', height: 440, backgroundColor: GREY },
  swatch: { width: 12, height: 12, borderRadius: 6, borderWidth: 0.5, borderColor: '#d4d4d4', marginRight: 6 },
});

// Photos : seulement celles de la boutique (Firebase Storage, ou l'émulateur en local), converties en JPEG.
const PHOTO_HOSTS = ['firebasestorage.googleapis.com', '127.0.0.1', 'localhost'];
async function photo(url: string | null): Promise<Buffer | null> {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!PHOTO_HOSTS.includes(u.hostname) || (u.protocol !== 'https:' && !['127.0.0.1', 'localhost'].includes(u.hostname))) return null;
    const res = await fetch(u, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    return await sharp(Buffer.from(await res.arrayBuffer())).resize({ width: 1400, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  } catch {
    return null; // photo illisible : emplacement gris, le catalogue est quand même produit
  }
}

type Doc = { pieces: (CataloguePiece & { text: string; image: Buffer | null })[]; intro: string; showPrices: boolean; date: Date };

function Catalogue({ pieces, intro, showPrices, date, logo }: Doc & { logo: Buffer }) {
  const month = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date);
  return (
    <Document title={`Catalogue Jaelle & JC — ${month}`} author="Jaelle & JC" creator="Jaelle & JC" language="fr">
      <Page size="A4" style={s.page}>
        <View style={s.cover}>
          <Image src={{ data: logo, format: 'png' }} style={{ width: 200 }} />
          <Text style={s.title}>Catalogue</Text>
          <Text style={s.caps}>{month}</Text>
        </View>
        <Text style={[s.caps, { textAlign: 'center' }]}>Cousu main en Île-de-France</Text>
      </Page>

      {intro.trim() && (
        <Page size="A4" style={s.page}>
          <View style={{ marginTop: 160 }}>
            <Text style={s.h2}>L’atelier</Text>
            <View style={s.rule} />
            <Text>{intro.trim()}</Text>
          </View>
        </Page>
      )}

      {pieces.map((p) => (
        <Page key={p.id} size="A4" style={s.page}>
          {p.image ? <Image src={{ data: p.image, format: 'jpg' }} style={s.photo} /> : <View style={s.photoEmpty} />}
          <Text style={[s.caps, { marginTop: 18 }]}>{[p.category, p.sku].filter(Boolean).join(' · ')}</Text>
          <Text style={s.name}>{p.name}</Text>
          {showPrices && <Text style={{ fontSize: 13, marginTop: 4 }}>{formatEuros(p.priceCents)} €</Text>}
          <View style={s.rule} />
          {p.text.trim() && <Text>{p.text.trim()}</Text>}
          {p.colors.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 12 }}>
              <Text style={[s.caps, { marginRight: 10 }]}>Couleurs</Text>
              {p.colors.map((c) => (
                <View key={c.name} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 14 }}>
                  <View style={[s.swatch, { backgroundColor: c.hex ?? '#e5e5e5' }]} />
                  <Text style={{ fontSize: 11 }}>{c.name}</Text>
                </View>
              ))}
            </View>
          )}
          {p.sizes.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <Text style={[s.caps, { marginRight: 10 }]}>Tailles</Text>
              <Text style={{ fontSize: 11 }}>{p.sizes.join('  ·  ')}</Text>
            </View>
          )}
        </Page>
      ))}

      <Page size="A4" style={s.page}>
        <View style={s.cover}>
          <Text style={s.h2}>Jaelle &amp; JC</Text>
          <Text>jaellejc.com</Text>
          <Text>contact@jaellejc.com</Text>
          <Text style={[s.caps, { marginTop: 24 }]}>Cousu main en Île-de-France</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function catalogueBuffer(doc: Omit<Doc, 'pieces'> & { pieces: (CataloguePiece & { text: string })[] }): Promise<Buffer> {
  const [logo, images] = await Promise.all([readFile(LOGO), Promise.all(doc.pieces.map((p) => photo(p.cover)))]);
  const pieces = doc.pieces.map((p, i) => ({ ...p, image: images[i] ?? null }));
  return renderToBuffer(<Catalogue {...doc} pieces={pieces} logo={logo} />);
}
