import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Food, MealSlot } from "@/types/nutrition";
import MealBuilder from "../meal-builder";

type MealDetail = {
  id: string;
  name: string;
  meal_type: MealSlot | null;
  description: string | null;
  meal_items: { food_id: string; quantity: number; position: number }[] | null;
};

export default async function EditMealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: foods }, { data: meal }] = await Promise.all([
    supabase.from("foods").select("*").order("name", { ascending: true }),
    supabase
      .from("meals")
      .select(
        "id, name, meal_type, description, meal_items(food_id, quantity, position)",
      )
      .eq("id", id)
      .single(),
  ]);

  if (!meal) notFound();
  const m = meal as unknown as MealDetail;

  const initial = {
    name: m.name,
    meal_type: m.meal_type,
    description: m.description,
    items: (m.meal_items ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((it) => ({ food_id: it.food_id, quantity: it.quantity })),
  };

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link href="/meals" className="text-sm text-zinc-500 hover:underline">
        ← Γεύματα
      </Link>
      <h1 className="mt-1 mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Επεξεργασία γεύματος
      </h1>
      <MealBuilder
        foods={(foods ?? []) as Food[]}
        mealId={id}
        initial={initial}
      />
    </main>
  );
}
