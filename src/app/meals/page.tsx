import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  type MealSlot,
  MEAL_SLOT_LABELS,
  macrosForQuantity,
  sumMacros,
} from "@/types/nutrition";
import { deleteMeal } from "./actions";

type MealRow = {
  id: string;
  name: string;
  meal_type: MealSlot | null;
  meal_items:
    | {
        quantity: number;
        foods: {
          calories_per_100: number;
          protein_per_100: number;
          carbs_per_100: number;
          fats_per_100: number;
        } | null;
      }[]
    | null;
};

const fmt = (n: number) => Math.round(n);

export default async function MealsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("meals")
    .select(
      "id, name, meal_type, meal_items(quantity, foods(calories_per_100, protein_per_100, carbs_per_100, fats_per_100))",
    )
    .order("name", { ascending: true });

  const meals = (data ?? []) as unknown as MealRow[];

  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-zinc-500 hover:underline">
            ← Αρχική
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            🍽️ Γεύματα
          </h1>
        </div>
        <Link
          href="/meals/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          + Νέο γεύμα
        </Link>
      </header>

      {meals.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-zinc-400 dark:border-zinc-700">
          Δεν υπάρχουν γεύματα ακόμα. Πάτα «+ Νέο γεύμα».
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {meals.map((meal) => {
            const totals = sumMacros(
              (meal.meal_items ?? []).map((it) =>
                it.foods
                  ? macrosForQuantity(it.foods, it.quantity)
                  : { calories: 0, protein: 0, carbs: 0, fats: 0 },
              ),
            );
            return (
              <li
                key={meal.id}
                className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <Link href={`/meals/${meal.id}`} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">
                      {meal.name}
                    </span>
                    {meal.meal_type && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
                        {MEAL_SLOT_LABELS[meal.meal_type]}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm tabular-nums text-zinc-500">
                    {fmt(totals.calories)} kcal · Π {fmt(totals.protein)} · Υ{" "}
                    {fmt(totals.carbs)} · Λ {fmt(totals.fats)} g
                    <span className="ml-2 text-xs text-zinc-400">
                      ({meal.meal_items?.length ?? 0} συστατικά)
                    </span>
                  </div>
                </Link>
                <form action={deleteMeal} className="ml-3">
                  <input type="hidden" name="id" value={meal.id} />
                  <button
                    aria-label={`Διαγραφή ${meal.name}`}
                    className="text-zinc-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
