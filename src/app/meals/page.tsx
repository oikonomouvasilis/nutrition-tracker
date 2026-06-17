import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  type MealSlot,
  macrosForQuantity,
  sumMacros,
} from "@/types/nutrition";
import Cookbook, { type Recipe } from "./cookbook";

type MealRow = {
  id: string;
  name: string;
  meal_type: MealSlot | null;
  description: string | null;
  meal_items:
    | {
        quantity: number;
        position: number;
        foods: {
          name: string;
          unit: string;
          calories_per_100: number;
          protein_per_100: number;
          carbs_per_100: number;
          fats_per_100: number;
        } | null;
      }[]
    | null;
};

export default async function MealsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("meals")
    .select(
      "id, name, meal_type, description, meal_items(quantity, position, foods(name, unit, calories_per_100, protein_per_100, carbs_per_100, fats_per_100))",
    )
    .order("name", { ascending: true });

  const rows = (data ?? []) as unknown as MealRow[];

  const recipes: Recipe[] = rows.map((m) => {
    const items = (m.meal_items ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((it) => {
        const macros = it.foods
          ? macrosForQuantity(it.foods, it.quantity)
          : { calories: 0, protein: 0, carbs: 0, fats: 0 };
        return {
          name: it.foods?.name ?? "—",
          unit: it.foods?.unit ?? "g",
          quantity: it.quantity,
          ...macros,
        };
      });
    return {
      id: m.id,
      name: m.name,
      meal_type: m.meal_type,
      description: m.description,
      items,
      totals: sumMacros(items),
    };
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Συνταγές</h1>
          <p className="mt-1 text-sm text-muted">
            Το βιβλίο μαγειρικής σου — κάνε κλικ σε μια συνταγή για υλικά & μακρο.
          </p>
        </div>
        <Link
          href="/meals/new"
          className="rounded-xl bg-neon-green px-4 py-2.5 text-sm font-semibold text-[#06281a] transition hover:brightness-110"
        >
          + Νέα συνταγή
        </Link>
      </header>

      <Cookbook recipes={recipes} />
    </main>
  );
}
