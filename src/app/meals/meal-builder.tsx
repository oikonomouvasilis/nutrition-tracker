"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  type Food,
  type MealSlot,
  MEAL_SLOTS,
  MEAL_SLOT_LABELS,
  macrosForQuantity,
  sumMacros,
} from "@/types/nutrition";
import { createMeal, updateMeal } from "./actions";

interface BuilderItem {
  key: string;
  food_id: string;
  quantity: number;
}

interface Props {
  foods: Food[];
  mealId?: string;
  initial?: {
    name: string;
    meal_type: MealSlot | null;
    description: string | null;
    items: { food_id: string; quantity: number }[];
  };
}

const inputCls =
  "rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800";

const fmt = (n: number) => Math.round(n * 10) / 10;

export default function MealBuilder({ foods, mealId, initial }: Props) {
  const router = useRouter();
  const foodsById = useMemo(
    () => new Map(foods.map((f) => [f.id, f])),
    [foods],
  );

  const [name, setName] = useState(initial?.name ?? "");
  const [mealType, setMealType] = useState<MealSlot | "">(
    initial?.meal_type ?? "",
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [items, setItems] = useState<BuilderItem[]>(
    initial?.items.map((it, i) => ({
      key: `init-${i}`,
      food_id: it.food_id,
      quantity: it.quantity,
    })) ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const totals = useMemo(
    () =>
      sumMacros(
        items.map((it) => {
          const food = foodsById.get(it.food_id);
          return food
            ? macrosForQuantity(food, it.quantity || 0)
            : { calories: 0, protein: 0, carbs: 0, fats: 0 };
        }),
      ),
    [items, foodsById],
  );

  function addItem() {
    setItems((prev) => [
      ...prev,
      { key: crypto.randomUUID(), food_id: foods[0]?.id ?? "", quantity: 100 },
    ]);
  }
  function patchItem(key: string, patch: Partial<BuilderItem>) {
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, ...patch } : it)),
    );
  }
  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  async function save() {
    setError(null);
    if (!name.trim()) {
      setError("Δώσε όνομα στο γεύμα.");
      return;
    }
    setSaving(true);
    const payload = {
      name: name.trim(),
      meal_type: (mealType || null) as MealSlot | null,
      description: description.trim() || null,
      items: items.map((it) => ({
        food_id: it.food_id,
        quantity: Number(it.quantity) || 0,
      })),
    };
    const res = mealId
      ? await updateMeal(mealId, payload)
      : await createMeal(payload);

    if ("error" in res) {
      setError(res.error);
      setSaving(false);
      return;
    }
    router.push("/meals");
    router.refresh();
  }

  if (foods.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
        <p className="text-zinc-500">
          Δεν έχεις τροφές ακόμα. Πρόσθεσε τροφές πρώτα για να φτιάξεις γεύμα.
        </p>
        <Link
          href="/foods"
          className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          → Στις Τροφές
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Meta */}
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Όνομα γεύματος"
          className={`${inputCls} sm:col-span-2`}
        />
        <select
          value={mealType}
          onChange={(e) => setMealType(e.target.value as MealSlot | "")}
          className={inputCls}
        >
          <option value="">— Τύπος γεύματος —</option>
          {MEAL_SLOTS.map((s) => (
            <option key={s} value={s}>
              {MEAL_SLOT_LABELS[s]}
            </option>
          ))}
        </select>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Περιγραφή (προαιρετικό)"
          className={inputCls}
        />
      </div>

      {/* Ingredients */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Συστατικά
          </h2>
          <button
            type="button"
            onClick={addItem}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            + Προσθήκη
          </button>
        </div>

        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-400">
            Δεν υπάρχουν συστατικά. Πάτα «+ Προσθήκη».
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.map((it) => {
              const food = foodsById.get(it.food_id);
              const m = food
                ? macrosForQuantity(food, it.quantity || 0)
                : { calories: 0, protein: 0, carbs: 0, fats: 0 };
              return (
                <li
                  key={it.key}
                  className="flex flex-wrap items-center gap-2 px-4 py-3"
                >
                  <select
                    value={it.food_id}
                    onChange={(e) =>
                      patchItem(it.key, { food_id: e.target.value })
                    }
                    className={`${inputCls} min-w-40 flex-1`}
                  >
                    {foods.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={it.quantity}
                      onChange={(e) =>
                        patchItem(it.key, { quantity: Number(e.target.value) })
                      }
                      className={`${inputCls} w-24 text-right`}
                    />
                    <span className="text-xs text-zinc-400">
                      {food?.unit ?? "g"}
                    </span>
                  </div>
                  <span className="w-44 text-right text-xs tabular-nums text-zinc-500">
                    {fmt(m.calories)} kcal · {fmt(m.protein)}/{fmt(m.carbs)}/
                    {fmt(m.fats)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(it.key)}
                    aria-label="Αφαίρεση"
                    className="text-zinc-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Totals */}
      <div className="grid grid-cols-4 gap-3">
        {(
          [
            ["Θερμίδες", totals.calories, "kcal"],
            ["Πρωτεΐνη", totals.protein, "g"],
            ["Υδατάν.", totals.carbs, "g"],
            ["Λιπαρά", totals.fats, "g"],
          ] as const
        ).map(([label, value, suffix]) => (
          <div
            key={label}
            className="rounded-xl border border-zinc-200 bg-white p-3 text-center dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="text-xs text-zinc-400">{label}</div>
            <div className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {fmt(value)}
            </div>
            <div className="text-xs text-zinc-400">{suffix}</div>
          </div>
        ))}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {saving ? "Αποθήκευση…" : mealId ? "Ενημέρωση" : "Αποθήκευση"}
        </button>
        <Link
          href="/meals"
          className="rounded-lg border border-zinc-300 px-5 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Άκυρο
        </Link>
      </div>
    </div>
  );
}
