import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  type MealSlot,
  MEAL_SLOTS,
  MEAL_SLOT_LABELS,
  sumMacros,
} from "@/types/nutrition";
import {
  addDays,
  eachDay,
  formatShortGreek,
  isValidISODate,
  todayISO,
} from "@/lib/date";
import { getUserGoals } from "@/lib/goals-data";
import { NUTRIENTS } from "@/lib/nutrients";
import {
  DailyMetricChart,
  type DailyPoint,
  MacroDonut,
  MacroTrend,
  SlotBars,
} from "./stats-charts";
import { MACRO_NEON } from "../_components/dashboard-charts";

const r = (n: number) => Math.round(n);

type Entry = {
  entry_date: string;
  slot: MealSlot;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  nutrients: Record<string, number> | null;
};

const PRESETS = [
  { days: 7, label: "7 ημέρες" },
  { days: 30, label: "30 ημέρες" },
  { days: 90, label: "90 ημέρες" },
];

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const today = todayISO();
  const to = isValidISODate(sp.to) ? sp.to : today;
  const from = isValidISODate(sp.from) ? sp.from : addDays(to, -6);

  const supabase = await createClient();
  const goals = await getUserGoals();
  const { data } = await supabase
    .from("log_entries")
    .select("entry_date, slot, calories, protein, carbs, fats, nutrients")
    .gte("entry_date", from)
    .lte("entry_date", to);

  const entries = (data ?? []) as Entry[];

  // ── Aggregation ανά ημέρα ──────────────────────────────────────────────────
  const days = eachDay(from, to);
  const spanDays = days.length;
  const byDay = new Map(
    days.map((d) => [d, { calories: 0, protein: 0, carbs: 0, fats: 0 }]),
  );
  const bySlot = new Map<MealSlot, number>(MEAL_SLOTS.map((s) => [s, 0]));
  // Επιπλέον θρεπτικά: σύνολα ανά ημέρα + γενικό σύνολο (για να ξέρουμε ποια έχουν δεδομένα).
  const nutrientByDay = new Map<string, Record<string, number>>(
    days.map((d) => [d, {}]),
  );
  const nutrientTotalsAll: Record<string, number> = {};

  for (const e of entries) {
    const agg = byDay.get(e.entry_date);
    if (agg) {
      agg.calories += e.calories;
      agg.protein += e.protein;
      agg.carbs += e.carbs;
      agg.fats += e.fats;
    }
    bySlot.set(e.slot, (bySlot.get(e.slot) ?? 0) + e.calories);

    const dn = nutrientByDay.get(e.entry_date);
    for (const [k, v] of Object.entries(e.nutrients ?? {})) {
      const num = Number(v) || 0;
      if (dn) dn[k] = (dn[k] ?? 0) + num;
      nutrientTotalsAll[k] = (nutrientTotalsAll[k] ?? 0) + num;
    }
  }

  // Μόνο τα θρεπτικά που έχουν δεδομένα στο διάστημα (για το menu «+ Άλλα»).
  const availableNutrientKeys = NUTRIENTS.filter(
    (n) => (nutrientTotalsAll[n.key] ?? 0) > 0,
  ).map((n) => n.key);

  const r1 = (n: number) => Math.round(n * 10) / 10;
  const daily: DailyPoint[] = days.map((d) => {
    const v = byDay.get(d)!;
    const dn = nutrientByDay.get(d)!;
    const point: DailyPoint = {
      label: formatShortGreek(d),
      calories: r(v.calories),
      protein: r(v.protein),
      carbs: r(v.carbs),
      fats: r(v.fats),
    };
    for (const k of availableNutrientKeys) point[k] = r1(dn[k] ?? 0);
    return point;
  });

  const slotData = MEAL_SLOTS.map((s) => ({
    label: MEAL_SLOT_LABELS[s],
    calories: r(bySlot.get(s) ?? 0),
  }));

  const totals = sumMacros(days.map((d) => byDay.get(d)!));
  const loggedDays = new Set(entries.map((e) => e.entry_date)).size;
  const div = Math.max(loggedDays, 1);
  const avg = {
    calories: totals.calories / div,
    protein: totals.protein / div,
    carbs: totals.carbs / div,
    fats: totals.fats / div,
  };

  // Ημέρες εντός στόχου: θερμίδες ±15% του στόχου, μόνο για ημέρες με καταγραφή.
  const lo = goals.calories * 0.85;
  const hi = goals.calories * 1.15;
  let adherent = 0;
  for (const d of days) {
    const c = byDay.get(d)!.calories;
    if (c > 0 && c >= lo && c <= hi) adherent++;
  }

  const macroKcal = {
    protein: totals.protein * 4,
    carbs: totals.carbs * 4,
    fats: totals.fats * 9,
  };

  const kpis = [
    { label: "Σύνολο θερμίδων", value: `${r(totals.calories)}`, suffix: "kcal" },
    { label: "Μ.Ο. / ημέρα", value: `${r(avg.calories)}`, suffix: `kcal · ${loggedDays} ημέρες` },
    { label: "Ημέρες καταγραφής", value: `${loggedDays}`, suffix: `από ${spanDays}` },
    { label: "Εντός στόχου", value: `${adherent}`, suffix: `${loggedDays > 0 ? r((adherent / loggedDays) * 100) : 0}% των ημερών` },
  ];

  const avgProgress = [
    { label: "Θερμίδες", value: avg.calories, goal: goals.calories, unit: "kcal", color: MACRO_NEON.calories },
    { label: "Πρωτεΐνη", value: avg.protein, goal: goals.protein, unit: "g", color: MACRO_NEON.protein },
    { label: "Υδατάνθρακες", value: avg.carbs, goal: goals.carbs, unit: "g", color: MACRO_NEON.carbs },
    { label: "Λιπαρά", value: avg.fats, goal: goals.fats, unit: "g", color: MACRO_NEON.fats },
  ];

  const isPresetActive = (n: number) => to === today && spanDays === n;
  const hasData = entries.length > 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Στατιστικά</h1>
          <p className="mt-1 text-sm text-muted">
            Ανάλυση πρόσληψης θερμίδων & μακροθρεπτικών στον χρόνο.
          </p>
        </div>

        {/* Φίλτρα: presets + προσαρμοσμένο εύρος */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex rounded-xl border border-edge bg-surface/60 p-1">
            {PRESETS.map((p) => {
              const active = isPresetActive(p.days);
              return (
                <Link
                  key={p.days}
                  href={`/stats?from=${addDays(today, -(p.days - 1))}&to=${today}`}
                  className={[
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                    active ? "bg-surface-2 text-neon-green" : "text-muted hover:text-foreground",
                  ].join(" ")}
                >
                  {p.label}
                </Link>
              );
            })}
          </div>

          <form action="/stats" className="flex items-end gap-2 text-sm">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-muted">Από</span>
              <input type="date" name="from" defaultValue={from} className="rounded-lg border border-edge bg-surface-2 px-2 py-1.5 text-foreground outline-none focus:border-neon-green/60" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-muted">Έως</span>
              <input type="date" name="to" defaultValue={to} className="rounded-lg border border-edge bg-surface-2 px-2 py-1.5 text-foreground outline-none focus:border-neon-green/60" />
            </label>
            <button className="rounded-lg bg-neon-green px-3 py-2 text-sm font-semibold text-[#06281a] transition hover:brightness-110">
              Εφαρμογή
            </button>
          </form>
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="card p-4">
            <div className="text-xs text-muted">{k.label}</div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">{k.value}</div>
            <div className="mt-1 text-[11px] text-muted">{k.suffix}</div>
          </div>
        ))}
      </div>

      {!hasData ? (
        <div className="card mt-4 flex flex-col items-center gap-3 p-12 text-center">
          <p className="text-muted">Δεν υπάρχουν καταγραφές στο επιλεγμένο διάστημα.</p>
          <Link href="/history" className="rounded-xl bg-neon-green px-4 py-2 text-sm font-semibold text-[#06281a] transition hover:brightness-110">
            + Καταγραφή γεύματος
          </Link>
        </div>
      ) : (
        <>
          {/* Ημερήσιο γράφημα με εναλλαγή μετρικής */}
          <div className="card mt-4 p-5">
            <h2 className="mb-1 text-sm font-medium text-muted">Ημερήσια πρόσληψη</h2>
            <DailyMetricChart
              daily={daily}
              goalCalories={goals.calories}
              availableNutrientKeys={availableNutrientKeys}
            />
          </div>

          {/* Τάση μακρο + κατανομή */}
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="card p-5 lg:col-span-2">
              <h2 className="mb-3 text-sm font-medium text-muted">Τάση μακρο (g/ημέρα)</h2>
              <MacroTrend daily={daily} />
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
                {(["protein", "carbs", "fats"] as const).map((k) => (
                  <span key={k} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: MACRO_NEON[k] }} />
                    {k === "protein" ? "Πρωτεΐνη" : k === "carbs" ? "Υδατάνθρακες" : "Λιπαρά"}
                  </span>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <h2 className="mb-3 text-sm font-medium text-muted">Κατανομή μακρο (kcal)</h2>
              <MacroDonut macroKcal={macroKcal} totalKcal={totals.calories} />
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[
                  ["Π", totals.protein, MACRO_NEON.protein],
                  ["Υ", totals.carbs, MACRO_NEON.carbs],
                  ["Λ", totals.fats, MACRO_NEON.fats],
                ].map(([lbl, val, col]) => (
                  <div key={lbl as string} className="rounded-lg bg-surface-2 py-2">
                    <div className="text-xs" style={{ color: col as string }}>{lbl as string}</div>
                    <div className="text-sm font-semibold tabular-nums">{r(val as number)}g</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Ανά γεύμα + μέσος όρος vs στόχος */}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="card p-5">
              <h2 className="mb-3 text-sm font-medium text-muted">Θερμίδες ανά γεύμα</h2>
              <SlotBars data={slotData} />
            </div>

            <div className="card p-5">
              <h2 className="mb-3 text-sm font-medium text-muted">Μ.Ο. ημέρας vs στόχος</h2>
              <div className="space-y-3">
                {avgProgress.map((g) => {
                  const pct = g.goal > 0 ? Math.min((g.value / g.goal) * 100, 100) : 0;
                  return (
                    <div key={g.label}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted">{g.label}</span>
                        <span className="tabular-nums text-foreground">
                          {r(g.value)}<span className="text-muted">/{g.goal} {g.unit}</span>
                        </span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: g.color, boxShadow: `0 0 10px ${g.color}` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-[11px] text-muted">
                Στόχοι από την ενότητα «Πλάνο».
              </p>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
