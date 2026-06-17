// Server-only ανάγνωση στόχων χρήστη (με fallback στις προεπιλογές).
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_GOALS, type Goals } from "@/lib/goals";

export async function getUserGoals(): Promise<Goals> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return DEFAULT_GOALS;

  const { data } = await supabase
    .from("user_goals")
    .select("calories, protein, carbs, fats")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return DEFAULT_GOALS;
  return {
    calories: Number(data.calories),
    protein: Number(data.protein),
    carbs: Number(data.carbs),
    fats: Number(data.fats),
  };
}
