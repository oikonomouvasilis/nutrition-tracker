"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MealInput } from "@/types/nutrition";

type SaveResult = { id: string } | { error: string };

export async function createMeal(input: MealInput): Promise<SaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Μη συνδεδεμένος χρήστης." };
  if (!input.name.trim()) return { error: "Το όνομα είναι υποχρεωτικό." };

  const { data: meal, error } = await supabase
    .from("meals")
    .insert({
      user_id: user.id,
      name: input.name.trim(),
      meal_type: input.meal_type,
      description: input.description?.trim() || null,
    })
    .select("id")
    .single();

  if (error || !meal) {
    return { error: error?.message ?? "Αποτυχία δημιουργίας γεύματος." };
  }

  const itemsError = await insertItems(supabase, meal.id as string, input);
  if (itemsError) return { error: itemsError };

  revalidatePath("/meals");
  return { id: meal.id as string };
}

export async function updateMeal(
  id: string,
  input: MealInput,
): Promise<SaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Μη συνδεδεμένος χρήστης." };
  if (!input.name.trim()) return { error: "Το όνομα είναι υποχρεωτικό." };

  const { error } = await supabase
    .from("meals")
    .update({
      name: input.name.trim(),
      meal_type: input.meal_type,
      description: input.description?.trim() || null,
    })
    .eq("id", id);
  if (error) return { error: error.message };

  // Sync items: σβήνουμε τα παλιά και ξαναγράφουμε.
  const { error: delErr } = await supabase
    .from("meal_items")
    .delete()
    .eq("meal_id", id);
  if (delErr) return { error: delErr.message };

  const itemsError = await insertItems(supabase, id, input);
  if (itemsError) return { error: itemsError };

  revalidatePath("/meals");
  revalidatePath(`/meals/${id}`);
  return { id };
}

export async function deleteMeal(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("meals").delete().eq("id", id);
  revalidatePath("/meals");
}

// helper: γράφει τα meal_items (φιλτράρει άκυρες γραμμές).
async function insertItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  mealId: string,
  input: MealInput,
): Promise<string | null> {
  const items = input.items.filter((it) => it.food_id && it.quantity > 0);
  if (items.length === 0) return null;

  const rows = items.map((it, i) => ({
    meal_id: mealId,
    food_id: it.food_id,
    quantity: it.quantity,
    position: i,
  }));

  const { error } = await supabase.from("meal_items").insert(rows);
  return error ? error.message : null;
}
