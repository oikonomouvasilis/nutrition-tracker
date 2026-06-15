// Domain types — αντικατοπτρίζουν το schema (supabase/migrations).

export type MealSlot =
  | "breakfast"
  | "lunch"
  | "afternoon"
  | "evening"
  | "other";

export type Unit = "g" | "ml";
export type FoodSource = "manual" | "ai";

export interface Food {
  id: string;
  user_id: string;
  name: string;
  unit: Unit;
  calories_per_100: number;
  protein_per_100: number;
  carbs_per_100: number;
  fats_per_100: number;
  fiber_per_100: number | null;
  sugar_per_100: number | null;
  sodium_per_100: number | null;
  micronutrients: Record<string, number>;
  source: FoodSource;
  created_at: string;
  updated_at: string;
}

export interface Meal {
  id: string;
  user_id: string;
  name: string;
  meal_type: MealSlot | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface MealItem {
  id: string;
  meal_id: string;
  food_id: string;
  quantity: number; // g/ml
  position: number;
  created_at: string;
}

export interface LogEntry {
  id: string;
  user_id: string;
  entry_date: string; // YYYY-MM-DD
  slot: MealSlot;
  meal_id: string | null;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  created_at: string;
}

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

type PerHundred = Pick<
  Food,
  "calories_per_100" | "protein_per_100" | "carbs_per_100" | "fats_per_100"
>;

/** Μακρο για συγκεκριμένη ποσότητα (g/ml) μιας τροφής. */
export function macrosForQuantity(
  food: PerHundred,
  quantity: number,
): MacroTotals {
  const factor = quantity / 100;
  return {
    calories: food.calories_per_100 * factor,
    protein: food.protein_per_100 * factor,
    carbs: food.carbs_per_100 * factor,
    fats: food.fats_per_100 * factor,
  };
}

/** Άθροισμα μακρο πολλών μερίδων (π.χ. όλα τα συστατικά ενός γεύματος). */
export function sumMacros(parts: MacroTotals[]): MacroTotals {
  return parts.reduce<MacroTotals>(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fats: acc.fats + m.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 },
  );
}

export const MEAL_SLOTS: MealSlot[] = [
  "breakfast",
  "lunch",
  "afternoon",
  "evening",
  "other",
];

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "Πρωινό",
  lunch: "Μεσημεριανό",
  afternoon: "Απογευματινό",
  evening: "Βραδινό",
  other: "Άλλο",
};

// Input για δημιουργία/ενημέρωση γεύματος (από τον meal builder).
export interface MealItemInput {
  food_id: string;
  quantity: number;
}

export interface MealInput {
  name: string;
  meal_type: MealSlot | null;
  description: string | null;
  items: MealItemInput[];
}
