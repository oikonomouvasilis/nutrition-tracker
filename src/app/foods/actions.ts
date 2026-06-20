"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MICRO_JSON_KEYS } from "@/lib/nutrients";
import starterFoods from "@/data/starter-foods.json";

/** Προαιρετική μη-αρνητική αριθμητική τιμή· "" / άκυρο -> null. */
function optNum(v: FormDataEntryValue | null): number | null {
  if (v === null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** micronutrients JSON -> κρατάμε μόνο γνωστά κλειδιά & μη-αρνητικούς αριθμούς. */
function parseMicros(v: FormDataEntryValue | null): Record<string, number> {
  const micronutrients: Record<string, number> = {};
  try {
    const raw = JSON.parse(String(v ?? "{}"));
    if (raw && typeof raw === "object") {
      for (const [k, val] of Object.entries(raw as Record<string, unknown>)) {
        if (!MICRO_JSON_KEYS.has(k)) continue;
        const n = Number(val);
        if (Number.isFinite(n) && n >= 0) micronutrients[k] = n;
      }
    }
  } catch {
    // αγνοούμε άκυρο JSON
  }
  return micronutrients;
}

/** Κοινά πεδία τροφής από το FormData (όνομα + μακρο + extended + micros). */
function foodColumns(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    unit: String(formData.get("unit")) === "ml" ? "ml" : "g",
    calories_per_100: Number(formData.get("calories") ?? 0),
    protein_per_100: Number(formData.get("protein") ?? 0),
    carbs_per_100: Number(formData.get("carbs") ?? 0),
    fats_per_100: Number(formData.get("fats") ?? 0),
    fiber_per_100: optNum(formData.get("fiber")),
    sugar_per_100: optNum(formData.get("sugar")),
    sodium_per_100: optNum(formData.get("sodium")),
    micronutrients: parseMicros(formData.get("micronutrients")),
  };
}

export async function addFood(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const cols = foodColumns(formData);
  if (!cols.name) return;

  await supabase.from("foods").insert({ user_id: user.id, ...cols });

  revalidatePath("/foods");
}

export async function updateFood(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const cols = foodColumns(formData);
  if (!cols.name) return;

  // Δεν αγγίζουμε το source. RLS + user_id περιορίζουν στον ιδιοκτήτη.
  await supabase
    .from("foods")
    .update(cols)
    .eq("id", id)
    .eq("user_id", user.id);

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
