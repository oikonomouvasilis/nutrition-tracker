// Server-only. Δωρεάν εύρεση θρεπτικών στοιχείων:
//   1) Open Food Facts (text search) -> πολλαπλά υποψήφια branded προϊόντα + σύνδεσμοι
//   2) Gemini (Google Search grounding)  -> 1 εκτίμηση με μακρο + βιταμίνες/μέταλλα
// + σύνδεσμοι αναζήτησης σε όλο το web ώστε ο χρήστης να επαληθεύσει/επιλέξει.
//
// PRIVACY BOUNDARY: στέλνουμε ΜΟΝΟ την περιγραφή τροφής στις εξωτερικές υπηρεσίες,
// ΠΟΤΕ προσωπικά δεδομένα (ημερολόγιο, στατιστικά κ.λπ.).

import { NUTRIENTS, MICRO_JSON_KEYS } from "@/lib/nutrients";

export interface FoodCandidate {
  name: string;
  brand?: string;
  calories_per_100: number;
  protein_per_100: number;
  carbs_per_100: number;
  fats_per_100: number;
  fiber_per_100?: number;
  sugar_per_100?: number;
  sodium_per_100?: number; // mg
  micronutrients?: Record<string, number>;
  source: "openfoodfacts" | "ai";
  confidence?: "high" | "medium" | "low";
  url?: string;
}

export interface FoodLookup {
  candidates: FoodCandidate[];
  searchLinks: { label: string; url: string }[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function num(v: unknown, fallback = 0): number {
  const x = typeof v === "string" ? parseFloat(v) : v;
  return typeof x === "number" && Number.isFinite(x) && x >= 0 ? x : fallback;
}

/** Καθαρίζει micronutrients object: μόνο γνωστά κλειδιά, θετικοί αριθμοί. */
function cleanMicros(input: unknown): Record<string, number> | undefined {
  if (!input || typeof input !== "object") return undefined;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (!MICRO_JSON_KEYS.has(k)) continue;
    const n = num(v, -1);
    if (n >= 0) out[k] = round1(n);
  }
  return Object.keys(out).length ? out : undefined;
}

// ---------------------------------------------------------------------------
// Open Food Facts (δωρεάν, χωρίς key) — πολλαπλά υποψήφια προϊόντα
// ---------------------------------------------------------------------------
type Nutriments = Record<string, number | string | undefined>;
interface OffProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  nutriments?: Nutriments;
}

async function lookupOpenFoodFacts(query: string): Promise<FoodCandidate[]> {
  try {
    const url =
      "https://world.openfoodfacts.org/cgi/search.pl?" +
      `search_terms=${encodeURIComponent(query)}` +
      "&search_simple=1&action=process&json=1&page_size=12" +
      "&fields=code,product_name,brands,nutriments";
    const res = await fetch(url, {
      headers: { "User-Agent": "nutrition-tracker/1.0 (personal project)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    if (!res.headers.get("content-type")?.includes("json")) return [];

    const data = (await res.json()) as { products?: OffProduct[] };
    const tokens = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length >= 3);

    const out: FoodCandidate[] = [];
    for (const p of data.products ?? []) {
      const n = p.nutriments ?? {};
      const cal = num(n["energy-kcal_100g"], -1);
      if (cal <= 0) continue;

      const label = `${p.brands ?? ""} ${p.product_name ?? ""}`.trim();
      const hay = label.toLowerCase();
      const relevant = tokens.length === 0 || tokens.some((t) => hay.includes(t));
      if (!relevant) continue;

      // νάτριο: sodium_100g (g) ή από salt_100g (g) ÷ 2.5 -> mg
      const sodiumG =
        n["sodium_100g"] !== undefined
          ? num(n["sodium_100g"])
          : num(n["salt_100g"]) / 2.5;

      out.push({
        name: p.product_name?.trim() || label || query,
        brand: p.brands?.split(",")[0]?.trim() || undefined,
        calories_per_100: round1(cal),
        protein_per_100: round1(num(n["proteins_100g"])),
        carbs_per_100: round1(num(n["carbohydrates_100g"])),
        fats_per_100: round1(num(n["fat_100g"])),
        fiber_per_100: n["fiber_100g"] !== undefined ? round1(num(n["fiber_100g"])) : undefined,
        sugar_per_100: n["sugars_100g"] !== undefined ? round1(num(n["sugars_100g"])) : undefined,
        sodium_per_100: sodiumG > 0 ? Math.round(sodiumG * 1000) : undefined,
        source: "openfoodfacts",
        url: p.code ? `https://world.openfoodfacts.org/product/${p.code}` : undefined,
      });
      if (out.length >= 6) break;
    }
    return out;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Gemini (free tier) + Google Search grounding — 1 εκτίμηση με βιταμίνες
// ---------------------------------------------------------------------------
interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

function extractJson(text: string): Record<string, unknown> | null {
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function lookupGemini(query: string): Promise<FoodCandidate | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const microSpec = NUTRIENTS.filter((nu) => nu.storage === "json")
    .map((nu) => `"${nu.key}"(${nu.unit})`)
    .join(", ");

  const prompt =
    `Τροφή ή προϊόν: "${query}".\n` +
    "Βρες τα θρεπτικά στοιχεία ΑΝΑ 100 γραμμάρια (ή 100ml αν είναι υγρό), από αξιόπιστες πηγές.\n" +
    "Απάντησε ΜΟΝΟ με ένα JSON object, χωρίς άλλο κείμενο:\n" +
    '{"name":"σύντομο όνομα","calories_per_100":number,"protein_per_100":number,' +
    '"carbs_per_100":number,"fats_per_100":number,"fiber_per_100":number,' +
    '"sugar_per_100":number,"sodium_per_100":number(mg),' +
    '"micronutrients":{...},"confidence":"high|medium|low"}\n' +
    `Στο micronutrients βάλε όσα γνωρίζεις, με ΑΚΡΙΒΩΣ αυτά τα κλειδιά & μονάδες: ${microSpec}. ` +
    "Παράλειψε όσα δεν γνωρίζεις (μη βάζεις 0 ή null).";

  const endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    `gemini-2.5-flash:generateContent?key=${key}`;
  const requestBody = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.2 },
  });

  let res: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      res = null;
    }
    if (res?.ok) break;
    if (attempt < 2 && (!res || res.status === 503 || res.status === 429)) {
      await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
      continue;
    }
    break;
  }
  if (!res?.ok) return null;

  const data = (await res.json().catch(() => null)) as GeminiResponse | null;
  const text = (data?.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("");
  const parsed = extractJson(text);
  if (!parsed || num(parsed.calories_per_100, -1) < 0) return null;

  const conf = parsed.confidence;
  return {
    name:
      typeof parsed.name === "string" && parsed.name.trim()
        ? parsed.name.trim()
        : query,
    calories_per_100: round1(num(parsed.calories_per_100)),
    protein_per_100: round1(num(parsed.protein_per_100)),
    carbs_per_100: round1(num(parsed.carbs_per_100)),
    fats_per_100: round1(num(parsed.fats_per_100)),
    fiber_per_100: parsed.fiber_per_100 !== undefined ? round1(num(parsed.fiber_per_100)) : undefined,
    sugar_per_100: parsed.sugar_per_100 !== undefined ? round1(num(parsed.sugar_per_100)) : undefined,
    sodium_per_100: parsed.sodium_per_100 !== undefined ? round1(num(parsed.sodium_per_100)) : undefined,
    micronutrients: cleanMicros(parsed.micronutrients),
    source: "ai",
    confidence:
      conf === "high" || conf === "medium" || conf === "low" ? conf : undefined,
  };
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------
export async function lookupFood(query: string): Promise<FoodLookup> {
  const q = query.trim();
  const searchLinks = q
    ? [
        {
          label: "Αναζήτηση Google",
          url: `https://www.google.com/search?q=${encodeURIComponent(q + " θρεπτική αξία ανά 100g")}`,
        },
        {
          label: "Open Food Facts",
          url: `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process`,
        },
      ]
    : [];

  if (!q) return { candidates: [], searchLinks };

  // OFF + Gemini παράλληλα· τα branded προϊόντα μπαίνουν πρώτα, μετά η AI εκτίμηση.
  const [off, ai] = await Promise.all([lookupOpenFoodFacts(q), lookupGemini(q)]);
  const candidates: FoodCandidate[] = [...off];
  if (ai) candidates.push(ai);

  return { candidates, searchLinks };
}
