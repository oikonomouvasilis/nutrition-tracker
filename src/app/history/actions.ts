"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  type MealSlot,
  macrosForQuantity,
  sumMacros,
} from "@/types/nutrition";

type LogResult = { ok: true } | { error: string };

type Per100 = {
  calories_per_100: number;
  protein_per_100: number;
  carbs_per_100: number;
  fats_per_100: number;
};

/**
 * Καταγραφή μιας συνταγής με ρυθμιζόμενες ποσότητες ανά υλικό.
 * Τα μακρο υπολογίζονται server-side από τις τιμές ανά 100 (snapshot, authoritative).
 */
export async function logMeal(input: {
  date: string;
  slot: MealSlot;
  meal_id: string;
  items: { food_id: string; quantity: number }[];
}): Promise<LogResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Μη συνδεδεμένος χρήστης." };

  const { data: meal } = await supabase
    .from("meals")
    .select("name")
    .eq("id", input.meal_id)
    .single();
  if (!meal) return { error: "Η συνταγή δεν βρέθηκε." };

  // Φέρνουμε τις τιμές ανά 100 για τα food_ids της συνταγής (RLS: μόνο δικά του).
  const foodIds = [...new Set(input.items.map((it) => it.food_id))];
  const { data: foods } = await supabase
    .from("foods")
    .select("id, calories_per_100, protein_per_100, carbs_per_100, fats_per_100")
    .in("id", foodIds);

  const per100 = new Map(
    ((foods ?? []) as (Per100 & { id: string })[]).map((f) => [f.id, f]),
  );

  const totals = sumMacros(
    input.items.map((it) => {
      const f = per100.get(it.food_id);
      const q = Number(it.quantity) || 0;
      return f ? macrosForQuantity(f, q) : { calories: 0, protein: 0, carbs: 0, fats: 0 };
    }),
  );

  const { error } = await supabase.from("log_entries").insert({
    user_id: user.id,
    entry_date: input.date,
    slot: input.slot,
    meal_id: input.meal_id,
    name: meal.name as string,
    calories: totals.calories,
    protein: totals.protein,
    carbs: totals.carbs,
    fats: totals.fats,
  });
  if (error) return { error: error.message };

  revalidatePath("/history");
  return { ok: true };
}

/** Καταγραφή μεμονωμένης τροφής με ποσότητα (snapshot). */
export async function logFood(input: {
  date: string;
  slot: MealSlot;
  food_id: string;
  quantity: number;
}): Promise<LogResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Μη συνδεδεμένος χρήστης." };

  const { data: food } = await supabase
    .from("foods")
    .select(
      "name, unit, calories_per_100, protein_per_100, carbs_per_100, fats_per_100",
    )
    .eq("id", input.food_id)
    .single();

  if (!food) return { error: "Η τροφή δεν βρέθηκε." };

  const m = macrosForQuantity(food, input.quantity);
  const { error } = await supabase.from("log_entries").insert({
    user_id: user.id,
    entry_date: input.date,
    slot: input.slot,
    meal_id: null,
    name: `${food.name} (${input.quantity}${food.unit})`,
    calories: m.calories,
    protein: m.protein,
    carbs: m.carbs,
    fats: m.fats,
  });
  if (error) return { error: error.message };

  revalidatePath("/history");
  return { ok: true };
}

export async function deleteLogEntry(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("log_entries").delete().eq("id", id);
  revalidatePath("/history");
}
