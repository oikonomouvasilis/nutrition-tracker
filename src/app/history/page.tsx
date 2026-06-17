import { createClient } from "@/lib/supabase/server";
import {
  type Food,
  type LogEntry,
  type MealSlot,
  MEAL_SLOTS,
  MEAL_SLOT_LABELS,
  sumMacros,
} from "@/types/nutrition";
import { addDays, formatDateGreek, isValidISODate, todayISO } from "@/lib/date";
import LogAdder, { type MealOption } from "./log-adder";
import { deleteLogEntry } from "./actions";
import Link from "next/link";

const r = (n: number) => Math.round(n);

type MealRow = {
  id: string;
  name: string;
  meal_items:
    | {
        food_id: string;
        quantity: number;
        position: number;
        foods: {
          name: string;
          unit: string;
          calories_per_100: number;
          protein_per_100: number;
          carbs_per_100: number;
          fats_per_100: number;
        } | null;
      }[]
    | null;
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const sp = await searchParams;
  const date = isValidISODate(sp.date) ? sp.date : todayISO();

  const supabase = await createClient();
  const [{ data: entries }, { data: meals }, { data: foods }] =
    await Promise.all([
      supabase
        .from("log_entries")
        .select("*")
        .eq("entry_date", date)
        .order("created_at", { ascending: true }),
      supabase
        .from("meals")
        .select(
          "id, name, meal_items(food_id, quantity, position, foods(name, unit, calories_per_100, protein_per_100, carbs_per_100, fats_per_100))",
        )
        .order("name"),
      supabase.from("foods").select("*").order("name"),
    ]);

  const list = (entries ?? []) as LogEntry[];
  const foodOpts = (foods ?? []) as Food[];

  const mealOpts: MealOption[] = ((meals ?? []) as unknown as MealRow[]).map((m) => ({
    id: m.id,
    name: m.name,
    items: (m.meal_items ?? [])
      .filter((it) => it.foods)
      .sort((a, b) => a.position - b.position)
      .map((it) => ({
        food_id: it.food_id,
        name: it.foods!.name,
        unit: it.foods!.unit,
        quantity: it.quantity,
        per100: {
          calories_per_100: it.foods!.calories_per_100,
          protein_per_100: it.foods!.protein_per_100,
          carbs_per_100: it.foods!.carbs_per_100,
          fats_per_100: it.foods!.fats_per_100,
        },
      })),
  }));

  const totals = sumMacros(
    list.map((e) => ({
      calories: e.calories,
      protein: e.protein,
      carbs: e.carbs,
      fats: e.fats,
    })),
  );

  const isToday = date === todayISO();

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ημερολόγιο</h1>

      {/* Πλοήγηση ημερομηνίας */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={`/history?date=${addDays(date, -1)}`}
          className="rounded-lg border border-edge px-3 py-1.5 text-sm text-muted transition hover:text-foreground"
        >
          ←
        </Link>
        <div className="font-medium text-foreground">{formatDateGreek(date)}</div>
        <Link
          href={`/history?date=${addDays(date, 1)}`}
          className="rounded-lg border border-edge px-3 py-1.5 text-sm text-muted transition hover:text-foreground"
        >
          →
        </Link>
        {!isToday && (
          <Link href="/history" className="text-sm text-neon-green hover:underline">
            Σήμερα
          </Link>
        )}
        <form action="/history" className="ml-auto">
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="rounded-lg border border-edge bg-surface-2 px-2 py-1.5 text-sm text-foreground outline-none focus:border-neon-green/60"
          />
        </form>
      </div>

      {/* Σύνολα ημέρας */}
      <div className="mt-4 grid grid-cols-4 gap-3">
        {(
          [
            ["Θερμίδες", totals.calories, "kcal"],
            ["Πρωτεΐνη", totals.protein, "g"],
            ["Υδατάν.", totals.carbs, "g"],
            ["Λιπαρά", totals.fats, "g"],
          ] as const
        ).map(([label, value, suffix]) => (
          <div key={label} className="card p-3 text-center">
            <div className="text-xs text-muted">{label}</div>
            <div className="text-lg font-semibold tabular-nums text-foreground">{r(value)}</div>
            <div className="text-xs text-muted">{suffix}</div>
          </div>
        ))}
      </div>

      {/* Slots */}
      <div className="mt-6 space-y-4">
        {MEAL_SLOTS.map((slot: MealSlot) => {
          const slotEntries = list.filter((e) => e.slot === slot);
          const slotTotal = sumMacros(
            slotEntries.map((e) => ({
              calories: e.calories,
              protein: e.protein,
              carbs: e.carbs,
              fats: e.fats,
            })),
          );
          return (
            <section key={slot} className="card p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-medium text-foreground">{MEAL_SLOT_LABELS[slot]}</h2>
                {slotEntries.length > 0 && (
                  <span className="text-xs tabular-nums text-muted">
                    {r(slotTotal.calories)} kcal
                  </span>
                )}
              </div>

              {slotEntries.length > 0 && (
                <ul className="mt-2 divide-y divide-edge/70">
                  {slotEntries.map((e) => (
                    <li key={e.id} className="flex items-center justify-between py-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm text-foreground">{e.name}</div>
                        <div className="text-xs tabular-nums text-muted">
                          {r(e.calories)} kcal · Π {r(e.protein)} · Υ {r(e.carbs)} · Λ {r(e.fats)} g
                        </div>
                      </div>
                      <form action={deleteLogEntry}>
                        <input type="hidden" name="id" value={e.id} />
                        <button
                          aria-label="Διαγραφή"
                          className="ml-3 text-muted transition hover:text-neon-pink"
                        >
                          ✕
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-2">
                <LogAdder date={date} slot={slot} meals={mealOpts} foods={foodOpts} />
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
