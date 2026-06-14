"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import starterFoods from "@/data/starter-foods.json";

export async function addFood(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await supabase.from("foods").insert({
    user_id: user.id,
    name,
    unit: String(formData.get("unit")) === "ml" ? "ml" : "g",
    calories_per_100: Number(formData.get("calories") ?? 0),
    protein_per_100: Number(formData.get("protein") ?? 0),
    carbs_per_100: Number(formData.get("carbs") ?? 0),
    fats_per_100: Number(formData.get("fats") ?? 0),
  });

  revalidatePath("/foods");
}

export async function deleteFood(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("foods").delete().eq("id", id);

  revalidatePath("/foods");
}

export async function importStarterFoods() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const rows = starterFoods.map((f) => ({ ...f, user_id: user.id }));
  await supabase.from("foods").insert(rows);

  revalidatePath("/foods");
}
