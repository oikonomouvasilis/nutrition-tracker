"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { type Food, type MealSlot } from "@/types/nutrition";
import { logMeal, logFood } from "./actions";

interface Props {
  date: string;
  slot: MealSlot;
  meals: { id: string; name: string }[];
  foods: Food[];
}

const inputCls =
  "rounded-lg border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800";

export default function LogAdder({ date, slot, meals, foods }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"meal" | "food">("meal");
  const [mealId, setMealId] = useState(meals[0]?.id ?? "");
  const [foodId, setFoodId] = useState(foods[0]?.id ?? "");
  const [quantity, setQuantity] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setError(null);
    setBusy(true);
    const res =
      mode === "meal"
        ? await logMeal({ date, slot, meal_id: mealId })
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
        onClick={() => setOpen(true)}
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        + Προσθήκη
      </button>
    );
  }

  const hasMeals = meals.length > 0;
  const hasFoods = foods.length > 0;

  return (
    <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="mb-2 flex gap-2 text-xs">
        <button
          onClick={() => setMode("meal")}
          className={`rounded-full px-2 py-1 ${mode === "meal" ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900" : "text-zinc-500"}`}
        >
          Γεύμα
        </button>
        <button
          onClick={() => setMode("food")}
          className={`rounded-full px-2 py-1 ${mode === "food" ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900" : "text-zinc-500"}`}
        >
          Τροφή
        </button>
      </div>

      {mode === "meal" ? (
        hasMeals ? (
          <select
            value={mealId}
            onChange={(e) => setMealId(e.target.value)}
            className={`${inputCls} w-full`}
          >
            {meals.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm text-zinc-400">
            Δεν υπάρχουν γεύματα.{" "}
            <Link href="/meals/new" className="underline">
              Φτιάξε ένα
            </Link>
            .
          </p>
        )
      ) : hasFoods ? (
        <div className="flex gap-2">
          <select
            value={foodId}
            onChange={(e) => setFoodId(e.target.value)}
            className={`${inputCls} flex-1`}
          >
            {foods.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
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
      ) : (
        <p className="text-sm text-zinc-400">
          Δεν υπάρχουν τροφές.{" "}
          <Link href="/foods" className="underline">
            Πρόσθεσε
          </Link>
          .
        </p>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-2 flex gap-2">
        <button
          onClick={add}
          disabled={busy || (mode === "meal" ? !hasMeals : !hasFoods)}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {busy ? "…" : "Καταγραφή"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg px-3 py-1.5 text-sm text-zinc-500"
        >
          Άκυρο
        </button>
      </div>
    </div>
  );
}
