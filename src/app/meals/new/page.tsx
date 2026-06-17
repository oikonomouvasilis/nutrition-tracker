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
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <Link href="/meals" className="text-sm text-muted transition hover:text-foreground">
        ← Συνταγές
      </Link>
      <h1 className="mb-6 mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
        Νέα συνταγή
      </h1>
      <MealBuilder foods={(foods ?? []) as Food[]} />
    </main>
  );
}
