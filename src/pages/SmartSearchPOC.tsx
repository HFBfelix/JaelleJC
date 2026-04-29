/* eslint-disable max-len */
import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../lib/firebase';

type Product = {
  id: string;
  name?: string;
  description?: string;
  category?: string;
  subCategory?: string;
  matieres?: string;
  dimensions?: string;
  seo_tags?: string;
  seo_metadata?: {
    intents?: string[];
    invisible_tags?: string;
  };
  price?: number;
  stock?: number;
  status?: string;
  images?: string[];
};

type IntentJSON = {
  query_type: 'keyword' | 'intent' | 'mixed';
  category: string | null;
  attributes: string[];
  usage_context: string[];
  constraints: string[];
  confidence: number;
  clarify_if_needed: string | null;
};

type MatchResult = {
  product: Product;
  score: number;
  reasons: string[];
};

// Fonctions utilitaires conservées pour le matching local des résultats
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function tokenize(text: string): string[] {
  return normalize(text)
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function searchableText(p: Product): string {
  return normalize(
    [
      p.name,
      p.description,
      p.category,
      p.subCategory,
      p.matieres,
      p.dimensions,
      p.seo_tags,
      p.seo_metadata?.invisible_tags,
      ...(p.seo_metadata?.intents || []),
    ]
      .filter(Boolean)
      .join(' ')
  );
}

function computeMatches(products: Product[], queryText: string, intent: IntentJSON): MatchResult[] {
  const q = normalize(queryText);
  const tokens = tokenize(queryText);

  return products
    .filter((p) => (p.status ? p.status === 'published' || p.status === 'draft' : true))
    .filter((p) => (typeof p.stock === 'number' ? p.stock > 0 : true))
    .map((p) => {
      const text = searchableText(p);
      let score = 0;
      const reasons: string[] = [];

      const tokenHits = tokens.filter((t) => text.includes(t)).length;
      const lexicalScore = Math.min(35, tokenHits * 7);
      score += lexicalScore;
      if (lexicalScore > 0) reasons.push('Correspondance sur les mots-clés.');

      if (intent.category && p.category === intent.category) {
        score += 20;
        reasons.push(`Catégorie alignée : ${intent.category}.`);
      }

      const attrMapToText: Record<string, string[]> = {
        impermeable: ['imperm', 'pluie', 'eau'],
        coupe_vent: ['vent'],
        doux: ['doux', 'confort', 'moelleux'],
        respirant: ['respirant', 'leger', 'aere'],
        chaud: ['chaud', 'hiver', 'froid'],
        naturel: ['lin', 'coton', 'naturel'],
        premium: ['luxe', 'premium', 'haut de gamme'],
        cadeau: ['cadeau', 'naissance', 'coffret'],
      };

      let attrHits = 0;
      for (const attr of intent.attributes) {
        const probes = attrMapToText[attr] || [];
        if (probes.some((probe) => text.includes(probe))) attrHits += 1;
      }
      if (attrHits > 0) {
        score += Math.min(25, attrHits * 8);
        reasons.push(`Attributs compatibles détectés.`);
      }

      const usageHits = intent.usage_context.filter((u) => text.includes(normalize(u))).length;
      if (usageHits > 0) {
        score += Math.min(10, usageHits * 5);
        reasons.push('Usage recherché pris en compte.');
      }

      if (p.seo_metadata?.intents?.length) {
        score += 5;
        reasons.push('Fiche enrichie par IA.');
      }

      score = Math.max(0, Math.min(100, Math.round(score)));
      if (!reasons.length) reasons.push('Alternative proche de votre demande.');

      return { product: p, score, reasons: reasons.slice(0, 3) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

const SmartSearchPOC: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [queryText, setQueryText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [intent, setIntent] = useState<IntentJSON | null>(null);
  const [results, setResults] = useState<MatchResult[]>([]);

  // Initialisation des fonctions Firebase
  const functions = getFunctions(undefined, 'us-central1');
  const analyzeIntentCloud = httpsCallable(functions, 'analyzeIntent');

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'produits'), orderBy('createdAt', 'desc')),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, 'id'>) }));
        setProducts(list);
        setLoadingData(false);
      }
    );
    return () => unsub();
  }, []);

  const recommendedText = useMemo(() => {
    if (!intent || !results.length) return '';
    const best = results[0];
    if (intent.query_type === 'keyword') {
      return `Voici les produits les plus proches de votre recherche : "${queryText}".`;
    }
    return `Voici les modèles les plus pertinents pour votre besoin (match ${best.score}%).`;
  }, [intent, results, queryText]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryText.trim()) return;

    setIsThinking(true);
    setIntent(null);
    setResults([]);

    try {
      // APPEL AU BACKEND SECURISE (OpenAI est appelé ici, pas dans le front)
      const { data } = await analyzeIntentCloud({ query: queryText });
      const parsedIntent = data as IntentJSON;

      // Matching des produits localement pour la réactivité UX
      const matched = computeMatches(products, queryText, parsedIntent);

      setIntent(parsedIntent);
      setResults(matched);
    } catch (error) {
      console.error("Erreur d'analyse IA:", error);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="min-h-screen bg-white px-6 md:px-12 py-10">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.35em] text-neutral-400 mb-3">POC Smart Search</p>
          <h1 className="font-serif italic text-4xl md:text-5xl text-black leading-tight">
            Search augmentée (Anti-Chatbot)
          </h1>
          <p className="mt-4 text-sm text-neutral-600 max-w-2xl">
            Entrez un mot-clé ou un besoin complet. Le moteur propose les 1 à 3 produits les plus adaptés.
          </p>
        </header>

        <form onSubmit={handleAnalyze} className="mb-8">
          <div className="border border-black rounded-full px-6 py-3 flex items-center gap-3">
            <input
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder='Ex: "Je veux un cadeau naissance en matière naturelle et durable"'
              className="flex-1 outline-none bg-transparent text-sm md:text-base"
            />
            <button
              type="submit"
              className="bg-black text-white text-[10px] uppercase tracking-[0.2em] px-4 py-2 rounded-full"
              disabled={loadingData || isThinking}
            >
              Analyser
            </button>
          </div>
        </form>

        {isThinking && (
          <div className="mb-8 border border-neutral-200 rounded-2xl p-5 bg-neutral-50">
            <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 animate-pulse">
              Analyse de votre besoin par l'IA...
            </p>
          </div>
        )}

        {!isThinking && intent && (
          <div className="mb-8 border border-neutral-200 rounded-2xl p-5">
            <p className="text-sm text-neutral-700">{recommendedText}</p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-neutral-600">
              <div>
                <p className="font-semibold text-neutral-800 mb-1">Lecture intention (IA Cloud)</p>
                <ul className="space-y-1">
                  <li>Type: {intent.query_type}</li>
                  <li>Catégorie: {intent.category || 'non détectée'}</li>
                  <li>Attributs: {intent.attributes.length ? intent.attributes.join(', ') : '—'}</li>
                  <li>Usage: {intent.usage_context.length ? intent.usage_context.join(', ') : '—'}</li>
                  <li>Confiance: {Math.round(intent.confidence * 100)}%</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-neutral-800 mb-1">Transparence</p>
                <p>
                  Si aucun produit n’est un match fort, le système propose l’alternative la plus proche.
                </p>
                {intent.clarify_if_needed && (
                  <p className="mt-2 italic text-neutral-500">{intent.clarify_if_needed}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {loadingData ? (
          <p className="text-neutral-400 italic">Chargement des produits…</p>
        ) : (
          <section>
            <h2 className="text-[11px] uppercase tracking-[0.25em] text-neutral-500 mb-4">
              Match parfait (Top 1–3)
            </h2>

            {!results.length && !isThinking ? (
              <p className="text-sm text-neutral-500">
                Lancez une recherche pour afficher des recommandations.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {results.map(({ product, score, reasons }, idx) => (
                  <article key={product.id} className="border border-neutral-200 rounded-2xl overflow-hidden bg-white">
                    <div className="aspect-[4/5] bg-neutral-100">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.name || 'Produit'} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">
                          Image indisponible
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 mb-2">
                        #{idx + 1} — Match {score}%
                      </p>
                      <h3 className="font-serif italic text-lg text-black mb-1">
                        {product.name || 'Produit sans nom'}
                      </h3>
                      <p className="text-sm text-neutral-600 mb-3">
                        {typeof product.price === 'number' ? `${product.price} €` : 'Prix non renseigné'}
                      </p>

                      <ul className="space-y-1 mb-4">
                        {reasons.map((r, i) => (
                          <li key={i} className="text-xs text-neutral-600">
                            • {r}
                          </li>
                        ))}
                      </ul>

                      <Link
                        to={`/product/${product.id}`}
                        className="inline-block text-[10px] uppercase tracking-[0.2em] border border-black px-3 py-2 hover:bg-black hover:text-white transition-colors"
                      >
                        Voir le produit
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default SmartSearchPOC;