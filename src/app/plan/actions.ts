"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function num(v: FormDataEntryValue | null): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export async function saveGoals(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("user_goals").upsert({
    user_id: user.id,
    calories: num(formData.get("calories")),
    protein: num(formData.get("protein")),
    carbs: num(formData.get("carbs")),
    fats: num(formData.get("fats")),
  });

  // Οι στόχοι χρησιμοποιούνται σε Αρχική & Στατιστικά.
  revalidatePath("/plan");
  revalidatePath("/");
  revalidatePath("/stats");
}
