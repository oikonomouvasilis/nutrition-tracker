"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  type Food,
  type MealSlot,
  macrosForQuantity,
  sumMacros,
} from "@/types/nutrition";
import { logMeal, logFood } from "./actions";

export interface MealItemOption {
  food_id: string;
  name: string;
  unit: string;
  quantity: number;
  per100: {
    calories_per_100: number;
    protein_per_100: number;
    carbs_per_100: number;
    fats_per_100: number;
  };
}
export interface MealOption {
  id: string;
  name: string;
  items: MealItemOption[];
}

interface Props {
  date: string;
  slot: MealSlot;
  meals: MealOption[];
  foods: Food[];
}

const inputCls =
  "rounded-lg border border-edge bg-surface-2 px-2 py-1.5 text-sm text-foreground outline-none transition focus:border-neon-green/60";
const r = (n: number) => Math.round(n);

interface EditItem extends MealItemOption {
  key: string;
}

export default function LogAdder({ date, slot, meals, foods }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"meal" | "food">("meal");
  const [mealId, setMealId] = useState(meals[0]?.id ?? "");
  const [foodId, setFoodId] = useState(foods[0]?.id ?? "");
  const [quantity, setQuantity] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Υλικά της επιλεγμένης συνταγής με ρυθμιζόμενες ποσότητες.
  const [items, setItems] = useState<EditItem[]>([]);

  function loadMeal(id: string) {
    setMealId(id);
    const meal = meals.find((m) => m.id === id);
    setItems(
      (meal?.items ?? []).map((it, i) => ({ ...it, key: `${id}-${i}` })),
    );
  }

  // Αρχικοποίηση υλικών όταν ανοίγει σε mode "meal".
  function openAdder() {
    setOpen(true);
    setError(null);
    if (mealId) loadMeal(mealId);
  }

  const mealTotals = useMemo(
    () =>
      sumMacros(items.map((it) => macrosForQuantity(it.per100, it.quantity || 0))),
    [items],
  );

  function setItemQty(key: string, q: number) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, quantity: q } : it)));
  }

  const foodPreview = useMemo(() => {
    const f = foods.find((x) => x.id === foodId);
    return f ? macrosForQuantity(f, Number(quantity) || 0) : null;
  }, [foods, foodId, quantity]);

  async function add() {
    setError(null);
    setBusy(true);
    const res =
      mode === "meal"
        ? await logMeal({
            date,
            slot,
            meal_id: mealId,
            items: items.map((it) => ({ food_id: it.food_id, quantity: Number(it.quantity) || 0 })),
          })
        : await logFood({ date, slot, food_id: foodId, quantity: Number(quantity) || 0 });
    setBusy(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={openAdder}
        className="text-sm text-muted transition hover:text-neon-green"
      >
        + Προσθήκη
      </button>
    );
  }

  const hasMeals = meals.length > 0;
  const hasFoods = foods.length > 0;

  return (
    <div className="mt-2 rounded-xl border border-edge bg-surface-2/40 p-3">
      {/* Mode toggle */}
      <div className="mb-3 flex gap-1.5 text-xs">
        {(["meal", "food"] as const).map((mo) => (
          <button
            key={mo}
            onClick={() => setMode(mo)}
            className={[
              "rounded-full px-2.5 py-1 font-medium transition",
              mode === mo ? "bg-neon-green text-[#06281a]" : "border border-edge text-muted hover:text-foreground",
            ].join(" ")}
          >
            {mo === "meal" ? "Συνταγή" : "Τροφή"}
          </button>
        ))}
      </div>

      {mode === "meal" ? (
        hasMeals ? (
          <div className="space-y-2">
            <select value={mealId} onChange={(e) => loadMeal(e.target.value)} className={`${inputCls} w-full`}>
              {meals.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>

            {/* Ρυθμιζόμενες ποσότητες υλικών */}
            {items.length > 0 ? (
              <ul className="divide-y divide-edge/70 rounded-lg border border-edge">
                {items.map((it) => {
                  const m = macrosForQuantity(it.per100, it.quantity || 0);
                  return (
                    <li key={it.key} className="flex items-center gap-2 px-2.5 py-2">
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{it.name}</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={it.quantity}
                        onChange={(e) => setItemQty(it.key, Number(e.target.value))}
                        className={`${inputCls} w-20 text-right`}
                      />
                      <span className="w-8 text-xs text-muted">{it.unit}</span>
                      <span className="w-16 text-right text-xs tabular-nums text-muted">{r(m.calories)} kcal</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs text-muted">Η συνταγή δεν έχει υλικά.</p>
            )}

            {/* Σύνολα live */}
            <div className="grid grid-cols-4 gap-2">
              {([
                ["Θερμ.", r(mealTotals.calories)],
                ["Π", r(mealTotals.protein)],
                ["Υ", r(mealTotals.carbs)],
                ["Λ", r(mealTotals.fats)],
              ] as const).map(([lbl, val]) => (
                <div key={lbl} className="rounded-lg bg-surface-2 py-1.5 text-center">
                  <div className="text-[10px] text-muted">{lbl}</div>
                  <div className="text-sm font-semibold tabular-nums">{val}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Δεν υπάρχουν συνταγές.{" "}
            <Link href="/meals/new" className="text-neon-green hover:underline">Φτιάξε μία</Link>.
          </p>
        )
      ) : hasFoods ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <select value={foodId} onChange={(e) => setFoodId(e.target.value)} className={`${inputCls} flex-1`}>
              {foods.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className={`${inputCls} w-20 text-right`}
            />
          </div>
          {foodPreview && (
            <div className="text-right text-xs tabular-nums text-muted">
              {r(foodPreview.calories)} kcal · Π {r(foodPreview.protein)} · Υ {r(foodPreview.carbs)} · Λ {r(foodPreview.fats)} g
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">
          Δεν υπάρχουν τροφές.{" "}
          <Link href="/foods" className="text-neon-green hover:underline">Πρόσθεσε</Link>.
        </p>
      )}

      {error && <p className="mt-2 text-sm text-neon-pink">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          onClick={add}
          disabled={busy || (mode === "meal" ? !hasMeals : !hasFoods)}
          className="rounded-lg bg-neon-green px-3 py-1.5 text-sm font-semibold text-[#06281a] transition hover:brightness-110 disabled:opacity-50"
        >
          {busy ? "…" : "Καταγραφή"}
        </button>
        <button onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-sm text-muted transition hover:text-foreground">
          Άκυρο
        </button>
      </div>
    </div>
  );
}
