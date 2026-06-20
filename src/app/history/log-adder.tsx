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
import { logMeal, logFoods } from "./actions";
import FoodPicker from "@/app/meals/food-picker";
import MealPicker from "./meal-picker";

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
const ZERO = { calories: 0, protein: 0, carbs: 0, fats: 0 };

interface EditItem extends MealItemOption {
  key: string;
}

/** Φτιάχνει EditItem από μια τροφή (για αλλαγή/προσθήκη υλικού σε συνταγή). */
function editItemFromFood(food: Food, key: string, quantity: number): EditItem {
  return {
    key,
    food_id: food.id,
    name: food.name,
    unit: food.unit,
    quantity,
    per100: {
      calories_per_100: food.calories_per_100,
      protein_per_100: food.protein_per_100,
      carbs_per_100: food.carbs_per_100,
      fats_per_100: food.fats_per_100,
    },
  };
}

// Τροφή-mode: μία ή περισσότερες τροφές με ποσότητες.
interface FoodItem {
  key: string;
  food_id: string;
  quantity: number;
}
type PickerState = { mode: "add" } | { mode: "change"; key: string };

export default function LogAdder({ date, slot, meals, foods }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"meal" | "food">("meal");
  const [mealId, setMealId] = useState(meals[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Υλικά της επιλεγμένης συνταγής με ρυθμιζόμενες ποσότητες.
  const [items, setItems] = useState<EditItem[]>([]);

  // Τροφή-mode: όνομα (προαιρετικό) + τροφές.
  const [foodName, setFoodName] = useState("");
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [picker, setPicker] = useState<PickerState | null>(null);
  const [mealPickerOpen, setMealPickerOpen] = useState(false);

  const foodsById = useMemo(
    () => new Map(foods.map((f) => [f.id, f])),
    [foods],
  );

  function loadMeal(id: string) {
    setMealId(id);
    const meal = meals.find((m) => m.id === id);
    setItems(
      (meal?.items ?? []).map((it, i) => ({ ...it, key: `${id}-${i}` })),
    );
  }

  // Μία αρχική γραμμή τροφής για το γρήγορο (μονής τροφής) σενάριο.
  function seedFood() {
    setFoodItems((prev) =>
      prev.length > 0
        ? prev
        : foods[0]
          ? [{ key: crypto.randomUUID(), food_id: foods[0].id, quantity: 100 }]
          : [],
    );
  }

  // Αρχικοποίηση όταν ανοίγει.
  function openAdder() {
    setOpen(true);
    setError(null);
    if (mealId) loadMeal(mealId);
    seedFood();
  }

  function switchMode(mo: "meal" | "food") {
    setMode(mo);
    if (mo === "food") seedFood();
  }

  const mealTotals = useMemo(
    () =>
      sumMacros(items.map((it) => macrosForQuantity(it.per100, it.quantity || 0))),
    [items],
  );

  function setItemQty(key: string, q: number) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, quantity: q } : it)));
  }
  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  // Τροφή-mode handlers.
  const foodTotals = useMemo(
    () =>
      sumMacros(
        foodItems.map((it) => {
          const f = foodsById.get(it.food_id);
          return f ? macrosForQuantity(f, it.quantity || 0) : ZERO;
        }),
      ),
    [foodItems, foodsById],
  );

  // Ο picker εξυπηρετεί και τα δύο modes (αμοιβαία αποκλειόμενα).
  function handlePick(food: Food) {
    if (!picker) return;
    if (mode === "meal") {
      if (picker.mode === "add") {
        setItems((prev) => [...prev, editItemFromFood(food, crypto.randomUUID(), 100)]);
      } else {
        const key = picker.key;
        setItems((prev) =>
          prev.map((it) => (it.key === key ? editItemFromFood(food, key, it.quantity) : it)),
        );
      }
      return;
    }
    if (picker.mode === "add") {
      setFoodItems((prev) => [
        ...prev,
        { key: crypto.randomUUID(), food_id: food.id, quantity: 100 },
      ]);
    } else {
      const key = picker.key;
      setFoodItems((prev) =>
        prev.map((it) => (it.key === key ? { ...it, food_id: food.id } : it)),
      );
    }
  }
  function setFoodQty(key: string, q: number) {
    setFoodItems((prev) => prev.map((it) => (it.key === key ? { ...it, quantity: q } : it)));
  }
  function removeFoodItem(key: string) {
    setFoodItems((prev) => prev.filter((it) => it.key !== key));
  }

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
        : await logFoods({
            date,
            slot,
            name: foodName.trim(),
            items: foodItems.map((it) => ({ food_id: it.food_id, quantity: Number(it.quantity) || 0 })),
          });
    setBusy(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setOpen(false);
    // Καθάρισμα ώστε η επόμενη καταγραφή να ξεκινά καθαρή.
    setFoodName("");
    setFoodItems([]);
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
  const canSubmit =
    mode === "meal"
      ? hasMeals && items.length > 0
      : hasFoods && foodItems.length > 0;

  return (
    <div className="mt-2 rounded-xl border border-edge bg-surface-2/40 p-3">
      {/* Mode toggle */}
      <div className="mb-3 flex gap-1.5 text-xs">
        {(["meal", "food"] as const).map((mo) => (
          <button
            key={mo}
            onClick={() => switchMode(mo)}
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
            <button
              type="button"
              onClick={() => setMealPickerOpen(true)}
              className={`${inputCls} flex w-full items-center justify-between text-left`}
            >
              <span className="min-w-0 truncate">
                {meals.find((mm) => mm.id === mealId)?.name ?? "Επιλογή συνταγής…"}
              </span>
              <span className="ml-2 shrink-0 text-muted">▾</span>
            </button>

            {/* Ρυθμιζόμενα υλικά: αλλαγή (tap στο όνομα) / προσθήκη / αφαίρεση */}
            {items.length > 0 && (
              <ul className="divide-y divide-edge/70 rounded-lg border border-edge">
                {items.map((it) => {
                  const m = macrosForQuantity(it.per100, it.quantity || 0);
                  return (
                    <li key={it.key} className="flex items-center gap-2 px-2.5 py-2">
                      <button
                        type="button"
                        onClick={() => setPicker({ mode: "change", key: it.key })}
                        className="min-w-0 flex-1 truncate text-left text-sm text-foreground transition hover:text-neon-green"
                      >
                        {it.name}
                      </button>
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
                      <button
                        type="button"
                        onClick={() => removeItem(it.key)}
                        aria-label="Αφαίρεση"
                        className="text-muted transition hover:text-neon-pink"
                      >
                        ✕
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <button
              type="button"
              onClick={() => setPicker({ mode: "add" })}
              className="rounded-lg border border-edge px-2.5 py-1.5 text-xs text-muted transition hover:border-neon-green/50 hover:text-foreground"
            >
              + Προσθήκη τροφής
            </button>

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
          {/* Προαιρετικό όνομα (μετονομασία) */}
          <input
            value={foodName}
            onChange={(e) => setFoodName(e.target.value)}
            placeholder="Όνομα (προαιρετικό)"
            className={`${inputCls} w-full`}
          />

          {/* Τροφές με ρυθμιζόμενες ποσότητες */}
          {foodItems.length > 0 && (
            <ul className="divide-y divide-edge/70 rounded-lg border border-edge">
              {foodItems.map((it) => {
                const food = foodsById.get(it.food_id);
                const m = food ? macrosForQuantity(food, it.quantity || 0) : ZERO;
                return (
                  <li key={it.key} className="flex items-center gap-2 px-2.5 py-2">
                    <button
                      type="button"
                      onClick={() => setPicker({ mode: "change", key: it.key })}
                      className="min-w-0 flex-1 truncate text-left text-sm text-foreground transition hover:text-neon-green"
                    >
                      {food ? food.name : "Επιλογή τροφής…"}
                    </button>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={it.quantity}
                      onChange={(e) => setFoodQty(it.key, Number(e.target.value))}
                      className={`${inputCls} w-20 text-right`}
                    />
                    <span className="w-8 text-xs text-muted">{food?.unit ?? "g"}</span>
                    <span className="w-16 text-right text-xs tabular-nums text-muted">{r(m.calories)} kcal</span>
                    <button
                      type="button"
                      onClick={() => removeFoodItem(it.key)}
                      aria-label="Αφαίρεση"
                      className="text-muted transition hover:text-neon-pink"
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <button
            type="button"
            onClick={() => setPicker({ mode: "add" })}
            className="rounded-lg border border-edge px-2.5 py-1.5 text-xs text-muted transition hover:border-neon-green/50 hover:text-foreground"
          >
            + Προσθήκη τροφής
          </button>

          {/* Σύνολα live */}
          <div className="grid grid-cols-4 gap-2">
            {([
              ["Θερμ.", r(foodTotals.calories)],
              ["Π", r(foodTotals.protein)],
              ["Υ", r(foodTotals.carbs)],
              ["Λ", r(foodTotals.fats)],
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
          Δεν υπάρχουν τροφές.{" "}
          <Link href="/foods" className="text-neon-green hover:underline">Πρόσθεσε</Link>.
        </p>
      )}

      {error && <p className="mt-2 text-sm text-neon-pink">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          onClick={add}
          disabled={busy || !canSubmit}
          className="rounded-lg bg-neon-green px-3 py-1.5 text-sm font-semibold text-[#06281a] transition hover:brightness-110 disabled:opacity-50"
        >
          {busy ? "…" : "Καταγραφή"}
        </button>
        <button onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-sm text-muted transition hover:text-foreground">
          Άκυρο
        </button>
      </div>

      {picker && (
        <FoodPicker
          foods={foods}
          onSelect={handlePick}
          onClose={() => setPicker(null)}
          title={picker.mode === "add" ? "Προσθήκη τροφής" : "Αλλαγή τροφής"}
        />
      )}

      {mealPickerOpen && (
        <MealPicker
          meals={meals}
          onSelect={(mm) => loadMeal(mm.id)}
          onClose={() => setMealPickerOpen(false)}
        />
      )}
    </div>
  );
}
