/* eslint-disable max-len */
/**
 * DATASET DE TESTS — Smart Search Jaelle & JC
 * ─────────────────────────────────────────────
 * Usage : lancer manuellement ou dans un script de eval.
 * Pour chaque requête : requête brute, top1 attendu (nom produit ou catégorie),
 * top3 acceptable, et signal dominant attendu.
 *
 * Protocole de mesure :
 *   1. Lancer analyzeIntent sur chaque requête
 *   2. Vérifier que expectedTop1 est dans results[0].name (insensible à la casse)
 *   3. Vérifier que expectedTop3 contient results[0..2]
 *   4. Calculer : top1_accuracy = hits / total, top3_accuracy = hits / total
 *   5. Si top1_accuracy < 0.70 → ajuster prompt ou ATTR_MAP
 *
 * Cible : top1 ≥ 70%, top3 ≥ 90%
 */

export type TestCase = {
    id: string;
    query: string;
    expectedTop1Category: string | null; // catégorie Firestore attendue en résultat #1
    expectedAttributes: string[]; // attributs que l'IA doit extraire
    expectedSignal: "intent" | "matiere" | "category" | "cadeau"; // signal dominant
    note?: string;
  };

export const TEST_CASES: TestCase[] = [
  // ── CADEAUX NAISSANCE ──────────────────────────────────────────────────
  {
    id: "T01",
    query: "cadeau naissance original",
    expectedTop1Category: "naissance",
    expectedAttributes: ["cadeau"],
    expectedSignal: "cadeau",
  },
  {
    id: "T02",
    query: "idée cadeau pour bébé fait main",
    expectedTop1Category: "naissance",
    expectedAttributes: ["cadeau", "artisanal"],
    expectedSignal: "cadeau",
  },
  {
    id: "T03",
    query: "coffret naissance luxe made in France",
    expectedTop1Category: "naissance",
    expectedAttributes: ["cadeau", "premium"],
    expectedSignal: "intent",
    note: "Le mot 'coffret' doit matcher l'attribut cadeau via ATTR_MAP",
  },
  {
    id: "T04",
    query: "quelque chose à offrir pour un bébé",
    expectedTop1Category: "naissance",
    expectedAttributes: ["cadeau"],
    expectedSignal: "cadeau",
    note: "Requête vague — tester que confidence < 0.6 et clarify_if_needed non null",
  },
  {
    id: "T05",
    query: "cadeau naissance moins de 80 euros",
    expectedTop1Category: "naissance",
    expectedAttributes: ["cadeau"],
    expectedSignal: "cadeau",
    note: "Contrainte prix doit remonter dans constraints[]",
  },

  // ── MATIÈRES NATURELLES ────────────────────────────────────────────────
  {
    id: "T06",
    query: "vêtement en lin pour bébé",
    expectedTop1Category: "enfant",
    expectedAttributes: ["naturel"],
    expectedSignal: "matiere",
  },
  {
    id: "T07",
    query: "body coton biologique",
    expectedTop1Category: "enfant",
    expectedAttributes: ["naturel"],
    expectedSignal: "matiere",
  },
  {
    id: "T08",
    query: "matière naturelle et douce pour nourrisson",
    expectedTop1Category: "naissance",
    expectedAttributes: ["naturel", "doux"],
    expectedSignal: "matiere",
  },
  {
    id: "T09",
    query: "pièce en lin naturel",
    expectedTop1Category: null, // catégorie non précisée
    expectedAttributes: ["naturel"],
    expectedSignal: "matiere",
  },
  {
    id: "T10",
    query: "tissu naturel durable pour enfant",
    expectedTop1Category: "enfant",
    expectedAttributes: ["naturel"],
    expectedSignal: "matiere",
  },

  // ── FEMME ──────────────────────────────────────────────────────────────
  {
    id: "T11",
    query: "haut femme en lin",
    expectedTop1Category: "femme",
    expectedAttributes: ["naturel"],
    expectedSignal: "matiere",
  },
  {
    id: "T12",
    query: "cabas femme artisanal",
    expectedTop1Category: "femme",
    expectedAttributes: ["artisanal"],
    expectedSignal: "category",
  },
  {
    id: "T13",
    query: "tenue femme élégante pour cérémonie",
    expectedTop1Category: "femme",
    expectedAttributes: ["premium"],
    expectedSignal: "category",
    note: "usage_context doit contenir 'ceremonie'",
  },
  {
    id: "T14",
    query: "robe femme minimaliste",
    expectedTop1Category: "femme",
    expectedAttributes: [],
    expectedSignal: "category",
  },
  {
    id: "T15",
    query: "blouse légère pour l'été",
    expectedTop1Category: "femme",
    expectedAttributes: ["leger"],
    expectedSignal: "category",
  },

  // ── ACCESSOIRES ────────────────────────────────────────────────────────
  {
    id: "T16",
    query: "sac à main artisanal",
    expectedTop1Category: "accessoire",
    expectedAttributes: ["artisanal"],
    expectedSignal: "category",
  },
  {
    id: "T17",
    query: "pochette en lin faite main",
    expectedTop1Category: "accessoire",
    expectedAttributes: ["naturel", "artisanal"],
    expectedSignal: "matiere",
  },
  {
    id: "T18",
    query: "accessoire cadeau femme luxe",
    expectedTop1Category: "accessoire",
    expectedAttributes: ["cadeau", "premium"],
    expectedSignal: "cadeau",
  },

  // ── REQUÊTES PAR USAGE ─────────────────────────────────────────────────
  {
    id: "T19",
    query: "vêtement pour tous les jours pas synthétique",
    expectedTop1Category: null,
    expectedAttributes: ["naturel"],
    expectedSignal: "intent",
    note: "'pas synthétique' = contrainte, doit remonter dans constraints[]",
  },
  {
    id: "T20",
    query: "tenue confortable pour sortie quotidienne",
    expectedTop1Category: null,
    expectedAttributes: ["doux"],
    expectedSignal: "intent",
    note: "usage_context doit contenir 'quotidien'",
  },
  {
    id: "T21",
    query: "pièce chic pour déjeuner en ville",
    expectedTop1Category: "femme",
    expectedAttributes: ["premium"],
    expectedSignal: "category",
  },
  {
    id: "T22",
    query: "vêtement chaud pour l'hiver",
    expectedTop1Category: null,
    expectedAttributes: ["chaud"],
    expectedSignal: "intent",
  },

  // ── REQUÊTES MULTI-CRITÈRES ────────────────────────────────────────────
  {
    id: "T23",
    query: "cadeau naissance en matière naturelle et durable",
    expectedTop1Category: "naissance",
    expectedAttributes: ["cadeau", "naturel"],
    expectedSignal: "cadeau",
    note: "Requête de référence — doit scorer ≥ 60/100",
  },
  {
    id: "T24",
    query: "pièce artisanale made in France cadeau",
    expectedTop1Category: null,
    expectedAttributes: ["artisanal", "cadeau", "premium"],
    expectedSignal: "intent",
  },
  {
    id: "T25",
    query: "ensemble bébé coton doux premium",
    expectedTop1Category: "enfant",
    expectedAttributes: ["naturel", "doux", "premium"],
    expectedSignal: "matiere",
  },

  // ── REQUÊTES MOT-CLÉ COURT ────────────────────────────────────────────
  {
    id: "T26",
    query: "cabas",
    expectedTop1Category: null,
    expectedAttributes: [],
    expectedSignal: "category",
    note: "query_type doit être 'keyword'",
  },
  {
    id: "T27",
    query: "lin",
    expectedTop1Category: null,
    expectedAttributes: ["naturel"],
    expectedSignal: "matiere",
    note: "query_type doit être 'keyword'",
  },
  {
    id: "T28",
    query: "naissance",
    expectedTop1Category: "naissance",
    expectedAttributes: ["cadeau"],
    expectedSignal: "category",
  },
  {
    id: "T29",
    query: "bébé naturel",
    expectedTop1Category: "enfant",
    expectedAttributes: ["naturel"],
    expectedSignal: "matiere",
  },
  {
    id: "T30",
    query: "robe lin femme made in France",
    expectedTop1Category: "femme",
    expectedAttributes: ["naturel"],
    expectedSignal: "matiere",
    note: "'made in france' doit remonter dans constraints[]",
  },

  // ── REQUÊTES AMBIGUËS (tester clarify_if_needed) ─────────────────────
  {
    id: "T31",
    query: "quelque chose de beau",
    expectedTop1Category: null,
    expectedAttributes: [],
    expectedSignal: "intent",
    note: "confidence doit être < 0.4, clarify_if_needed non null",
  },
  {
    id: "T32",
    query: "je cherche un cadeau",
    expectedTop1Category: null,
    expectedAttributes: ["cadeau"],
    expectedSignal: "cadeau",
    note: "Trop vague — clarify_if_needed doit demander pour qui / quel budget",
  },
  {
    id: "T33",
    query: "tissu doux",
    expectedTop1Category: null,
    expectedAttributes: ["doux"],
    expectedSignal: "matiere",
    note: "Pas de catégorie — le moteur doit proposer les produits les plus doux du catalogue",
  },

  // ── REQUÊTES HORS CATALOGUE (tester robustesse) ───────────────────────
  {
    id: "T34",
    query: "chaussures cuir homme",
    expectedTop1Category: null,
    expectedAttributes: [],
    expectedSignal: "category",
    note: "Hors catalogue — results[] doit être vide ou score < 20",
  },
  {
    id: "T35",
    query: "manteau imperméable",
    expectedTop1Category: null,
    expectedAttributes: ["impermeable"],
    expectedSignal: "intent",
    note: "Si aucun produit imperméable en stock, results[0].score doit être < 30",
  },
];

/**
   * GRILLE D'ÉVALUATION — à remplir après chaque session de test
   *
   * | ID  | Query                                      | Top1 ok | Top3 ok | Score | Notes               |
   * |-----|--------------------------------------------|---------|---------|-------|---------------------|
   * | T01 | cadeau naissance original                  |         |         |       |                     |
   * | T23 | cadeau naissance en matière naturelle...   |         |         |       | Requête de référence|
   * ...
   *
   * SEUILS D'ALERTE :
   *   - top1_accuracy < 70% → réviser ATTR_MAP ou pondérations dans scoreProduct()
   *   - top1_accuracy < 50% → réviser le prompt OpenAI (system message)
   *   - T31/T32 confidence > 0.5 → le prompt ne gère pas bien les requêtes vagues
   *   - T34/T35 score > 30 → le scoring est trop permissif, réduire les poids lexicaux
   */
