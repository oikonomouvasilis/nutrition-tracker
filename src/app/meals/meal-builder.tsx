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
import FoodPicker from "./food-picker";

type PickerState = { mode: "add" } | { mode: "change"; key: string };

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
  "rounded-lg border border-edge bg-surface-2 px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-neon-green/60";

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
  const [picker, setPicker] = useState<PickerState | null>(null);

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
    setPicker({ mode: "add" });
  }
  function patchItem(key: string, patch: Partial<BuilderItem>) {
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, ...patch } : it)),
    );
  }
  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }
  function handlePick(food: Food) {
    if (!picker) return;
    if (picker.mode === "add") {
      setItems((prev) => [
        ...prev,
        { key: crypto.randomUUID(), food_id: food.id, quantity: 100 },
      ]);
    } else {
      patchItem(picker.key, { food_id: food.id });
    }
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
      <div className="card p-8 text-center">
        <p className="text-muted">
          Δεν έχεις τροφές ακόμα. Πρόσθεσε τροφές πρώτα για να φτιάξεις συνταγή.
        </p>
        <Link
          href="/foods"
          className="mt-4 inline-block rounded-xl bg-neon-green px-4 py-2 text-sm font-semibold text-[#06281a] transition hover:brightness-110"
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
          placeholder="Όνομα συνταγής"
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
      <div className="card overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-edge px-4 py-3">
          <h2 className="text-sm font-medium text-muted">Υλικά</h2>
          <button
            type="button"
            onClick={addItem}
            className="rounded-lg border border-edge px-3 py-1.5 text-sm text-muted transition hover:border-neon-green/50 hover:text-foreground"
          >
            + Προσθήκη
          </button>
        </div>

        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">
            Δεν υπάρχουν υλικά. Πάτα «+ Προσθήκη».
          </p>
        ) : (
          <ul className="divide-y divide-edge">
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
                  <button
                    type="button"
                    onClick={() => setPicker({ mode: "change", key: it.key })}
                    className={`${inputCls} min-w-40 flex-1 truncate text-left ${food ? "" : "text-muted"}`}
                  >
                    {food ? food.name : "Επιλογή τροφής…"}
                  </button>
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
                    <span className="text-xs text-muted">
                      {food?.unit ?? "g"}
                    </span>
                  </div>
                  <span className="w-44 text-right text-xs tabular-nums text-muted">
                    {fmt(m.calories)} kcal · {fmt(m.protein)}/{fmt(m.carbs)}/
                    {fmt(m.fats)}
                  </span>
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
          <div key={label} className="card p-3 text-center">
            <div className="text-xs text-muted">{label}</div>
            <div className="text-lg font-semibold tabular-nums text-foreground">
              {fmt(value)}
            </div>
            <div className="text-xs text-muted">{suffix}</div>
          </div>
        ))}
      </div>

      {error && (
        <p className="rounded-lg border border-neon-pink/30 bg-neon-pink/10 px-3 py-2 text-sm text-neon-pink">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-neon-green px-5 py-2 text-sm font-semibold text-[#06281a] transition hover:brightness-110 disabled:opacity-50"
        >
          {saving ? "Αποθήκευση…" : mealId ? "Ενημέρωση" : "Αποθήκευση"}
        </button>
        <Link
          href="/meals"
          className="rounded-xl border border-edge px-5 py-2 text-sm font-medium text-muted transition hover:text-foreground"
        >
          Άκυρο
        </Link>
      </div>

      {picker && (
        <FoodPicker
          foods={foods}
          onSelect={handlePick}
          onClose={() => setPicker(null)}
          title={picker.mode === "add" ? "Προσθήκη υλικού" : "Αλλαγή τροφής"}
        />
      )}
    </div>
  );
}
