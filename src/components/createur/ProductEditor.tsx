'use client';

import { useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { resizeImage } from '@/lib/resize-image';
import {
  deleteDraftAction, draftAiAction, duplicateProductAction, publishAction, removePhotoAction, reviewAiAction,
  saveFieldsAction, saveVariantsAction, setStatusAction, updatePhotosAction,
} from '@/server/createur/actions';
import type { AiProposals } from '@/server/createur/ai';
import { gridRows, type ChecklistItem, type ProductFields, type VariantRow } from '@/server/createur/logic';
import type { AdminProduct, AdminVariant } from '@/server/createur/products';
import { formatEuros } from '@/server/catalog/mapping';
import { Button, Card, Input, Message, StatusBadge, TextArea, centsToEuros, eurosToCents, label } from './ui';

type Category = { slug: string; name: string; subs: { slug: string; name: string }[] };
type Props = { product: AdminProduct; variants: AdminVariant[]; categories: Category[]; checklist: ChecklistItem[]; aiEnabled: boolean };

const STEPS = ['Photos', 'L’essentiel', 'Détails', 'Variantes', 'Textes', 'Publication'] as const;
const lines = (v: string) => v.split('\n').map((s) => s.trim()).filter(Boolean);

const MESSAGES: Record<string, string> = {
  connexion: 'Votre session a expiré. Reconnectez-vous.',
  invalide: 'Vérifiez la saisie (longueurs, prix).',
  erreur: 'Une erreur est survenue. Réessayez.',
  introuvable: 'Cette fiche n’existe plus.',
  'slug-pris': 'Cette adresse est déjà utilisée par une autre pièce.',
  incomplet: 'Une pièce en ligne doit rester complète : complétez la liste de contrôle ou remettez-la en brouillon.',
  doublon: 'Deux variantes ont le même coloris et la même taille.',
  'stock-modifie': 'Une vente a modifié le stock pendant votre saisie. La page a été rechargée : vérifiez puis enregistrez de nouveau.',
  type: 'Format refusé : JPEG, PNG ou WebP seulement.',
  taille: 'Photo trop lourde, même réduite.',
  plein: '12 photos au plus.',
  derniere: 'Une pièce en ligne garde au moins une photo.',
  interdit: 'Seul un brouillon jamais publié peut être supprimé. Archivez-le plutôt.',
  quota: 'Limite de brouillons IA atteinte pour cette heure.',
  faits: 'Saisissez d’abord les matières ou les détails : l’IA n’utilise que vos faits.',
  indisponible: 'Le brouillon IA est indisponible pour le moment.',
};

export default function ProductEditor({ product, variants, categories, checklist, aiEnabled }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [fields, setFields] = useState(() => ({
    name: product.name, slug: product.slug, categoryId: product.categoryId ?? '', subCategory: product.subCategory ?? '',
    price: centsToEuros(product.priceCents), accroche: product.accroche, histoire: product.histoire, description: product.description,
    materials: product.materials.join('\n'), entretien: product.entretien, details: product.details.join('\n'),
    limited: product.limitedEditionSize ? String(product.limitedEditionSize) : '', giftWrap: product.giftWrap,
    tags: product.tags.join('\n'), usages: product.usages.join('\n'), faq: product.faq,
  }));
  const set = (patch: Partial<typeof fields>) => { setFields((f) => ({ ...f, ...patch })); setDirty(true); };
  const category = categories.find((c) => c.slug === fields.categoryId);

  const toInput = (): ProductFields | null => {
    const priceCents = fields.price.trim() ? eurosToCents(fields.price) : 0;
    const limited = fields.limited.trim() ? Number(fields.limited) : null;
    if (priceCents === null || (limited !== null && (!Number.isInteger(limited) || limited < 1))) return null;
    return {
      name: fields.name.trim(), ...(product.publishedAt ? {} : { slug: fields.slug }),
      categoryId: fields.categoryId || null, subCategory: fields.subCategory || null, priceCents,
      accroche: fields.accroche, histoire: fields.histoire, description: fields.description,
      materials: lines(fields.materials), entretien: fields.entretien, details: lines(fields.details),
      faq: fields.faq.filter((f) => f.question.trim() && f.reponse.trim()), limitedEditionSize: limited, giftWrap: fields.giftWrap,
      tags: lines(fields.tags), usages: lines(fields.usages),
    };
  };

  const call = async <T extends { status: string }>(fn: () => Promise<T>, onOk?: (r: T) => void) => {
    setPending(true);
    setNotice(null);
    try {
      const r = await fn();
      if (r.status === 'ok') { onOk?.(r); router.refresh(); } else {
        setNotice(MESSAGES[r.status] ?? MESSAGES.erreur!);
        if (r.status === 'stock-modifie') router.refresh();
      }
      return r;
    } catch (err) {
      if ((err as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) throw err;
      setNotice(MESSAGES.erreur!);
      return null;
    } finally {
      setPending(false);
    }
  };

  const save = async () => {
    const input = toInput();
    if (!input) { setNotice('Prix ou série limitée invalide (exemple de prix : 45,50).'); return false; }
    const r = await call(() => saveFieldsAction({ productId: product.id, fields: input }), () => { setDirty(false); setNotice('Enregistré.'); });
    return r?.status === 'ok';
  };

  // Brouillon : enregistrement automatique en changeant d'étape. Pièce en ligne : seulement sur « Enregistrer ».
  const goTo = async (n: number) => {
    if (dirty && product.status !== 'published' && !(await save())) return;
    setStep(n);
  };

  const missing = checklist.filter((i) => !i.ok);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <Link href="/createur/produits" className={`${label} hover:text-black`}>← Produits</Link>
        <h1 className="font-serif text-3xl flex-1 min-w-0 truncate">{fields.name || 'Sans nom'}</h1>
        <StatusBadge status={product.status} />
      </div>

      <div className="grid lg:grid-cols-[180px_1fr_300px] gap-8 items-start">
        <nav aria-label="Étapes de la fiche" className="flex lg:flex-col gap-2 overflow-x-auto">
          {STEPS.map((s, i) => (
            <button key={s} type="button" onClick={() => goTo(i)} aria-current={step === i ? 'step' : undefined} disabled={pending}
              className={`text-left whitespace-nowrap px-3 py-2 text-[11px] uppercase tracking-[0.12em] border-l ${step === i ? 'border-black bg-white' : 'border-transparent text-neutral-500 hover:text-black'}`}>
              {i + 1}. {s}
            </button>
          ))}
        </nav>

        <Card>
          {notice && <Message>{notice}</Message>}

          {/* Clés : chaque étape repart des valeurs de la base après un enregistrement (stock attendu à jour). */}
          {step === 0 && <PhotosStep key={product.images.map((i) => i.path + i.alt).join('|')} product={product} pending={pending} setPending={setPending} setNotice={setNotice} call={call} />}

          {step === 1 && (
            <section aria-label="L’essentiel">
              <Input label="Nom de la pièce" value={fields.name} maxLength={120} onChange={(e) => set({ name: e.target.value })}
                hint="Une seule capitale, en début de nom (« Cabas imprimé bleu »)." />
              {product.publishedAt ? (
                <p className="text-[13px] text-neutral-500 mb-6">Adresse : /produits/{product.slug} (figée depuis la première mise en ligne)</p>
              ) : (
                <Input label="Adresse de la page" value={fields.slug} maxLength={80} onChange={(e) => set({ slug: e.target.value })}
                  hint="Minuscules et tirets. Figée après la première mise en ligne." />
              )}
              <label className="block mb-6">
                <span className={`${label} block mb-2`}>Univers</span>
                <select value={fields.categoryId} onChange={(e) => set({ categoryId: e.target.value, subCategory: '' })}
                  className="w-full bg-white border-[0.5px] border-neutral-300 p-2 text-[14px]">
                  <option value="">—</option>
                  {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </select>
              </label>
              <label className="block mb-6">
                <span className={`${label} block mb-2`}>Famille</span>
                <select value={fields.subCategory} onChange={(e) => set({ subCategory: e.target.value })} disabled={!category}
                  className="w-full bg-white border-[0.5px] border-neutral-300 p-2 text-[14px]">
                  <option value="">—</option>
                  {category?.subs.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
                </select>
              </label>
              <Input label="Prix TTC (€)" inputMode="decimal" value={fields.price} onChange={(e) => set({ price: e.target.value })} hint="Exemple : 45 ou 45,50." />
            </section>
          )}

          {step === 2 && (
            <section aria-label="Détails">
              <TextArea label="Matières" rows={3} value={fields.materials} onChange={(e) => set({ materials: e.target.value })} hint="Une par ligne (ex. « gaze de coton »)." />
              <TextArea label="Entretien (optionnel)" rows={2} value={fields.entretien} maxLength={400} onChange={(e) => set({ entretien: e.target.value })}
                hint="N’écrivez « lavable » que si c’est vérifié." />
              <TextArea label="Dimensions et détails" rows={4} value={fields.details} onChange={(e) => set({ details: e.target.value })} hint="Une ligne par élément (ex. « Lange : 70 × 70 cm »)." />
              <Input label="Série limitée (optionnel)" inputMode="numeric" value={fields.limited} onChange={(e) => set({ limited: e.target.value })} hint="Nombre d’exemplaires." />
              <label className="flex items-center gap-3 mb-6">
                <input type="checkbox" checked={fields.giftWrap} onChange={(e) => set({ giftWrap: e.target.checked })} className="w-4 h-4 accent-black" />
                <span className="text-[14px]">Emballage cadeau proposé</span>
              </label>
              <TextArea label="Cas d’usage" rows={3} value={fields.usages} onChange={(e) => set({ usages: e.target.value })}
                hint="Un par ligne : naissance, baptême, vacances… Ils serviront à la recherche par usage." />
              <TextArea label="Mots-clés (optionnel)" rows={2} value={fields.tags} onChange={(e) => set({ tags: e.target.value })} hint="Un par ligne." />
            </section>
          )}

          {step === 3 && <VariantsStep key={variants.map((v) => `${v.id}:${v.stock}:${v.active}`).join('|')} product={product} variants={variants} pending={pending} call={call} />}

          {step === 4 && (
            <TextsStep product={product} fields={fields} set={set} aiEnabled={aiEnabled} pending={pending} call={call} />
          )}

          {step === 5 && (
            <section aria-label="Publication">
              <h2 className={`${label} mb-4`}>Liste de contrôle</h2>
              <ul className="mb-8 space-y-2">
                {checklist.map((i) => (
                  <li key={i.key} className="flex gap-3 text-[14px]">
                    <span aria-hidden className={i.ok ? '' : 'text-neutral-400'}>{i.ok ? '✓' : '○'}</span>
                    <span className={i.ok ? '' : 'text-neutral-500'}>{i.label}{i.ok ? '' : ' (à compléter)'}</span>
                  </li>
                ))}
              </ul>
              {dirty && <Message>Des modifications ne sont pas enregistrées.</Message>}
              <div className="flex flex-wrap gap-4">
                {product.status !== 'published' && (
                  <Button disabled={pending || missing.length > 0 || dirty} onClick={() => call(() => publishAction({ productId: product.id }), () => setNotice('La pièce est en ligne.'))}>
                    Mettre en ligne
                  </Button>
                )}
                <Link href={`/createur/apercu/${product.id}`} target="_blank" className="border-[0.5px] border-black bg-white px-6 py-3 text-[11px] uppercase tracking-[0.12em]">
                  Aperçu privé
                </Link>
                {product.status === 'published' && (
                  <Button variant="secondary" disabled={pending} onClick={() => call(() => setStatusAction({ productId: product.id, status: 'draft' }))}>Remettre en brouillon</Button>
                )}
                {product.status !== 'archived' && (
                  <Button variant="secondary" disabled={pending} onClick={() => call(() => setStatusAction({ productId: product.id, status: 'archived' }))}>Archiver</Button>
                )}
                <Button variant="text" disabled={pending} onClick={() => call(() => duplicateProductAction({ productId: product.id }) as Promise<{ status: string }>)}>Dupliquer</Button>
                {product.status === 'draft' && !product.publishedAt && (
                  <Button variant="text" disabled={pending} onClick={() => {
                    if (window.confirm('Supprimer définitivement ce brouillon et ses photos ?')) void call(() => deleteDraftAction({ productId: product.id }));
                  }}>Supprimer le brouillon</Button>
                )}
              </div>
            </section>
          )}

          {[1, 2, 4].includes(step) && (
            <div className="mt-8 flex gap-4">
              <Button disabled={pending || !dirty} onClick={save}>Enregistrer</Button>
              {step < 5 && <Button variant="secondary" disabled={pending} onClick={() => goTo(step + 1)}>Étape suivante</Button>}
            </div>
          )}
        </Card>

        <LivePreview product={product} fields={fields} categoryName={category?.name ?? ''} variants={variants} />
      </div>
    </div>
  );
}

type Call = <T extends { status: string }>(fn: () => Promise<T>, onOk?: (r: T) => void) => Promise<T | null>;

function PhotosStep({ product, pending, setPending, setNotice, call }:
  { product: AdminProduct; pending: boolean; setPending: (v: boolean) => void; setNotice: (v: string | null) => void; call: Call }) {
  const router = useRouter();
  const [images, setImages] = useState(product.images.map((i) => ({ path: i.path, url: i.url, alt: i.alt })));
  const [dirty, setDirty] = useState(false);

  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    setPending(true);
    setNotice(null);
    try {
      for (const file of files) {
        const form = new FormData();
        form.set('productId', product.id);
        form.set('photo', await resizeImage(file), 'photo.jpg');
        const r = (await (await fetch('/api/createur/photos', { method: 'POST', body: form })).json()) as { status: string };
        if (r.status !== 'ok') { setNotice(MESSAGES[r.status] ?? MESSAGES.erreur!); break; }
      }
    } catch {
      setNotice('Cette photo n’a pas pu être lue. Essayez en JPEG.');
    }
    setPending(false);
    router.refresh();
  };

  const move = (i: number, d: -1 | 1) => {
    const next = [...images];
    [next[i], next[i + d]] = [next[i + d]!, next[i]!];
    setImages(next);
    setDirty(true);
  };

  const shown = images;

  return (
    <section aria-label="Photos">
      <label className="block border-[0.5px] border-dashed border-neutral-400 bg-[#F5F2EE] p-8 text-center cursor-pointer mb-6">
        <span className="text-[11px] uppercase tracking-[0.12em]">Ajouter des photos</span>
        <span className="block text-[13px] text-neutral-500 mt-2">JPEG, PNG ou WebP. Réduites avant l’envoi ; la position GPS est retirée.</span>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple onChange={onFiles} disabled={pending} className="sr-only" />
      </label>
      <ol className="space-y-4">
        {shown.map((img, i) => (
          <li key={img.path} className="flex gap-4 items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="" className="w-20 h-24 object-cover bg-neutral-100" />
            <div className="flex-1">
              {i === 0 && <span className={`${label} block mb-1`}>Couverture</span>}
              <Input label={`Texte alternatif de la photo ${i + 1}`} value={img.alt} maxLength={200}
                onChange={(e) => { const next = [...shown]; next[i] = { ...img, alt: e.target.value }; setImages(next); setDirty(true); }}
                hint="Ce que montre la photo (ex. « Cape de bain écrue pliée, vue de dessus »)." />
              <div className="flex gap-4">
                <Button variant="text" disabled={pending || i === 0} onClick={() => move(i, -1)}>Monter</Button>
                <Button variant="text" disabled={pending || i === shown.length - 1} onClick={() => move(i, 1)}>Descendre</Button>
                <Button variant="text" disabled={pending} onClick={() => call(() => removePhotoAction({ productId: product.id, path: img.path }), () => setDirty(false))}>Retirer</Button>
              </div>
            </div>
          </li>
        ))}
      </ol>
      {shown.length > 0 && (
        <Button className="mt-6" disabled={pending || !dirty}
          onClick={() => call(() => updatePhotosAction({ productId: product.id, images: shown.map(({ path, alt }) => ({ path, alt })) }), () => { setDirty(false); setNotice('Photos enregistrées.'); })}>
          Enregistrer l’ordre et les textes
        </Button>
      )}
    </section>
  );
}

type Row = VariantRow & { key: string };

function VariantsStep({ product, variants, pending, call }: { product: AdminProduct; variants: AdminVariant[]; pending: boolean; call: Call }) {
  const toRows = (vs: AdminVariant[]): Row[] => vs.map((v) => ({
    key: v.id, id: v.id, color: v.color ?? '', size: v.size ?? '', stock: v.stock, expectedStock: v.stock,
    dimensions: v.dimensions ?? '', priceCents: v.priceCents, active: v.active,
  }));
  const [rows, setRows] = useState<Row[]>(() => toRows(variants));
  const [colors, setColors] = useState('');
  const [sizes, setSizes] = useState('');
  const update = (i: number, patch: Partial<Row>) => setRows((r) => r.map((row, n) => (n === i ? { ...row, ...patch } : row)));

  const generate = () => {
    const existing = new Set(rows.map((r) => `${r.color}|${r.size}`));
    const added = gridRows(lines(colors.replace(/,/g, '\n')), lines(sizes.replace(/,/g, '\n')))
      .filter((c) => !existing.has(`${c.color}|${c.size}`))
      .map((c, n) => ({ ...c, key: `new-${Date.now()}-${n}`, stock: 0, expectedStock: null, dimensions: '', priceCents: null, active: true }));
    setRows([...rows, ...added]);
  };

  return (
    <section aria-label="Variantes">
      <p className="text-[14px] text-neutral-600 mb-6">Le stock est tenu par variante. Une variante retirée n’est jamais supprimée : décochez « Active ».</p>
      <div className="grid md:grid-cols-2 gap-4 mb-2">
        <Input label="Coloris" value={colors} onChange={(e) => setColors(e.target.value)} hint="Séparés par des virgules." />
        <Input label="Tailles" value={sizes} onChange={(e) => setSizes(e.target.value)} hint="Séparées par des virgules." />
      </div>
      <Button variant="secondary" onClick={generate} disabled={!colors.trim() && !sizes.trim()}>Ajouter à la grille</Button>

      <div className="overflow-x-auto mt-8">
        <table className="w-full text-[14px]">
          <thead>
            <tr className={label}>
              <th className="text-left font-normal pb-2">Coloris</th><th className="text-left font-normal pb-2">Taille</th>
              <th className="text-left font-normal pb-2">Stock</th><th className="text-left font-normal pb-2">Dimensions</th>
              <th className="text-left font-normal pb-2">Prix (€)</th><th className="text-left font-normal pb-2">Active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.key} className="border-t-[0.5px] border-neutral-200">
                <td className="py-2 pr-2">{r.id ? (r.color || '—') : <input aria-label="Coloris" value={r.color} onChange={(e) => update(i, { color: e.target.value })} className="w-24 border-b-[0.5px] border-neutral-400 bg-transparent" />}</td>
                <td className="py-2 pr-2">{r.id ? (r.size || '—') : <input aria-label="Taille" value={r.size} onChange={(e) => update(i, { size: e.target.value })} className="w-20 border-b-[0.5px] border-neutral-400 bg-transparent" />}</td>
                <td className="py-2 pr-2"><input aria-label={`Stock ${[r.color, r.size].filter(Boolean).join(' ') || 'unique'}`} type="number" min={0} max={9999} value={r.stock}
                  onChange={(e) => update(i, { stock: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} className="w-16 border-b-[0.5px] border-neutral-400 bg-transparent" /></td>
                <td className="py-2 pr-2"><input aria-label="Dimensions" value={r.dimensions} maxLength={80} onChange={(e) => update(i, { dimensions: e.target.value })} className="w-32 border-b-[0.5px] border-neutral-400 bg-transparent" /></td>
                <td className="py-2 pr-2"><input aria-label="Prix spécifique" inputMode="decimal" defaultValue={r.priceCents ? centsToEuros(r.priceCents) : ''}
                  onChange={(e) => update(i, { priceCents: e.target.value.trim() ? eurosToCents(e.target.value) : null })} placeholder={formatEuros(product.priceCents || 0)} className="w-16 border-b-[0.5px] border-neutral-400 bg-transparent" /></td>
                <td className="py-2"><input aria-label="Active" type="checkbox" checked={r.active} onChange={(e) => update(i, { active: e.target.checked })} className="w-4 h-4 accent-black" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button className="mt-6" disabled={pending}
        onClick={() => call(() => saveVariantsAction({
          productId: product.id,
          rows: rows.map((r) => ({
            ...(r.id ? { id: r.id } : {}), color: r.color, size: r.size, stock: r.stock, expectedStock: r.expectedStock,
            dimensions: r.dimensions, priceCents: r.priceCents, active: r.active,
          })),
        }))}>
        Enregistrer les variantes
      </Button>
    </section>
  );
}

type Fields = { accroche: string; histoire: string; description: string; faq: { question: string; reponse: string }[] };

function TextsStep({ product, fields, set, aiEnabled, pending, call }:
  { product: AdminProduct; fields: Fields; set: (p: Partial<Fields>) => void; aiEnabled: boolean; pending: boolean; call: Call }) {
  const [proposals, setProposals] = useState<AiProposals | null>(null);
  const needsReview = !!product.aiDraft.generatedAt && !product.aiDraft.reviewed;
  const keys = { accroche: 'accroches', histoire: 'histoires', description: 'descriptions' } as const;

  const field = (key: keyof typeof keys, title: string, rows: number, max: number) => (
    <div className="mb-2">
      <TextArea label={title} rows={rows} maxLength={max} value={fields[key]} onChange={(e) => set({ [key]: e.target.value })} />
      {proposals?.[keys[key]].map((text, n) => (
        <div key={n} className="bg-[#F5F2EE] p-4 mb-3 text-[14px] leading-relaxed">
          <span className={`${label} block mb-2`}>Proposition {n + 1}</span>
          <p className="mb-3 whitespace-pre-line">{text}</p>
          <Button variant="text" onClick={() => set({ [key]: text })}>Utiliser</Button>
        </div>
      ))}
    </div>
  );

  return (
    <section aria-label="Textes">
      {aiEnabled && (
        <div className="mb-8">
          <Button variant="secondary" disabled={pending} onClick={() => call(() => draftAiAction({ productId: product.id }), (r) => {
            if ('proposals' in r) setProposals(r.proposals as AiProposals);
          })}>Proposer un brouillon</Button>
          <p className="text-[13px] text-neutral-500 mt-2">L’IA n’utilise que les faits saisis. Rien n’est enregistré tant que vous ne cliquez pas « Utiliser » puis « Enregistrer ».</p>
        </div>
      )}
      {field('accroche', 'Accroche (une phrase)', 2, 200)}
      {field('histoire', 'Histoire (optionnel)', 3, 800)}
      {field('description', 'Description', 6, 4000)}

      <h2 className={`${label} mb-3 mt-6`}>Questions fréquentes (optionnel)</h2>
      {fields.faq.map((f, i) => (
        <div key={i} className="mb-4">
          <Input label={`Question ${i + 1}`} value={f.question} maxLength={200} onChange={(e) => set({ faq: fields.faq.map((x, n) => (n === i ? { ...x, question: e.target.value } : x)) })} />
          <TextArea label={`Réponse ${i + 1}`} rows={2} value={f.reponse} maxLength={800} onChange={(e) => set({ faq: fields.faq.map((x, n) => (n === i ? { ...x, reponse: e.target.value } : x)) })} />
          <Button variant="text" onClick={() => set({ faq: fields.faq.filter((_, n) => n !== i) })}>Retirer la question</Button>
        </div>
      ))}
      {fields.faq.length < 10 && <Button variant="text" onClick={() => set({ faq: [...fields.faq, { question: '', reponse: '' }] })}>Ajouter une question</Button>}

      {needsReview && (
        <div className="mt-8 border-l border-black pl-4">
          <p className="text-[14px] mb-3">Un brouillon IA a été proposé. Relisez les textes avant la mise en ligne.</p>
          <Button variant="secondary" disabled={pending} onClick={() => call(() => reviewAiAction({ productId: product.id }))}>J’ai relu les textes</Button>
        </div>
      )}
    </section>
  );
}

// Aperçu en direct : ce que la cliente verra (photo de couverture, nom, prix, accroche, rubriques).
function LivePreview({ product, fields, categoryName, variants }:
  { product: AdminProduct; fields: { name: string; price: string; accroche: string; description: string; materials: string; entretien: string; details: string }; categoryName: string; variants: AdminVariant[] }) {
  const cover = product.images[0];
  const cents = eurosToCents(fields.price);
  const available = variants.some((v) => v.active && v.stock > 0);
  return (
    <aside aria-label="Aperçu" className="bg-white border-[0.5px] border-neutral-300 lg:sticky lg:top-32">
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
    </aside>
  );
}
