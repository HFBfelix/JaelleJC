'use client';

import { useState, type ChangeEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { resizeImage } from '@/lib/resize-image';
import {
  analyzeAction, deleteDraftAction, duplicateProductAction, publishAction, removePhotoAction, reviewAiAction,
  saveFieldsAction, saveVariantsAction, setStatusAction, updatePhotosAction,
} from '@/server/createur/actions';
import { NOTES_MAX, hexOf, mergeVariants, type Analysis, type GridRow } from '@/server/createur/analysis';
import { SIZE_GRIDS, SIZE_GRID_KEYS, gridForCategory, gridOf, type SizeGrid } from '@/server/catalog/sizes';
import { checklist as checklistOf, gridRows, slugify, variantIdFor, type ProductFields } from '@/server/createur/logic';
import type { AdminProduct, AdminVariant } from '@/server/createur/products';
import type { Categorie, Produit, Variante } from '@/server/db/schema';
import { formatEuros } from '@/server/catalog/mapping';
import Dictation from './Dictation';
import { Button, Card, Input, Message, StatusBadge, TextArea, centsToEuros, eurosToCents, label, missingText } from './ui';

type Category = { slug: string; name: string; subs: { slug: string; name: string }[] };
// `model` : encadré « Modèle » (fiches des autres couleurs), affiché sous les variantes.
type Props = { product: AdminProduct; variants: AdminVariant[]; categories: Category[]; notes: string; aiEnabled: boolean; model?: ReactNode };
type Photo = { path: string; url: string; alt: string };

const lines = (v: string) => v.split('\n').map((s) => s.trim()).filter(Boolean);
const selectClass = (error: boolean) => `w-full bg-white border-[0.5px] ${error ? 'border-red-700' : 'border-neutral-300'} p-2 text-[14px]`;

const MESSAGES: Record<string, string> = {
  connexion: 'Votre session a expiré. Reconnectez-vous.',
  invalide: 'Vérifiez la saisie (longueurs, prix, référence SKU : lettres, chiffres, tirets).',
  erreur: 'Une erreur est survenue. Réessayez.',
  introuvable: 'Cette fiche n’existe plus.',
  'slug-pris': 'Cette adresse est déjà utilisée par une autre pièce : modifiez l’adresse de la page.',
  'sku-pris': 'Cette référence (SKU) est déjà utilisée par une autre pièce.',
  incomplet: 'Une pièce en ligne doit rester complète : complétez ce qui est en rouge ou remettez-la en brouillon.',
  doublon: 'Deux variantes ont le même coloris et la même taille.',
  'hors-grille': 'Une nouvelle taille doit être choisie dans une grille (Femme, Bébé ou Enfant).',
  'plusieurs-couleurs': 'Une seule couleur par fiche : pour une autre couleur, dupliquez la fiche et reliez-la au même modèle.',
  'stock-modifie': 'Une vente a modifié le stock pendant votre saisie. Les variantes ont été rechargées : vérifiez puis enregistrez de nouveau.',
  type: 'Format refusé : JPEG, PNG ou WebP seulement.',
  taille: 'Photo trop lourde, même réduite.',
  plein: '12 photos au plus.',
  derniere: 'Une pièce en ligne garde au moins une photo.',
  interdit: 'Seul un brouillon jamais publié peut être supprimé. Archivez-le plutôt.',
  quota: 'Limite de 10 analyses par heure atteinte. Vous pouvez continuer à remplir, enregistrer et publier.',
  vide: 'Ajoutez une description ou au moins une photo avant d’envoyer.',
  indisponible: 'L’IA ne répond pas pour le moment. Réessayez dans quelques minutes ou remplissez la fiche à la main.',
  stockage: 'La photo n’a pas pu être enregistrée (stockage des photos indisponible). Réessayez ; si cela continue, prévenez l’équipe technique.',
};

type Fields = {
  name: string; sku: string; slug: string; categoryId: string; subCategory: string; price: string; accroche: string; histoire: string;
  description: string; materials: string; entretien: string; details: string; limited: string; giftWrap: boolean;
  tags: string; usages: string; faq: { question: string; reponse: string }[];
};

const toRows = (vs: AdminVariant[]): GridRow[] => vs.map((v) => ({
  key: v.id, id: v.id, color: v.color ?? '', colorHex: v.colorHex ?? null, size: v.size ?? '', stock: v.stock, expectedStock: v.stock,
  dimensions: v.dimensions ?? '', priceCents: v.priceCents, active: v.active,
}));
const toPhotos = (p: AdminProduct): Photo[] => p.images.map((i) => ({ path: i.path, url: i.url, alt: i.alt }));

// Fiche d'une pièce sur une seule page : 1) photos et description libre (tapée ou dictée), envoyées à l'IA qui
// préremplit tout ; 2) la fiche à vérifier ; à droite, ce qui manque (en rouge) et les boutons. Rien n'est écrit en
// base avant « Enregistrer » (sauf les photos, enregistrées dès l'envoi, et le texte libre, gardé à l'analyse).
export default function ProductEditor({ product, variants, categories, notes: savedNotes, aiEnabled, model }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [notes, setNotes] = useState(savedNotes);
  const [analysis, setAnalysis] = useState<Pick<Analysis, 'missing'> | null>(null);
  const [aiKeys, setAiKeys] = useState<Set<string>>(new Set());
  const [reviewed, setReviewed] = useState(product.aiDraft.reviewed);
  const [aiGenerated, setAiGenerated] = useState(!!product.aiDraft.generatedAt);

  const initialFields = (): Fields => ({
    name: product.name, sku: product.sku ?? '', slug: product.slug, categoryId: product.categoryId ?? '', subCategory: product.subCategory ?? '',
    price: centsToEuros(product.priceCents), accroche: product.accroche, histoire: product.histoire, description: product.description,
    materials: product.materials.join('\n'), entretien: product.entretien, details: product.details.join('\n'),
    limited: product.limitedEditionSize ? String(product.limitedEditionSize) : '', giftWrap: product.giftWrap,
    tags: product.tags.join('\n'), usages: product.usages.join('\n'), faq: product.faq,
  });
  const [fields, setFields] = useState(initialFields);
  const [fieldsDirty, setFieldsDirty] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [photos, setPhotos] = useState(() => toPhotos(product));
  const [photosDirty, setPhotosDirty] = useState(false);
  const [rows, setRows] = useState(() => toRows(variants));
  const [rowsDirty, setRowsDirty] = useState(false);

  // Après un rechargement (photo ajoutée, stock relu) : on reprend la base, sans perdre une saisie en cours.
  const [seenProduct, setSeenProduct] = useState(product);
  if (seenProduct !== product) {
    setSeenProduct(product);
    const alts = new Map(photos.map((p) => [p.path, p.alt]));
    setPhotos(toPhotos(product).map((p) => ({ ...p, alt: photosDirty ? (alts.get(p.path) ?? p.alt) : p.alt })));
  }
  const [seenVariants, setSeenVariants] = useState(variants);
  if (seenVariants !== variants) {
    setSeenVariants(variants);
    if (!rowsDirty) setRows(toRows(variants));
  }

  const unmark = (keys: string[]) => setAiKeys((s) => (keys.some((k) => s.has(k)) ? new Set([...s].filter((k) => !keys.includes(k))) : s));
  const set = (patch: Partial<Fields>) => {
    setFields((f) => {
      const next = { ...f, ...patch };
      // Adresse de la page : suit le nom tant qu'elle n'a été ni modifiée à la main ni publiée.
      if (patch.name !== undefined && !slugTouched && !product.publishedAt) next.slug = slugify(patch.name);
      return next;
    });
    setFieldsDirty(true);
    unmark(Object.keys(patch));
  };
  const category = categories.find((c) => c.slug === fields.categoryId);
  const dirty = fieldsDirty || photosDirty || rowsDirty;

  // Ce qui manque avant la mise en ligne, recalculé à chaque frappe (le serveur rejoue le même contrôle).
  const priceCents = eurosToCents(fields.price) ?? 0;
  const items = checklistOf(
    {
      images: photos.map((p, order) => ({ ...p, order })), priceCents, categoryId: fields.categoryId || null,
      subCategory: fields.subCategory || null, accroche: fields.accroche, description: fields.description,
      aiDraft: { generatedAt: aiGenerated ? { toDate: () => new Date() } : null, reviewed } as Produit['aiDraft'],
    },
    rows as unknown as Variante[],
    categories.map((c) => ({ slug: c.slug, data: { subs: c.subs } as Categorie })),
  );
  const missing = new Set(items.filter((i) => !i.ok).map((i) => i.key));
  const err = (key: string, text: string) => (missing.has(key) ? text : null);

  const call = async <T extends { status: string }>(fn: () => Promise<T>): Promise<T | null> => {
    try {
      const r = await fn();
      if (r.status !== 'ok') setNotice(MESSAGES[r.status] ?? MESSAGES.erreur!);
      return r;
    } catch (e) {
      if ((e as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) throw e;
      setNotice(MESSAGES.erreur!);
      return null;
    }
  };

  const toInput = (): ProductFields | null => {
    const cents = fields.price.trim() ? eurosToCents(fields.price) : 0;
    const limited = fields.limited.trim() ? Number(fields.limited) : null;
    if (cents === null || (limited !== null && (!Number.isInteger(limited) || limited < 1))) return null;
    return {
      name: fields.name.trim() || 'Nouvelle pièce', sku: fields.sku.trim(), ...(product.publishedAt ? {} : { slug: fields.slug }),
      categoryId: fields.categoryId || null, subCategory: fields.subCategory || null, priceCents: cents,
      accroche: fields.accroche, histoire: fields.histoire, description: fields.description,
      materials: lines(fields.materials), entretien: fields.entretien, details: lines(fields.details),
      faq: fields.faq.filter((f) => f.question.trim() && f.reponse.trim()), limitedEditionSize: limited, giftWrap: fields.giftWrap,
      tags: lines(fields.tags), usages: lines(fields.usages),
    };
  };

  // Un seul « Enregistrer » : photos (ordre, textes), fiche, puis variantes ; arrêt au premier refus.
  const saveAll = async (): Promise<boolean> => {
    const input = toInput();
    if (!input) { setNotice('Prix ou série limitée invalide (exemple de prix : 45,50).'); return false; }
    if (photosDirty && photos.length) {
      const r = await call(() => updatePhotosAction({ productId: product.id, images: photos.map(({ path, alt }) => ({ path, alt })) }));
      if (r?.status !== 'ok') return false;
      setPhotosDirty(false);
    }
    if (fieldsDirty) {
      const r = await call(() => saveFieldsAction({ productId: product.id, fields: input }));
      if (r?.status !== 'ok') return false;
      setFieldsDirty(false);
    }
    if (rowsDirty) {
      const r = await call(() => saveVariantsAction({
        productId: product.id,
        rows: rows.map((r) => ({
          ...(r.id ? { id: r.id } : {}), color: r.color, colorHex: r.colorHex, size: r.size, stock: r.stock, expectedStock: r.expectedStock,
          dimensions: r.dimensions, priceCents: r.priceCents, active: r.active,
        })),
      }));
      if (r?.status === 'stock-modifie') { setRowsDirty(false); router.refresh(); }
      if (r?.status !== 'ok') return false;
      // Même identifiants que le serveur ; le stock enregistré devient le stock attendu du prochain enregistrement.
      setRows((rs) => rs.map((r) => ({ ...r, id: r.id ?? variantIdFor(r.color, r.size), expectedStock: r.stock })));
      setRowsDirty(false);
    }
    return true;
  };

  const run = async (fn: () => Promise<void>) => {
    setPending(true);
    setNotice(null);
    try { await fn(); } finally { setPending(false); }
  };

  const onSave = () => run(async () => {
    if (await saveAll()) { setNotice('Enregistré.'); setAiKeys(new Set()); router.refresh(); }
  });

  const onPublish = () => run(async () => {
    if (dirty && !(await saveAll())) return;
    const r = await call(() => publishAction({ productId: product.id }));
    if (r?.status === 'ok') { setNotice('La pièce est en ligne.'); setAiKeys(new Set()); router.refresh(); }
  });

  // Case cochée aussitôt, décochée de nouveau si le serveur refuse.
  const onReview = (value: boolean) => run(async () => {
    setReviewed(value);
    const r = await call(() => reviewAiAction({ productId: product.id, reviewed: value }));
    if (r?.status !== 'ok') setReviewed(!value);
  });

  // « Envoyer » : l'IA propose, le formulaire se remplit ; seules les valeurs trouvées remplacent la saisie.
  const onAnalyze = () => run(async () => {
    const r = await call(() => analyzeAction({ productId: product.id, notes }));
    if (r?.status !== 'ok' || !('analysis' in r)) return;
    const a = r.analysis;
    const patch: Partial<Fields> = {};
    if (a.name) patch.name = a.name;
    if (a.categoryId) { patch.categoryId = a.categoryId; patch.subCategory = a.subCategory ?? ''; }
    if (a.priceCents) patch.price = centsToEuros(a.priceCents);
    if (a.materials.length) patch.materials = a.materials.join('\n');
    if (a.details.length) patch.details = a.details.join('\n');
    if (a.entretien) patch.entretien = a.entretien;
    if (a.limitedEditionSize) patch.limited = String(a.limitedEditionSize);
    if (a.giftWrap !== null) patch.giftWrap = a.giftWrap;
    if (a.usages.length) patch.usages = a.usages.join('\n');
    if (a.tags.length) patch.tags = a.tags.join('\n');
    if (a.accroche) patch.accroche = a.accroche;
    if (a.histoire) patch.histoire = a.histoire;
    if (a.description) patch.description = a.description;
    if (a.faq.length) patch.faq = a.faq;
    set(patch);
    const marked = new Set(Object.keys(patch));
    if (a.alts.some((alt, i) => alt && photos[i] && !photos[i].alt.trim())) {
      setPhotos((ps) => ps.map((p, i) => (a.alts[i] && !p.alt.trim() ? { ...p, alt: a.alts[i]! } : p)));
      setPhotosDirty(true);
      marked.add('photos');
    }
    if (a.variants.length || a.stock !== null) {
      setRows((rs) => mergeVariants(rs, a, (n) => `ia-${Date.now()}-${n}`));
      setRowsDirty(true);
      marked.add('variantes');
    }
    setAiKeys(marked);
    setAnalysis({ missing: a.missing });
    setAiGenerated(true);
    setReviewed(false);
    setNotice('Fiche préremplie par l’IA : vérifiez chaque champ marqué, corrigez si besoin, puis enregistrez.');
  });

  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    await run(async () => {
      try {
        for (const file of files) {
          const form = new FormData();
          form.set('productId', product.id);
          form.set('photo', await resizeImage(file), 'photo.jpg');
          const r = (await (await fetch('/api/createur/photos', { method: 'POST', body: form })).json()) as { status: string };
          if (r.status !== 'ok') { setNotice(MESSAGES[r.status === 'erreur' ? 'stockage' : r.status] ?? MESSAGES.erreur!); break; }
        }
      } catch {
        setNotice('Cette photo n’a pas pu être lue. Essayez en JPEG.');
      }
      router.refresh();
    });
  };

  const movePhoto = (i: number, d: -1 | 1) => {
    const next = [...photos];
    [next[i], next[i + d]] = [next[i + d]!, next[i]!];
    setPhotos(next);
    setPhotosDirty(true);
  };
  const removePhoto = (path: string) => run(async () => {
    const r = await call(() => removePhotoAction({ productId: product.id, path }));
    if (r?.status === 'ok') router.refresh();
  });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <Link href="/atelier/produits" className={`${label} hover:text-black`}>← Produits</Link>
        <h1 className="font-serif text-3xl flex-1 min-w-0 truncate">{fields.name || 'Nouvelle pièce'}</h1>
        <StatusBadge status={product.status} />
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
        <div className="space-y-8 min-w-0">
          <Card>
            <section aria-label="Décrire la pièce">
              <h2 className="font-serif text-[22px] mb-2">Décrire la pièce</h2>
              <p className="text-[14px] text-neutral-600 mb-6">Ajoutez les photos, puis racontez la pièce comme à une cliente, en le tapant ou en le dictant. L’IA remplit la fiche ; vous vérifiez et validez.</p>

              <label className={`block border-[0.5px] border-dashed ${missing.has('photos') ? 'border-red-700' : 'border-neutral-400'} bg-[#F5F2EE] p-6 text-center cursor-pointer mb-2`}>
                <span className="text-[11px] uppercase tracking-[0.12em]">Ajouter des photos</span>
                <span className="block text-[13px] text-neutral-500 mt-2">Une ou plusieurs, JPEG, PNG ou WebP. Réduites avant l’envoi ; la position GPS est retirée.</span>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple onChange={onFiles} disabled={pending} className="sr-only" />
              </label>
              {missing.has('photos') && <p className={`text-[13px] ${missingText} mb-4`}>Au moins une photo est nécessaire pour la mise en ligne.</p>}

              {photos.length > 0 && (
                <ol className="space-y-4 my-6">
                  {photos.map((img, i) => (
                    <li key={img.path} className="flex gap-4 items-start">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="" className="w-20 h-24 object-cover bg-neutral-100" />
                      <div className="flex-1 min-w-0">
                        {i === 0 && <span className={`${label} block mb-1`}>Couverture</span>}
                        <Input label={`Texte alternatif de la photo ${i + 1}`} value={img.alt} maxLength={200} ai={aiKeys.has('photos') && !!img.alt}
                          error={!img.alt.trim() ? 'À compléter : décrivez ce que montre la photo.' : null}
                          onChange={(e) => { setPhotos(photos.map((p, n) => (n === i ? { ...p, alt: e.target.value } : p))); setPhotosDirty(true); }}
                          hint="Ce que montre la photo (ex. « Cape de bain écrue pliée, vue de dessus »)." />
                        <div className="flex gap-4">
                          <Button variant="text" disabled={pending || i === 0} onClick={() => movePhoto(i, -1)}>Monter</Button>
                          <Button variant="text" disabled={pending || i === photos.length - 1} onClick={() => movePhoto(i, 1)}>Descendre</Button>
                          <Button variant="text" disabled={pending} onClick={() => removePhoto(img.path)}>Retirer</Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}

              <TextArea label="Description libre" rows={8} maxLength={NOTES_MAX} value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Exemple : cape de bain en gaze de coton bio, 80 × 80 cm, écru et rose, 3 écrues et 2 roses, 45 €, idéale pour une naissance ou un baptême, lavage à 30 °C…"
                hint="Tout ce que vous savez : matière, tailles, coloris, quantités, prix, occasions, entretien, série. Ce texte reste privé." />
              <div className="flex flex-wrap items-start gap-4">
                {aiEnabled && <Dictation disabled={pending} onText={(t) => setNotes((n) => (n.trim() ? `${n.trim()}\n${t}` : t).slice(0, NOTES_MAX))} />}
                {aiEnabled ? (
                  <Button disabled={pending || (!notes.trim() && !photos.length)} onClick={onAnalyze}>{pending ? 'Patientez…' : 'Envoyer à l’IA'}</Button>
                ) : (
                  <p className="text-[13px] text-neutral-500">L’IA n’est pas branchée sur cet environnement : remplissez la fiche ci-dessous.</p>
                )}
              </div>
              {analysis && analysis.missing.length > 0 && (
                <div className="mt-6 border-l border-black pl-4">
                  <p className={`${label} mb-2`}>Non trouvé dans votre description</p>
                  <ul className="text-[14px] space-y-1">{analysis.missing.map((m) => <li key={m}>{m}</li>)}</ul>
                </div>
              )}
            </section>
          </Card>

          <Card>
            <section aria-label="L’essentiel">
              <h2 className="font-serif text-[22px] mb-6">L’essentiel</h2>
              <Input label="Nom de la pièce" value={fields.name} maxLength={120} ai={aiKeys.has('name')} onChange={(e) => set({ name: e.target.value })}
                hint="Une seule capitale, en début de nom (« Cabas imprimé bleu »)." />
              <Input label="Référence (SKU)" value={fields.sku} maxLength={40} onChange={(e) => set({ sku: e.target.value.toUpperCase() })}
                hint="Votre référence pour cette pièce, unique dans la boutique (lettres, chiffres, tirets)." />
              {product.publishedAt ? (
                <p className="text-[13px] text-neutral-500 mb-6">Adresse : /produits/{product.slug} (figée depuis la première mise en ligne)</p>
              ) : (
                <Input label="Adresse de la page" value={fields.slug} maxLength={80} onChange={(e) => { setSlugTouched(true); set({ slug: e.target.value }); }}
                  hint="Minuscules et tirets ; suit le nom tant que vous ne la modifiez pas. Figée après la première mise en ligne." />
              )}
              <div className="grid md:grid-cols-2 gap-x-6">
                <label className="block mb-6">
                  <span className={`${label} block mb-2 ${missing.has('categorie') && !category ? missingText : ''}`}>Univers{aiKeys.has('categoryId') && ' · proposé par l’IA'}</span>
                  <select value={fields.categoryId} onChange={(e) => set({ categoryId: e.target.value, subCategory: '' })} className={selectClass(missing.has('categorie') && !category)}>
                    <option value="">—</option>
                    {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                  </select>
                </label>
                <label className="block mb-6">
                  <span className={`${label} block mb-2 ${missing.has('categorie') ? missingText : ''}`}>Famille{aiKeys.has('categoryId') && ' · proposé par l’IA'}</span>
                  <select value={fields.subCategory} onChange={(e) => set({ subCategory: e.target.value })} disabled={!category} className={selectClass(missing.has('categorie'))}>
                    <option value="">—</option>
                    {category?.subs.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
                  </select>
                </label>
              </div>
              {missing.has('categorie') && <p className={`text-[13px] ${missingText} -mt-4 mb-6`}>À compléter : choisissez un univers et une famille.</p>}
              <Input label="Prix TTC (€)" inputMode="decimal" value={fields.price} ai={aiKeys.has('price')} onChange={(e) => set({ price: e.target.value })}
                error={err('prix', 'À compléter : indiquez le prix.')} hint="Exemple : 45 ou 45,50." />
            </section>
          </Card>

          <Card>
            <section aria-label="Détails">
              <h2 className="font-serif text-[22px] mb-6">Détails</h2>
              <TextArea label="Matières" rows={3} value={fields.materials} ai={aiKeys.has('materials')} onChange={(e) => set({ materials: e.target.value })} hint="Une par ligne (ex. « gaze de coton »)." />
              <TextArea label="Dimensions et détails" rows={4} value={fields.details} ai={aiKeys.has('details')} onChange={(e) => set({ details: e.target.value })} hint="Une ligne par élément (ex. « Lange : 70 × 70 cm »)." />
              <TextArea label="Entretien (optionnel)" rows={2} value={fields.entretien} maxLength={400} ai={aiKeys.has('entretien')} onChange={(e) => set({ entretien: e.target.value })}
                hint="N’écrivez « lavable » que si c’est vérifié." />
              <TextArea label="Cas d’usage" rows={3} value={fields.usages} ai={aiKeys.has('usages')} onChange={(e) => set({ usages: e.target.value })}
                hint="Un par ligne : naissance, baptême, vacances… Ils servent à la recherche par usage." />
              <div className="grid md:grid-cols-2 gap-x-6">
                <Input label="Série limitée (optionnel)" inputMode="numeric" value={fields.limited} ai={aiKeys.has('limited')} onChange={(e) => set({ limited: e.target.value })} hint="Nombre d’exemplaires." />
                <TextArea label="Mots-clés (optionnel)" rows={2} value={fields.tags} ai={aiKeys.has('tags')} onChange={(e) => set({ tags: e.target.value })} hint="Un par ligne." />
              </div>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={fields.giftWrap} onChange={(e) => set({ giftWrap: e.target.checked })} className="w-4 h-4 accent-black" />
                <span className="text-[14px]">Emballage cadeau proposé</span>
              </label>
            </section>
          </Card>

          <Card>
            <VariantsSection rows={rows} priceCents={priceCents} error={missing.has('stock')} ai={aiKeys.has('variantes')} categoryId={fields.categoryId || null}
              setRows={(next) => { setRows(next); setRowsDirty(true); unmark(['variantes']); }} />
          </Card>

          {model}

          <Card>
            <section aria-label="Textes">
              <h2 className="font-serif text-[22px] mb-6">Textes</h2>
              <TextArea label="Accroche (une phrase)" rows={2} maxLength={200} value={fields.accroche} ai={aiKeys.has('accroche')}
                error={err('accroche', 'À compléter : une phrase qui donne envie.')} onChange={(e) => set({ accroche: e.target.value })} />
              <TextArea label="Histoire (optionnel)" rows={3} maxLength={800} value={fields.histoire} ai={aiKeys.has('histoire')} onChange={(e) => set({ histoire: e.target.value })} />
              <TextArea label="Description" rows={6} maxLength={4000} value={fields.description} ai={aiKeys.has('description')}
                error={err('description', 'À compléter : décrivez la pièce.')} onChange={(e) => set({ description: e.target.value })} />

              <h3 className={`${label} mb-3 mt-6`}>Questions fréquentes (optionnel){aiKeys.has('faq') && ' · proposées par l’IA'}</h3>
              {fields.faq.map((f, i) => (
                <div key={i} className="mb-4">
                  <Input label={`Question ${i + 1}`} value={f.question} maxLength={200} onChange={(e) => set({ faq: fields.faq.map((x, n) => (n === i ? { ...x, question: e.target.value } : x)) })} />
                  <TextArea label={`Réponse ${i + 1}`} rows={2} value={f.reponse} maxLength={800} onChange={(e) => set({ faq: fields.faq.map((x, n) => (n === i ? { ...x, reponse: e.target.value } : x)) })} />
                  <Button variant="text" onClick={() => set({ faq: fields.faq.filter((_, n) => n !== i) })}>Retirer la question</Button>
                </div>
              ))}
              {fields.faq.length < 10 && <Button variant="text" onClick={() => set({ faq: [...fields.faq, { question: '', reponse: '' }] })}>Ajouter une question</Button>}
            </section>
          </Card>
        </div>

        <aside aria-label="Publication" className="lg:sticky lg:top-32 space-y-6">
          <Card>
            <h2 className={`${label} mb-4`}>Avant la mise en ligne</h2>
            <ul className="mb-6 space-y-2">
              {items.map((i) => (
                <li key={i.key} className={`flex gap-3 text-[14px] ${i.ok ? '' : missingText}`}>
                  <span aria-hidden>{i.ok ? '✓' : '✗'}</span>
                  <span>{i.label}{i.ok ? '' : ' (à compléter)'}</span>
                </li>
              ))}
            </ul>
            {aiGenerated && (
              <label className={`flex items-start gap-3 mb-6 text-[14px] ${reviewed ? '' : missingText}`}>
                <input type="checkbox" checked={reviewed} disabled={pending} onChange={(e) => onReview(e.target.checked)} className="w-4 h-4 mt-0.5 accent-black" />
                <span>J’ai vérifié les propositions de l’IA</span>
              </label>
            )}
            {notice && <Message>{notice}</Message>}
            {dirty && !notice && <p className="text-[13px] text-neutral-500 mb-4">Modifications non enregistrées.</p>}
            <div className="flex flex-col gap-3">
              <Button disabled={pending || !dirty} onClick={onSave}>Enregistrer</Button>
              {product.status !== 'published' && (
                <Button variant="secondary" disabled={pending || missing.size > 0} onClick={onPublish}>
                  {dirty ? 'Enregistrer et mettre en ligne' : 'Mettre en ligne'}
                </Button>
              )}
              <Link href={`/atelier/apercu/${product.id}`} target="_blank" className="border-[0.5px] border-black bg-white px-6 py-3 text-center text-[11px] uppercase tracking-[0.12em]">
                Aperçu privé
              </Link>
            </div>
            <div className="flex flex-wrap gap-4 mt-6">
              {product.status === 'published' && (
                <Button variant="text" disabled={pending} onClick={() => run(async () => { if ((await call(() => setStatusAction({ productId: product.id, status: 'draft' })))?.status === 'ok') router.refresh(); })}>Remettre en brouillon</Button>
              )}
              {product.status !== 'archived' && (
                <Button variant="text" disabled={pending} onClick={() => run(async () => { if ((await call(() => setStatusAction({ productId: product.id, status: 'archived' })))?.status === 'ok') router.refresh(); })}>Archiver</Button>
              )}
              <Button variant="text" disabled={pending} onClick={() => run(async () => { await call(() => duplicateProductAction({ productId: product.id }) as Promise<{ status: string }>); })}>Dupliquer</Button>
              {product.status === 'draft' && !product.publishedAt && (
                <Button variant="text" disabled={pending} onClick={() => {
                  if (window.confirm('Supprimer définitivement ce brouillon et ses photos ?')) void run(async () => { await call(() => deleteDraftAction({ productId: product.id })); });
                }}>Supprimer le brouillon</Button>
              )}
            </div>
          </Card>
          <LivePreview cover={photos[0] ?? null} fields={fields} categoryName={category?.name ?? ''} available={rows.some((r) => r.active && r.stock > 0)} />
        </aside>
      </div>
    </div>
  );
}

function VariantsSection({ rows, setRows, priceCents, error, ai, categoryId }:
  { rows: GridRow[]; setRows: (rows: GridRow[]) => void; priceCents: number; error: boolean; ai: boolean; categoryId: string | null }) {
  const [colors, setColors] = useState('');
  // Grille de tailles : celle des tailles déjà saisies, sinon celle de l'univers (Femmes, Bébé) ; modifiable.
  const [chosenGrid, setChosenGrid] = useState<SizeGrid | '' | null>(null);
  const grid = chosenGrid ?? gridOf(rows.map((r) => r.size)) ?? gridForCategory(categoryId) ?? '';
  const [checked, setChecked] = useState<string[]>([]);
  const update = (i: number, patch: Partial<GridRow>) => setRows(rows.map((row, n) => (n === i ? { ...row, ...patch } : row)));
  const toggle = (size: string) => setChecked((c) => (c.includes(size) ? c.filter((s) => s !== size) : [...c, size]));
  // Une teinte par coloris : appliquée à toutes ses tailles.
  const setHex = (color: string, hex: string) => setRows(rows.map((r) => (r.color === color ? { ...r, colorHex: hex } : r)));
  // Teintes des couleurs encore actives seulement (une couleur retirée n'a plus rien à compléter).
  const tinted = [...new Set(rows.filter((r) => r.color && r.active).map((r) => r.color))];
  // Variantes retirées : une variante enregistrée n'est jamais effacée (paniers, commandes), seulement désactivée,
  // et rangée sous « Afficher les variantes retirées ». Une case « Active » décochée ici reste visible jusqu'au
  // rechargement (retrait temporaire).
  const [keptVisible, setKeptVisible] = useState<string[]>([]);
  const [showRetired, setShowRetired] = useState(false);
  const isRetired = (r: GridRow) => !!r.id && !r.active && !keptVisible.includes(r.key);
  const retired = rows.filter(isRetired);

  // Ligne pas encore enregistrée : enlevée ; ligne enregistrée : désactivée (« Enregistrer » l'écrit en base).
  const retire = (keys: string[], what: string) => {
    const stock = rows.filter((r) => keys.includes(r.key) && r.active).reduce((s, r) => s + r.stock, 0);
    if (stock > 0 && !window.confirm(`${what} a encore ${stock} pièce${stock > 1 ? 's' : ''} en stock : la retirer quand même ?`)) return;
    setKeptVisible((k) => k.filter((x) => !keys.includes(x)));
    setRows(rows.flatMap((r) => (!keys.includes(r.key) ? [r] : r.id ? [{ ...r, active: false }] : [])));
  };
  const restore = (key: string) => setRows(rows.map((r) => (r.key === key ? { ...r, active: true } : r)));

  const generate = () => {
    const sizes = grid ? SIZE_GRIDS[grid].sizes.filter((s) => checked.includes(s)) : [];
    const wanted = gridRows(lines(colors.replace(/,/g, '\n')), sizes);
    const keyOf = (c: { color: string; size: string }) => `${c.color}|${c.size}`;
    const existing = new Set(rows.map(keyOf));
    // Une variante retirée puis ajoutée de nouveau est rétablie (même identifiant, ventes passées gardées).
    const back = new Set(wanted.map(keyOf));
    const added = wanted
      .filter((c) => !existing.has(keyOf(c)))
      .map((c, n) => ({ ...c, colorHex: hexOf(rows, c.color), key: `new-${Date.now()}-${n}`, stock: 0, expectedStock: null, dimensions: '', priceCents: null, active: true }));
    setRows([...rows.map((r) => (back.has(keyOf(r)) && !r.active ? { ...r, active: true } : r)), ...added]);
    setColors('');
    setChecked([]);
  };

  return (
    <section aria-label="Variantes et stock">
      <h2 className="font-serif text-[22px] mb-2">Variantes et stock{ai && <span className="ml-3 align-middle text-[11px] font-sans text-neutral-500 border-[0.5px] border-neutral-400 px-1.5">proposé par l’IA · à vérifier</span>}</h2>
      <p className="text-[14px] text-neutral-600 mb-6">Le stock est tenu par variante (coloris × taille). « Retirer » enlève une variante de la fiche ; décochez « Active » pour la mettre de côté un temps.</p>
      <Input label="Ajouter des coloris" value={colors} onChange={(e) => setColors(e.target.value)} hint="Une seule couleur par fiche : pour une autre couleur, dupliquez la fiche et reliez-la au même modèle." />
      <label className="block mb-4">
        <span className={`${label} block mb-2`}>Grille de tailles</span>
        <select value={grid} onChange={(e) => { setChosenGrid(e.target.value as SizeGrid | ''); setChecked([]); }}
          className="w-full md:w-64 bg-white border-[0.5px] border-neutral-300 p-2 text-[14px]">
          <option value="">Sans taille</option>
          {SIZE_GRID_KEYS.map((g) => <option key={g} value={g}>{SIZE_GRIDS[g].label} ({SIZE_GRIDS[g].sizes.join(' / ')})</option>)}
        </select>
      </label>
      {grid && (
        <fieldset className="mb-4">
          <legend className={`${label} mb-2`}>Tailles à ajouter</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {SIZE_GRIDS[grid].sizes.map((s) => (
              <label key={s} className="flex items-center gap-2 text-[14px] cursor-pointer">
                <input type="checkbox" checked={checked.includes(s)} onChange={() => toggle(s)} className="w-4 h-4 accent-black" />{s}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <Button variant="secondary" onClick={generate} disabled={!colors.trim() && !checked.length} className="mb-8">Ajouter</Button>

      {tinted.length > 0 && (
        <fieldset className="mb-8">
          <legend className={`${label} mb-2`}>Teinte de chaque coloris (pastille sur la fiche)</legend>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {tinted.map((c) => (
              <span key={c} className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-[14px] cursor-pointer">
                  <input type="color" aria-label={`Teinte ${c}`} value={hexOf(rows, c) ?? '#e5e5e5'} onChange={(e) => setHex(c, e.target.value)}
                    className="w-8 h-8 p-0 border-[0.5px] border-neutral-400 bg-transparent cursor-pointer" />
                  {c}{!hexOf(rows, c) && <span className={`text-[13px] ${missingText}`}>à choisir</span>}
                </label>
                <Button variant="text" onClick={() => retire(rows.filter((r) => r.color === c).map((r) => r.key), `La couleur ${c}`)}>Retirer la couleur {c}</Button>
              </span>
            ))}
          </div>
        </fieldset>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-[14px]">
          <thead>
            <tr className={label}>
              <th className="text-left font-normal pb-2">Coloris</th><th className="text-left font-normal pb-2">Taille</th>
              <th className={`text-left font-normal pb-2 ${error ? missingText : ''}`}>Stock</th><th className="text-left font-normal pb-2">Dimensions</th>
              <th className="text-left font-normal pb-2">Prix spécifique (€)</th><th className="text-left font-normal pb-2">Active</th>
              <th className="pb-2"><span className="sr-only">Retirer</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (isRetired(r) ? null : (
              <tr key={r.key} className={`border-t-[0.5px] border-neutral-200 ${r.active ? '' : 'text-neutral-400'}`}>
                <td className="py-2 pr-2">{r.id ? (r.color || '—') : <input aria-label="Coloris" value={r.color} onChange={(e) => update(i, { color: e.target.value })} className="w-24 border-b-[0.5px] border-neutral-400 bg-transparent" />}</td>
                <td className="py-2 pr-2">{r.size || '—'}</td>
                <td className="py-2 pr-2"><input aria-label={`Stock ${[r.color, r.size].filter(Boolean).join(' ') || 'unique'}`} type="number" min={0} max={9999} value={r.stock}
                  onChange={(e) => update(i, { stock: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                  className={`w-16 border-b-[0.5px] ${error && r.active ? 'border-red-700' : 'border-neutral-400'} bg-transparent`} /></td>
                <td className="py-2 pr-2"><input aria-label="Dimensions" value={r.dimensions} maxLength={80} onChange={(e) => update(i, { dimensions: e.target.value })} className="w-32 border-b-[0.5px] border-neutral-400 bg-transparent" /></td>
                <td className="py-2 pr-2"><input aria-label="Prix spécifique" inputMode="decimal" key={`${r.key}-${r.priceCents}`} defaultValue={r.priceCents ? centsToEuros(r.priceCents) : ''}
                  onBlur={(e) => update(i, { priceCents: e.target.value.trim() ? eurosToCents(e.target.value) : null })}
                  placeholder={priceCents ? formatEuros(priceCents) : 'prix de la pièce'} className="w-24 border-b-[0.5px] border-neutral-400 bg-transparent" /></td>
                <td className="py-2 pr-2"><input aria-label="Active" type="checkbox" checked={r.active} className="w-4 h-4 accent-black"
                  onChange={(e) => { setKeptVisible((k) => [...k, r.key]); update(i, { active: e.target.checked }); }} /></td>
                <td className="py-2">
                  <Button variant="text" aria-label={`Retirer ${[r.color, r.size].filter(Boolean).join(' ') || 'unique'}`}
                    onClick={() => retire([r.key], 'Cette variante')}>Retirer</Button>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
      {retired.length > 0 && (
        <div className="mt-4">
          <Button variant="text" onClick={() => setShowRetired((s) => !s)}>
            {showRetired ? 'Masquer les variantes retirées' : `Afficher les variantes retirées (${retired.length})`}
          </Button>
          {showRetired && (
            <ul className="mt-3 space-y-2 text-[14px] text-neutral-500">
              {retired.map((r) => (
                <li key={r.key} className="flex items-center gap-4">
                  <span>{[r.color, r.size].filter(Boolean).join(' · ') || 'Unique'}</span>
                  <Button variant="text" aria-label={`Rétablir ${[r.color, r.size].filter(Boolean).join(' ') || 'unique'}`} onClick={() => restore(r.key)}>Rétablir</Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {error && <p className={`text-[13px] ${missingText} mt-4`}>À compléter : au moins une variante active avec du stock.</p>}
      <p className="text-[13px] text-neutral-500 mt-2">Prix spécifique : seulement si cette variante coûte un autre prix que la pièce ; sinon laissez vide.</p>
    </section>
  );
}

// Aperçu en direct : ce que la cliente verra (photo de couverture, nom, prix, accroche, description).
function LivePreview({ cover, fields, categoryName, available }:
  { cover: Photo | null; fields: Fields; categoryName: string; available: boolean }) {
  const cents = eurosToCents(fields.price);
  return (
    <div aria-label="Aperçu" className="bg-white border-[0.5px] border-neutral-300">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {cover ? <img src={cover.url} alt={cover.alt} className="w-full aspect-[4/5] object-cover" /> : <div className="w-full aspect-[4/5] bg-neutral-100" />}
      <div className="p-5">
        <span className={`${label} block mb-1`}>{categoryName || 'Univers'}</span>
        <p className="font-serif text-[22px] leading-tight mb-2">{fields.name || 'Nom de la pièce'}</p>
        <p className="text-[14px] mb-4">{cents ? `${formatEuros(cents)} €` : '— €'}{available ? '' : ' · Épuisé'}</p>
        {fields.accroche && <p className="font-serif text-[18px] leading-snug mb-4">« {fields.accroche} »</p>}
        {fields.description && <p className="text-[13px] leading-relaxed text-neutral-700 mb-3 line-clamp-6">{fields.description}</p>}
        {fields.materials.trim() && <p className="text-[13px] text-neutral-600">{lines(fields.materials).join(', ')}{fields.entretien ? ` — ${fields.entretien}` : ''}</p>}
      </div>
    </div>
  );
}
