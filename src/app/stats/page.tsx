import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { sumMacros } from "@/types/nutrition";
import {
  addDays,
  eachDay,
  formatShortGreek,
  isValidISODate,
  todayISO,
} from "@/lib/date";
import StatsCharts from "./stats-charts";

const r = (n: number) => Math.round(n);

type Entry = {
  entry_date: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const to = isValidISODate(sp.to) ? sp.to : todayISO();
  const from = isValidISODate(sp.from) ? sp.from : addDays(to, -6);

  const supabase = await createClient();
  const { data } = await supabase
    .from("log_entries")
    .select("entry_date, calories, protein, carbs, fats")
    .gte("entry_date", from)
    .lte("entry_date", to);

  const entries = (data ?? []) as Entry[];

  // Aggregation ανά ημέρα (συμπεριλαμβάνει κενές ημέρες).
  const days = eachDay(from, to);
  const byDay = new Map(
    days.map((d) => [d, { calories: 0, protein: 0, carbs: 0, fats: 0 }]),
  );
  for (const e of entries) {
    const agg = byDay.get(e.entry_date);
    if (agg) {
      agg.calories += e.calories;
      agg.protein += e.protein;
      agg.carbs += e.carbs;
      agg.fats += e.fats;
    }
  }

  const daily = days.map((d) => ({
    label: formatShortGreek(d),
    calories: r(byDay.get(d)!.calories),
  }));

  const totals = sumMacros(days.map((d) => byDay.get(d)!));
  const loggedDays = new Set(entries.map((e) => e.entry_date)).size;
  const avg = loggedDays > 0 ? totals.calories / loggedDays : 0;

  const macroKcal = {
    protein: totals.protein * 4,
    carbs: totals.carbs * 4,
    fats: totals.fats * 9,
  };

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← Αρχική
      </Link>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        📊 Στατιστικά
      </h1>

      {/* Date range */}
      <form
        action="/stats"
        className="mt-4 flex flex-wrap items-end gap-3 text-sm"
      >
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Από</span>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="rounded-lg border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Έως</span>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="rounded-lg border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>
        <button className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
          Εφαρμογή
        </button>
      </form>

      {/* Summary */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["Σύνολο θερμίδων", r(totals.calories), "kcal"],
            ["Μ.Ο. / ημέρα", r(avg), `kcal · ${loggedDays} ημ.`],
            ["Πρωτεΐνη (σύν.)", r(totals.protein), "g"],
            ["Υδ/Λιπ (σύν.)", `${r(totals.carbs)}/${r(totals.fats)}`, "g"],
          ] as const
        ).map(([label, value, suffix]) => (
          <div
            key={label}
            className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="text-xs text-zinc-400">{label}</div>
            <div className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {value}
            </div>
            <div className="text-xs text-zinc-400">{suffix}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="mt-6">
        <StatsCharts daily={daily} macroKcal={macroKcal} />
      </div>
    </main>
  );
}
