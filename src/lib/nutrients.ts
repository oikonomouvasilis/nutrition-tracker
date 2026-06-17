// Ενιαίος κατάλογος θρεπτικών συστατικών (πέρα από τα 4 βασικά μακρο + θερμίδες).
// Χρησιμοποιείται από: φόρμα εισαγωγής, AI lookup, και δυναμικές στήλες πίνακα.
//
// Αποθήκευση:
//   storage "column" -> ειδική στήλη στον πίνακα foods (fiber/sugar/sodium)
//   storage "json"   -> κλειδί μέσα στο foods.micronutrients (jsonb)

import type { Food } from "@/types/nutrition";

export type NutrientUnit = "g" | "mg" | "µg";
export type NutrientGroup = "extended" | "vitamin" | "mineral";

export interface NutrientDef {
  key: string; // σταθερό κλειδί (= κλειδί στο micronutrients ή λογικό id)
  label: string; // πλήρης ελληνική ονομασία
  short: string; // σύντομη ετικέτα για κεφαλίδα στήλης
  unit: NutrientUnit;
  group: NutrientGroup;
  storage: "column" | "json";
  column?: keyof Food; // όταn storage === "column"
}

export const NUTRIENTS: NutrientDef[] = [
  // ── Επιπλέον μακρο (ειδικές στήλες) ──────────────────────────────────────
  { key: "fiber", label: "Φυτικές ίνες", short: "Ίνες", unit: "g", group: "extended", storage: "column", column: "fiber_per_100" },
  { key: "sugar", label: "Σάκχαρα", short: "Σάκχ.", unit: "g", group: "extended", storage: "column", column: "sugar_per_100" },
  { key: "sodium", label: "Νάτριο", short: "Na", unit: "mg", group: "extended", storage: "column", column: "sodium_per_100" },

  // ── Βιταμίνες ────────────────────────────────────────────────────────────
  { key: "vitamin_a", label: "Βιταμίνη A", short: "Vit A", unit: "µg", group: "vitamin", storage: "json" },
  { key: "vitamin_c", label: "Βιταμίνη C", short: "Vit C", unit: "mg", group: "vitamin", storage: "json" },
  { key: "vitamin_d", label: "Βιταμίνη D", short: "Vit D", unit: "µg", group: "vitamin", storage: "json" },
  { key: "vitamin_e", label: "Βιταμίνη E", short: "Vit E", unit: "mg", group: "vitamin", storage: "json" },
  { key: "vitamin_k", label: "Βιταμίνη K", short: "Vit K", unit: "µg", group: "vitamin", storage: "json" },
  { key: "vitamin_b1", label: "Βιταμίνη B1 (Θειαμίνη)", short: "B1", unit: "mg", group: "vitamin", storage: "json" },
  { key: "vitamin_b2", label: "Βιταμίνη B2 (Ριβοφλαβίνη)", short: "B2", unit: "mg", group: "vitamin", storage: "json" },
  { key: "vitamin_b3", label: "Βιταμίνη B3 (Νιασίνη)", short: "B3", unit: "mg", group: "vitamin", storage: "json" },
  { key: "vitamin_b5", label: "Βιταμίνη B5 (Παντοθενικό)", short: "B5", unit: "mg", group: "vitamin", storage: "json" },
  { key: "vitamin_b6", label: "Βιταμίνη B6", short: "B6", unit: "mg", group: "vitamin", storage: "json" },
  { key: "vitamin_b7", label: "Βιταμίνη B7 (Βιοτίνη)", short: "B7", unit: "µg", group: "vitamin", storage: "json" },
  { key: "vitamin_b9", label: "Βιταμίνη B9 (Φυλλικό οξύ)", short: "B9", unit: "µg", group: "vitamin", storage: "json" },
  { key: "vitamin_b12", label: "Βιταμίνη B12", short: "B12", unit: "µg", group: "vitamin", storage: "json" },

  // ── Μέταλλα / ιχνοστοιχεία ───────────────────────────────────────────────
  { key: "calcium", label: "Ασβέστιο", short: "Ca", unit: "mg", group: "mineral", storage: "json" },
  { key: "iron", label: "Σίδηρος", short: "Fe", unit: "mg", group: "mineral", storage: "json" },
  { key: "magnesium", label: "Μαγνήσιο", short: "Mg", unit: "mg", group: "mineral", storage: "json" },
  { key: "phosphorus", label: "Φώσφορος", short: "P", unit: "mg", group: "mineral", storage: "json" },
  { key: "potassium", label: "Κάλιο", short: "K", unit: "mg", group: "mineral", storage: "json" },
  { key: "zinc", label: "Ψευδάργυρος", short: "Zn", unit: "mg", group: "mineral", storage: "json" },
  { key: "copper", label: "Χαλκός", short: "Cu", unit: "mg", group: "mineral", storage: "json" },
  { key: "manganese", label: "Μαγγάνιο", short: "Mn", unit: "mg", group: "mineral", storage: "json" },
  { key: "selenium", label: "Σελήνιο", short: "Se", unit: "µg", group: "mineral", storage: "json" },
  { key: "iodine", label: "Ιώδιο", short: "I", unit: "µg", group: "mineral", storage: "json" },
];

export const NUTRIENT_BY_KEY: Record<string, NutrientDef> = Object.fromEntries(
  NUTRIENTS.map((n) => [n.key, n]),
);

export const GROUP_LABELS: Record<NutrientGroup, string> = {
  extended: "Επιπλέον μακρο",
  vitamin: "Βιταμίνες",
  mineral: "Μέταλλα & ιχνοστοιχεία",
};

/** Τιμή ενός θρεπτικού για μια τροφή (από στήλη ή από το micronutrients jsonb). */
export function nutrientValue(food: Food, def: NutrientDef): number | null {
  if (def.storage === "column" && def.column) {
    const v = food[def.column];
    return typeof v === "number" ? v : null;
  }
  const v = food.micronutrients?.[def.key];
  return typeof v === "number" ? v : null;
}

/** Επιτρεπτά κλειδιά για το micronutrients jsonb (φιλτράρισμα πριν την αποθήκευση). */
export const MICRO_JSON_KEYS = new Set(
  NUTRIENTS.filter((n) => n.storage === "json").map((n) => n.key),
);
