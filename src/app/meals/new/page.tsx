import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Food } from "@/types/nutrition";
import MealBuilder from "../meal-builder";

export default async function NewMealPage() {
  const supabase = await createClient();
  const { data: foods } = await supabase
    .from("foods")
    .select("*")
    .order("name", { ascending: true });

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link href="/meals" className="text-sm text-zinc-500 hover:underline">
        ← Γεύματα
      </Link>
      <h1 className="mt-1 mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Νέο γεύμα
      </h1>
      <MealBuilder foods={(foods ?? []) as Food[]} />
    </main>
  );
}
