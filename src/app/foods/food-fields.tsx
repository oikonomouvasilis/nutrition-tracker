"use client";

import {
  NUTRIENTS,
  NUTRIENT_BY_KEY,
  GROUP_LABELS,
  type NutrientGroup,
} from "@/lib/nutrients";

const inputCls =
  "w-full rounded-lg border border-edge bg-surface-2 px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-neon-green/60";

const GROUPS: NutrientGroup[] = ["extended", "vitamin", "mineral"];

/** Ελεγχόμενη τιμή για τα πεδία τροφής (μακρο ως strings + extras key->string). */
export interface FoodFieldsValue {
  calories: string;
  protein: string;
  carbs: string;
  fats: string;
  unit: string;
  extras: Record<string, string>;
}

export const EMPTY_FOOD_FIELDS: FoodFieldsValue = {
  calories: "",
  protein: "",
  carbs: "",
  fats: "",
  unit: "g",
  extras: {},
};

/** Γεμίζει τα extras (στήλες + micros) από μια αποθηκευμένη τροφή. */
export function foodToExtras(food: {
  fiber_per_100: number | null;
  sugar_per_100: number | null;
  sodium_per_100: number | null;
  micronutrients: Record<string, number>;
}): Record<string, string> {
  const extras: Record<string, string> = {};
  if (food.fiber_per_100 != null) extras.fiber = String(food.fiber_per_100);
  if (food.sugar_per_100 != null) extras.sugar = String(food.sugar_per_100);
  if (food.sodium_per_100 != null) extras.sodium = String(food.sodium_per_100);
  for (const [k, v] of Object.entries(food.micronutrients ?? {})) {
    if (k in NUTRIENT_BY_KEY) extras[k] = String(v);
  }
  return extras;
}

/** Γράφει τα πεδία τροφής στο FormData — συμβατό με addFood/updateFood. */
export function appendFoodFields(fd: FormData, value: FoodFieldsValue) {
  fd.set("calories", value.calories || "0");
  fd.set("protein", value.protein || "0");
  fd.set("carbs", value.carbs || "0");
  fd.set("fats", value.fats || "0");
  fd.set("unit", value.unit);

  // στήλες fiber/sugar/sodium + micronutrients json
  const micros: Record<string, number> = {};
  for (const [key, val] of Object.entries(value.extras)) {
    const def = NUTRIENT_BY_KEY[key];
    if (!def || val.trim() === "") continue;
    const n = Number(val);
    if (!Number.isFinite(n) || n < 0) continue;
    if (def.storage === "column") fd.set(def.key, String(n));
    else micros[key] = n;
  }
  fd.set("micronutrients", JSON.stringify(micros));
}

interface Props {
  value: FoodFieldsValue;
  onChange: (patch: Partial<FoodFieldsValue>) => void;
}

/** Κοινά πεδία τροφής (μακρο + προαιρετικά θρεπτικά). Controlled. */
export default function FoodFields({ value, onChange }: Props) {
  const { calories, protein, carbs, fats, unit, extras } = value;

  function toggleExtra(key: string) {
    const next = { ...extras };
    if (key in next) delete next[key];
    else next[key] = "";
    onChange({ extras: next });
  }
  function setExtra(key: string, v: string) {
    onChange({ extras: { ...extras, [key]: v } });
  }
  function removeExtra(key: string) {
    const next = { ...extras };
    delete next[key];
    onChange({ extras: next });
  }

  return (
    <>
      {/* Υποχρεωτικά μακρο */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <input value={calories} onChange={(e) => onChange({ calories: e.target.value })} type="number" step="any" min="0" placeholder="Θερμίδες *" className={inputCls} />
        <input value={protein} onChange={(e) => onChange({ protein: e.target.value })} type="number" step="any" min="0" placeholder="Πρωτεΐνη (g)" className={inputCls} />
        <input value={carbs} onChange={(e) => onChange({ carbs: e.target.value })} type="number" step="any" min="0" placeholder="Υδατάνθρακες (g)" className={inputCls} />
        <input value={fats} onChange={(e) => onChange({ fats: e.target.value })} type="number" step="any" min="0" placeholder="Λιπαρά (g)" className={inputCls} />
        <select value={unit} onChange={(e) => onChange({ unit: e.target.value })} className={inputCls}>
          <option value="g">g</option>
          <option value="ml">ml</option>
        </select>
      </div>

      {/* Προαιρετικά θρεπτικά (βιταμίνες/μέταλλα) */}
      <div className="mt-4 border-t border-edge pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted">
            Επιπλέον θρεπτικά <span className="text-muted/70">(προαιρετικά)</span>
          </span>
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-edge bg-surface-2 px-3 py-1.5 text-xs text-foreground transition hover:border-neon-green/50 [&::-webkit-details-marker]:hidden">
              + Επιλογή θρεπτικών
              {Object.keys(extras).length > 0 && (
                <span className="rounded-full bg-neon-green/15 px-1.5 text-neon-green">
                  {Object.keys(extras).length}
                </span>
              )}
              <span className="text-muted transition group-open:rotate-180">▾</span>
            </summary>
            <div className="absolute right-0 z-20 mt-2 max-h-72 w-64 overflow-y-auto rounded-xl border border-edge bg-surface p-2 shadow-xl">
              {GROUPS.map((g) => (
                <div key={g} className="mb-1">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    {GROUP_LABELS[g]}
                  </div>
                  {NUTRIENTS.filter((n) => n.group === g).map((n) => (
                    <label
                      key={n.key}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5"
                    >
                      <input
                        type="checkbox"
                        checked={n.key in extras}
                        onChange={() => toggleExtra(n.key)}
                        className="accent-[var(--color-neon-green)]"
                      />
                      <span className="flex-1">{n.label}</span>
                      <span className="text-[10px] text-muted">{n.unit}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </details>
        </div>

        {Object.keys(extras).length > 0 && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {NUTRIENTS.filter((n) => n.key in extras).map((n) => (
              <div key={n.key} className="flex items-center gap-2">
                <label className="flex-1 text-xs text-muted">{n.label}</label>
                <div className="relative">
                  <input
                    value={extras[n.key]}
                    onChange={(e) => setExtra(n.key, e.target.value)}
                    type="number"
                    step="any"
                    min="0"
                    className={`${inputCls} w-28 pr-9`}
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted">
                    {n.unit}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeExtra(n.key)}
                  className="text-muted transition hover:text-neon-pink"
                  aria-label={`Αφαίρεση ${n.label}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
