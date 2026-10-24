/* eslint-disable max-len */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

type IntentJSON = {
  query_type: 'keyword' | 'intent' | 'mixed';
  category: string | null;
  sub_category: string | null;
  attributes: string[];
  usage_context: string[];
  constraints: string[];
  confidence: number;
  clarify_if_needed: string | null;
};

type MatchResult = {
  productId: string;
  name: string;
  price: number | null;
  images: string[];
  score: number;
  reasons: string[];
};

type AnalyzeResponse = {
  intent: IntentJSON;
  results: MatchResult[];
};

const SmartSearchPOC: React.FC = () => {
  const [queryText, setQueryText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [intent, setIntent] = useState<IntentJSON | null>(null);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const analyzeIntentCloud = httpsCallable<{ query: string }, AnalyzeResponse>(functions, 'analyzeIntent');

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryText.trim()) return;
  
    setIsThinking(true);
    setIntent(null);
    setResults([]);
    setError(null);
  
    try {
      const { data } = await analyzeIntentCloud({ query: queryText });
  
      const safeIntent: IntentJSON = {
        query_type: data?.intent?.query_type ?? 'mixed',
        category: data?.intent?.category ?? null,
        sub_category: data?.intent?.sub_category ?? null,
        attributes: Array.isArray(data?.intent?.attributes) ? data.intent.attributes : [],
        usage_context: Array.isArray(data?.intent?.usage_context) ? data.intent.usage_context : [],
        constraints: Array.isArray(data?.intent?.constraints) ? data.intent.constraints : [],
        confidence: typeof data?.intent?.confidence === 'number' ? data.intent.confidence : 0.5,
        clarify_if_needed: data?.intent?.clarify_if_needed ?? null,
      };
  
      const safeResults: MatchResult[] = Array.isArray(data?.results) ? data.results : [];
  
      setIntent(safeIntent);
      setResults(safeResults);
    } catch (err) {
      console.error("Erreur d'analyse IA:", err);
      setError('Analyse indisponible. Vérifiez la configuration Functions/OpenAI.');
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
              placeholder='Ex: "Je cherche un cadeau de naissance en matière naturelle"'
              className="flex-1 outline-none bg-transparent text-sm md:text-base"
            />
            <button
              type="submit"
              className="bg-black text-white text-[10px] uppercase tracking-[0.2em] px-4 py-2 rounded-full"
              disabled={isThinking}
            >
              Analyser
            </button>
          </div>
        </form>

        {isThinking && (
          <div className="mb-8 border border-neutral-200 rounded-2xl p-5 bg-neutral-50">
            <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 animate-pulse">
              Analyse de votre besoin par l&apos;IA...
            </p>
          </div>
        )}

        {error && (
          <div className="mb-8 border border-red-200 rounded-2xl p-5 bg-red-50">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!isThinking && intent && (
          <div className="mb-8 border border-neutral-200 rounded-2xl p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-neutral-600">
              <div>
                <p className="font-semibold text-neutral-800 mb-1">Intention analysée</p>
                <ul className="space-y-1">
                  <li>Type : {intent.query_type}</li>
                  <li>Catégorie : {intent.category || '—'}</li>
                  <li>Sous-catégorie : {intent.sub_category || '—'}</li>
                  <li>Attributs : {Array.isArray(intent.attributes) && intent.attributes.length ? intent.attributes.join(', ') : '—'}</li>
                <li>Usage : {Array.isArray(intent.usage_context) && intent.usage_context.length ? intent.usage_context.join(', ') : '—'}</li>
                <li>Confiance : {Math.round((intent.confidence ?? 0.5) * 100)}%</li>
                </ul>
              </div>
              <div>
                {intent.clarify_if_needed && (
                  <>
                    <p className="font-semibold text-neutral-800 mb-1">Question de précision</p>
                    <p className="italic text-neutral-500">{intent.clarify_if_needed}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <section>
          <h2 className="text-[11px] uppercase tracking-[0.25em] text-neutral-500 mb-4">
            Match parfait (Top 1–3)
          </h2>

          {!isThinking && results.length === 0 && !error ? (
            <p className="text-sm text-neutral-500">
              Aucun match suffisamment pertinent. Essayez d’ajouter un usage (ex: “cadeau naissance”),
              une matière (ex: “lin”), ou une catégorie (Bébé, Femmes, Coffrets).
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {results.map(({ productId, name, price, images, score, reasons }, idx) => (
                <article key={productId} className="border border-neutral-200 rounded-2xl overflow-hidden bg-white">
                  <div className="aspect-[4/5] bg-neutral-100">
                    {images[0] ? (
                      <img src={images[0]} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">
                        Image indisponible
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 mb-2">
                      #{idx + 1} — Score {score}/100
                    </p>
                    <h3 className="font-serif italic text-lg text-black mb-1">{name}</h3>
                    <p className="text-sm text-neutral-600 mb-3">
                      {price !== null ? `${price} €` : 'Prix non renseigné'}
                    </p>

                    <ul className="space-y-1 mb-4">
                      {reasons.map((r, i) => (
                        <li key={i} className="text-xs text-neutral-500">
                          · {r}
                        </li>
                      ))}
                    </ul>

                    <Link
                      to={`/product/${productId}`}
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
      </div>
    </div>
  );
};

export default SmartSearchPOC;