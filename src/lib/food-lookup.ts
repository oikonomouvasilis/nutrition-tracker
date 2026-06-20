// Server-only. Δωρεάν εύρεση θρεπτικών στοιχείων:
//   1) Open Food Facts (text search) -> πολλαπλά υποψήφια branded προϊόντα + σύνδεσμοι
//   2) Gemini (Google Search grounding)  -> 1 εκτίμηση με μακρο + βιταμίνες/μέταλλα
//   3) Από σύνδεσμο (URL): OFF product API (ακριβές) ή ανάγνωση της σελίδας + Gemini
// + σύνδεσμοι αναζήτησης σε όλο το web ώστε ο χρήστης να επαληθεύσει/επιλέξει.
//
// PRIVACY BOUNDARY: στέλνουμε ΜΟΝΟ την περιγραφή/σύνδεσμο τροφής στις εξωτερικές
// υπηρεσίες, ΠΟΤΕ προσωπικά δεδομένα (ημερολόγιο, στατιστικά κ.λπ.).

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

const microSpec = () =>
  NUTRIENTS.filter((nu) => nu.storage === "json")
    .map((nu) => `"${nu.key}"(${nu.unit})`)
    .join(", ");

// ---------------------------------------------------------------------------
// Open Food Facts (δωρεάν, χωρίς key)
// ---------------------------------------------------------------------------
type Nutriments = Record<string, number | string | undefined>;
interface OffProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  nutriments?: Nutriments;
}

/** Map ενός OFF προϊόντος σε candidate (null αν δεν έχει θερμίδες). */
function candidateFromOffProduct(
  p: OffProduct,
  fallbackName: string,
): FoodCandidate | null {
  const n = p.nutriments ?? {};
  const cal = num(n["energy-kcal_100g"], -1);
  if (cal <= 0) return null;

  const label = `${p.brands ?? ""} ${p.product_name ?? ""}`.trim();
  // νάτριο: sodium_100g (g) ή από salt_100g (g) ÷ 2.5 -> mg
  const sodiumG =
    n["sodium_100g"] !== undefined
      ? num(n["sodium_100g"])
      : num(n["salt_100g"]) / 2.5;

  return {
    name: p.product_name?.trim() || label || fallbackName,
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
  };
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
      const c = candidateFromOffProduct(p, query);
      if (!c) continue;

      const hay = `${p.brands ?? ""} ${p.product_name ?? ""}`.toLowerCase();
      const relevant = tokens.length === 0 || tokens.some((t) => hay.includes(t));
      if (!relevant) continue;

      out.push(c);
      if (out.length >= 6) break;
    }
    return out;
  } catch {
    return [];
  }
}

/** Ακριβές: OFF product API με barcode (από OFF σύνδεσμο). */
async function lookupOffByBarcode(code: string): Promise<FoodCandidate | null> {
  try {
    const url =
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json` +
      "?fields=code,product_name,brands,nutriments";
    const res = await fetch(url, {
      headers: { "User-Agent": "nutrition-tracker/1.0 (personal project)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as {
      product?: OffProduct;
    } | null;
    if (!data?.product) return null;
    return candidateFromOffProduct(data.product, code);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Gemini (free tier) — κοινό call + map
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

/** Καλεί Gemini και επιστρέφει το JSON object της απάντησης (ή null). */
async function callGeminiJson(
  prompt: string,
  grounding: boolean,
): Promise<Record<string, unknown> | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    `gemini-2.5-flash:generateContent?key=${key}`;
  const requestBody = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    ...(grounding ? { tools: [{ google_search: {} }] } : {}),
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
  return extractJson(text);
}

/** Map του Gemini JSON σε candidate (κοινό για query & σελίδα). */
function geminiCandidateFromParsed(
  parsed: Record<string, unknown>,
  fallbackName: string,
  url?: string,
): FoodCandidate {
  const conf = parsed.confidence;
  return {
    name:
      typeof parsed.name === "string" && parsed.name.trim()
        ? parsed.name.trim()
        : fallbackName,
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
    url,
  };
}

/** Gemini + Google Search grounding — 1 εκτίμηση από όνομα/περιγραφή. */
async function lookupGemini(query: string): Promise<FoodCandidate | null> {
  const prompt =
    `Τροφή ή προϊόν: "${query}".\n` +
    "Βρες τα θρεπτικά στοιχεία ΑΝΑ 100 γραμμάρια (ή 100ml αν είναι υγρό), από αξιόπιστες πηγές.\n" +
    "Απάντησε ΜΟΝΟ με ένα JSON object, χωρίς άλλο κείμενο:\n" +
    '{"name":"σύντομο όνομα","calories_per_100":number,"protein_per_100":number,' +
    '"carbs_per_100":number,"fats_per_100":number,"fiber_per_100":number,' +
    '"sugar_per_100":number,"sodium_per_100":number(mg),' +
    '"micronutrients":{...},"confidence":"high|medium|low"}\n' +
    `Στο micronutrients βάλε όσα γνωρίζεις, με ΑΚΡΙΒΩΣ αυτά τα κλειδιά & μονάδες: ${microSpec()}. ` +
    "Παράλειψε όσα δεν γνωρίζεις (μη βάζεις 0 ή null).";

  const parsed = await callGeminiJson(prompt, true);
  if (!parsed || num(parsed.calories_per_100, -1) < 0) return null;
  return geminiCandidateFromParsed(parsed, query);
}

/** Gemini χωρίς grounding — εξαγωγή από το κείμενο μιας σελίδας. */
async function lookupGeminiFromPage(
  pageText: string,
  url: string,
  fallbackName = "Τροφή από σελίδα",
): Promise<FoodCandidate | null> {
  const prompt =
    "Από το παρακάτω περιεχόμενο σελίδας τροφής/προϊόντος, βρες τα θρεπτικά στοιχεία ΑΝΑ 100 γραμμάρια (ή 100ml αν είναι υγρό).\n" +
    `Πηγή (URL): ${url}\n` +
    "Αν δίνονται τιμές ανά μερίδα, μετέτρεψέ τες σε ανά 100g.\n" +
    "Απάντησε ΜΟΝΟ με ένα JSON object, χωρίς άλλο κείμενο:\n" +
    '{"name":"σύντομο όνομα","calories_per_100":number,"protein_per_100":number,' +
    '"carbs_per_100":number,"fats_per_100":number,"fiber_per_100":number,' +
    '"sugar_per_100":number,"sodium_per_100":number(mg),' +
    '"micronutrients":{...},"confidence":"high|medium|low"}\n' +
    `Στο micronutrients βάλε όσα αναφέρονται, με ΑΚΡΙΒΩΣ αυτά τα κλειδιά & μονάδες: ${microSpec()}. ` +
    "Παράλειψε όσα δεν υπάρχουν (μη βάζεις 0 ή null). Αν η σελίδα δεν έχει διατροφικά στοιχεία, επίστρεψε {}.\n\n" +
    "ΠΕΡΙΕΧΟΜΕΝΟ ΣΕΛΙΔΑΣ:\n" +
    pageText;

  const parsed = await callGeminiJson(prompt, false);
  if (!parsed || num(parsed.calories_per_100, -1) < 0) return null;
  return geminiCandidateFromParsed(parsed, fallbackName, url);
}

// ---------------------------------------------------------------------------
// Lookup από σύνδεσμο (URL)
// ---------------------------------------------------------------------------

/** SSRF guard: μόνο δημόσια http(s). Όχι localhost/private/link-local IPs.
 *  Σημείωση: το DNS-rebinding (public host -> private IP) δεν καλύπτεται
 *  πλήρως· αποδεκτό γιατί το endpoint είναι auth-gated (personal project). */
function safeExternalUrl(raw: string): URL | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (u.username || u.password) return null;
  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return null;
  }
  if (isPrivateIp(host)) return null;
  return u;
}

function isPrivateIp(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "");
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true; // multicast / reserved
    return false;
  }
  if (h.includes(":")) {
    const lower = h.toLowerCase();
    if (lower === "::1" || lower === "::") return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA
    if (lower.startsWith("fe80")) return true; // link-local
    const mapped = lower.match(/::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
    if (mapped) return isPrivateIp(mapped[1]);
    return false;
  }
  return false;
}

/** barcode από OFF σύνδεσμο, π.χ. /product/3017620422003/nutella -> 3017620422003 */
function offBarcodeFromUrl(u: URL): string | null {
  if (!u.hostname.toLowerCase().endsWith("openfoodfacts.org")) return null;
  const m = u.pathname.match(/\/(?:product|produit)\/(\d{6,})/);
  return m ? m[1] : null;
}

/** Μετατρέπει HTML σε καθαρό κείμενο (truncate ~12k χαρ.). */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim()
    .slice(0, 12000);
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#0*39;/gi, "'")
    .replace(/&#(\d+);/g, (_, d) => {
      const code = Number(d);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/\s+/g, " ")
    .trim();
}

/** Κράτα μόνο το όνομα προϊόντος (κόψε site-suffix μετά από | · – —). */
function cleanTitle(s: string): string {
  return s.split(/\s*[|·–—]\s*/)[0].trim().slice(0, 120);
}

/** Όνομα προϊόντος από og:title / <title> / meta description. */
function extractTitle(html: string): string | null {
  const og =
    html.match(/<meta[^>]+(?:property|name)=["']og:title["'][^>]*content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']og:title["']/i);
  if (og?.[1]) return cleanTitle(decodeEntities(og[1]));

  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (t?.[1]) return cleanTitle(decodeEntities(t[1]));

  const md = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']+)["']/i);
  if (md?.[1]) return cleanTitle(decodeEntities(md[1]));

  return null;
}

/** Όνομα από το τελευταίο τμήμα του path (fallback αν λείπει title). */
function slugName(u: URL): string {
  const seg = u.pathname.split("/").filter(Boolean).pop() ?? "";
  return decodeURIComponent(seg)
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

interface PageContent {
  text: string;
  title: string | null;
}

async function fetchPage(u: URL): Promise<PageContent | null> {
  try {
    const res = await fetch(u, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; nutrition-tracker/1.0)",
        Accept: "text/html,application/xhtml+xml,text/plain",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!/text\/html|text\/plain|application\/xhtml/i.test(ct)) return null;

    const buf = await res.arrayBuffer();
    const slice = buf.slice(0, 512 * 1024); // cap ~512KB
    const html = new TextDecoder("utf-8", { fatal: false }).decode(slice);
    return { text: htmlToText(html), title: extractTitle(html) };
  } catch {
    return null;
  }
}

async function lookupByUrl(rawUrl: string): Promise<FoodLookup> {
  const u = safeExternalUrl(rawUrl);
  if (!u) return { candidates: [], searchLinks: [] };

  const searchLinks = [{ label: "Άνοιγμα σελίδας", url: u.toString() }];

  // 1) Open Food Facts σύνδεσμος -> ακριβές μέσω API (χωρίς AI)
  const code = offBarcodeFromUrl(u);
  if (code) {
    const c = await lookupOffByBarcode(code);
    return { candidates: c ? [c] : [], searchLinks };
  }

  // 2) Γενική σελίδα -> διάβασε τη σελίδα ΚΑΙ άντλησε στοιχεία για το προϊόν
  //    (από όνομα/περιγραφή: OFF + Gemini), όχι μόνο σύνδεσμο.
  const page = await fetchPage(u);
  const name = (page?.title || slugName(u)).trim();

  const [pageCand, off, aiByName] = await Promise.all([
    page?.text
      ? lookupGeminiFromPage(page.text, u.toString(), name)
      : Promise.resolve<FoodCandidate | null>(null),
    name ? lookupOpenFoodFacts(name) : Promise.resolve<FoodCandidate[]>([]),
    name ? lookupGemini(name) : Promise.resolve<FoodCandidate | null>(null),
  ]);

  const candidates: FoodCandidate[] = [];
  if (pageCand) candidates.push(pageCand);
  candidates.push(...off);
  if (aiByName) candidates.push(aiByName);

  if (name) {
    searchLinks.push(
      {
        label: "Αναζήτηση Google",
        url: `https://www.google.com/search?q=${encodeURIComponent(name + " θρεπτική αξία ανά 100g")}`,
      },
      {
        label: "Open Food Facts",
        url: `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(name)}&search_simple=1&action=process`,
      },
    );
  }

  return { candidates: candidates.slice(0, 8), searchLinks };
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------
export async function lookupFood(query: string): Promise<FoodLookup> {
  const q = query.trim();
  if (!q) return { candidates: [], searchLinks: [] };

  // Σύνδεσμος -> διάβασε τη σελίδα απευθείας.
  if (/^https?:\/\//i.test(q)) return lookupByUrl(q);

  const searchLinks = [
    {
      label: "Αναζήτηση Google",
      url: `https://www.google.com/search?q=${encodeURIComponent(q + " θρεπτική αξία ανά 100g")}`,
    },
    {
      label: "Open Food Facts",
      url: `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process`,
    },
  ];

  // OFF + Gemini παράλληλα· τα branded προϊόντα μπαίνουν πρώτα, μετά η AI εκτίμηση.
  const [off, ai] = await Promise.all([lookupOpenFoodFacts(q), lookupGemini(q)]);
  const candidates: FoodCandidate[] = [...off];
  if (ai) candidates.push(ai);

  return { candidates, searchLinks };
}
