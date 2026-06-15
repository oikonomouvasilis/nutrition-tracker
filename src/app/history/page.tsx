import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  type Food,
  type LogEntry,
  MEAL_SLOTS,
  MEAL_SLOT_LABELS,
  sumMacros,
} from "@/types/nutrition";
import { addDays, formatDateGreek, isValidISODate, todayISO } from "@/lib/date";
import LogAdder from "./log-adder";
import { deleteLogEntry } from "./actions";

const r = (n: number) => Math.round(n);

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
      supabase.from("meals").select("id, name").order("name"),
      supabase.from("foods").select("*").order("name"),
    ]);

  const list = (entries ?? []) as LogEntry[];
  const mealOpts = (meals ?? []) as { id: string; name: string }[];
  const foodOpts = (foods ?? []) as Food[];

  const totals = sumMacros(
    list.map((e) => ({
      calories: e.calories,
      protein: e.protein,
      carbs: e.carbs,
      fats: e.fats,
    })),
  );

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← Αρχική
      </Link>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        📅 Ημερολόγιο
      </h1>

      {/* Date navigation */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href={`/history?date=${addDays(date, -1)}`}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          ←
        </Link>
        <div className="font-medium text-zinc-800 dark:text-zinc-200">
          {formatDateGreek(date)}
        </div>
        <Link
          href={`/history?date=${addDays(date, 1)}`}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          →
        </Link>
        <Link
          href="/history"
          className="text-sm text-zinc-500 hover:underline"
        >
          Σήμερα
        </Link>
        <form action="/history" className="ml-auto">
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </form>
      </div>

      {/* Daily totals */}
      <div className="mt-4 grid grid-cols-4 gap-3">
        {(
          [
            ["Θερμίδες", totals.calories, "kcal"],
            ["Πρωτεΐνη", totals.protein, "g"],
            ["Υδατάν.", totals.carbs, "g"],
            ["Λιπαρά", totals.fats, "g"],
          ] as const
        ).map(([label, value, suffix]) => (
          <div
            key={label}
            className="rounded-xl border border-zinc-200 bg-white p-3 text-center dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="text-xs text-zinc-400">{label}</div>
            <div className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {r(value)}
            </div>
            <div className="text-xs text-zinc-400">{suffix}</div>
          </div>
        ))}
      </div>

      {/* Slots */}
      <div className="mt-6 space-y-4">
        {MEAL_SLOTS.map((slot) => {
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
            <section
              key={slot}
              className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-medium text-zinc-900 dark:text-zinc-50">
                  {MEAL_SLOT_LABELS[slot]}
                </h2>
                {slotEntries.length > 0 && (
                  <span className="text-xs tabular-nums text-zinc-400">
                    {r(slotTotal.calories)} kcal
                  </span>
                )}
              </div>

              {slotEntries.length > 0 && (
                <ul className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
                  {slotEntries.map((e) => (
                    <li
                      key={e.id}
                      className="flex items-center justify-between py-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm text-zinc-900 dark:text-zinc-100">
                          {e.name}
                        </div>
                        <div className="text-xs tabular-nums text-zinc-500">
                          {r(e.calories)} kcal · Π {r(e.protein)} · Υ{" "}
                          {r(e.carbs)} · Λ {r(e.fats)} g
                        </div>
                      </div>
                      <form action={deleteLogEntry}>
                        <input type="hidden" name="id" value={e.id} />
                        <button
                          aria-label="Διαγραφή"
                          className="ml-3 text-zinc-400 hover:text-red-600"
                        >
                          ✕
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-2">
                <LogAdder
                  date={date}
                  slot={slot}
                  meals={mealOpts}
                  foods={foodOpts}
                />
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
