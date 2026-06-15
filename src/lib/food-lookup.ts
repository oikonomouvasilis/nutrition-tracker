// Server-only. Δωρεάν εύρεση μακρο: Open Food Facts (text search) → Gemini (grounding).
//
// PRIVACY BOUNDARY: στέλνουμε ΜΟΝΟ την περιγραφή τροφής στις εξωτερικές υπηρεσίες,
// ΠΟΤΕ προσωπικά δεδομένα (ημερολόγιο, στατιστικά κ.λπ.). Το Gemini free tier
// μπορεί να χρησιμοποιεί inputs για εκπαίδευση — γι' αυτό στέλνουμε μόνο όνομα τροφής.

export interface FoodLookupResult {
  name: string;
  calories_per_100: number;
  protein_per_100: number;
  carbs_per_100: number;
  fats_per_100: number;
  source: "openfoodfacts" | "ai";
  confidence?: "high" | "medium" | "low";
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function num(v: unknown, fallback = 0): number {
  const x = typeof v === "string" ? parseFloat(v) : v;
  return typeof x === "number" && Number.isFinite(x) && x >= 0 ? x : fallback;
}

// ---------------------------------------------------------------------------
// Open Food Facts (δωρεάν, χωρίς key, ιδανικό για branded προϊόντα)
// ---------------------------------------------------------------------------
type Nutriments = Record<string, number | string | undefined>;
interface OffProduct {
  product_name?: string;
  brands?: string;
  nutriments?: Nutriments;
}

async function lookupOpenFoodFacts(
  query: string,
): Promise<FoodLookupResult | null> {
  try {
    const url =
      "https://world.openfoodfacts.org/cgi/search.pl?" +
      `search_terms=${encodeURIComponent(query)}` +
      "&search_simple=1&action=process&json=1&page_size=5" +
      "&fields=product_name,brands,nutriments";
    const res = await fetch(url, {
      headers: { "User-Agent": "nutrition-tracker/1.0 (personal project)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    if (!res.headers.get("content-type")?.includes("json")) return null;

    const data = (await res.json()) as { products?: OffProduct[] };
    const tokens = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length >= 3);

    for (const p of data.products ?? []) {
      const n = p.nutriments ?? {};
      const cal = num(n["energy-kcal_100g"], -1);
      if (cal <= 0) continue;

      const label = `${p.brands ?? ""} ${p.product_name ?? ""}`.trim();
      // relevance guard: το v2 endpoint αγνοεί το search_terms, οπότε
      // δεχόμαστε μόνο αν το όνομα ταιριάζει με την αναζήτηση.
      const hay = label.toLowerCase();
      const relevant = tokens.length === 0 || tokens.some((t) => hay.includes(t));
      if (!relevant) continue;

      return {
        name: label || query,
        calories_per_100: round1(cal),
        protein_per_100: round1(num(n["proteins_100g"])),
        carbs_per_100: round1(num(n["carbohydrates_100g"])),
        fats_per_100: round1(num(n["fat_100g"])),
        source: "openfoodfacts",
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Gemini (free tier) + Google Search grounding
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

async function lookupGemini(query: string): Promise<FoodLookupResult | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const prompt =
    `Τροφή ή προϊόν: "${query}".\n` +
    "Βρες τα μακροθρεπτικά στοιχεία ΑΝΑ 100 γραμμάρια (ή 100ml αν είναι υγρό), " +
    "χρησιμοποιώντας αξιόπιστες πηγές.\n" +
    "Απάντησε ΜΟΝΟ με ένα JSON object, χωρίς άλλο κείμενο:\n" +
    '{"name":"σύντομο όνομα","calories_per_100":number,"protein_per_100":number,' +
    '"carbs_per_100":number,"fats_per_100":number,"confidence":"high|medium|low"}';

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
    // retry σε υπερφόρτωση/rate-limit
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
    source: "ai",
    confidence:
      conf === "high" || conf === "medium" || conf === "low" ? conf : undefined,
  };
}

// ---------------------------------------------------------------------------
// Orchestrator: δωρεάν DB πρώτα, μετά AI fallback.
// ---------------------------------------------------------------------------
export async function lookupFood(
  query: string,
): Promise<FoodLookupResult | null> {
  const q = query.trim();
  if (!q) return null;
  return (await lookupOpenFoodFacts(q)) ?? (await lookupGemini(q));
}
