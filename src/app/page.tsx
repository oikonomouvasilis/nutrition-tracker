import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  type MealSlot,
  MEAL_SLOT_LABELS,
  macrosForQuantity,
  sumMacros,
} from "@/types/nutrition";
import {
  addDays,
  eachDay,
  formatDateGreek,
  formatShortGreek,
  todayISO,
} from "@/lib/date";
import { getUserGoals } from "@/lib/goals-data";
import { CaloriesBars, MacroDonut, MACRO_NEON } from "./_components/dashboard-charts";

const r = (n: number) => Math.round(n);

type LogRow = {
  entry_date: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

type MealRow = {
  id: string;
  name: string;
  meal_type: MealSlot | null;
  meal_items:
    | {
        quantity: number;
        foods: {
          calories_per_100: number;
          protein_per_100: number;
          carbs_per_100: number;
          fats_per_100: number;
        } | null;
      }[]
    | null;
};

const RANGES = {
  today: { days: 1, label: "Σήμερα" },
  "7d": { days: 7, label: "7 ημέρες" },
  "30d": { days: 30, label: "30 ημέρες" },
} as const;
type RangeKey = keyof typeof RANGES;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Καλό βράδυ";
  if (h < 12) return "Καλημέρα";
  if (h < 18) return "Καλό απόγευμα";
  return "Καλησπέρα";
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range: RangeKey = sp.range && sp.range in RANGES ? (sp.range as RangeKey) : "7d";
  const spanDays = RANGES[range].days;

  const today = todayISO();
  const from = addDays(today, -(spanDays - 1));
  const windowStart = addDays(today, -29); // φέρνουμε 30 ημέρες, φιλτράρουμε τοπικά

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const goals = await getUserGoals();

  const [logRes, foodsRes, mealsCountRes, mealsRes] = await Promise.all([
    supabase
      .from("log_entries")
      .select("entry_date, calories, protein, carbs, fats")
      .gte("entry_date", windowStart)
      .lte("entry_date", today),
    supabase.from("foods").select("id", { count: "exact", head: true }),
    supabase.from("meals").select("id", { count: "exact", head: true }),
    supabase
      .from("meals")
      .select(
        "id, name, meal_type, created_at, meal_items(quantity, foods(calories_per_100, protein_per_100, carbs_per_100, fats_per_100))",
      )
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const allLogs = (logRes.data ?? []) as LogRow[];
  const foodsCount = foodsRes.count ?? 0;
  const mealsCount = mealsCountRes.count ?? 0;
  const meals = (mealsRes.data ?? []) as unknown as MealRow[];

  // ── Aggregations για το επιλεγμένο διάστημα ───────────────────────────────
  const rangeDays = eachDay(from, today);
  const inRange = allLogs.filter((e) => e.entry_date >= from && e.entry_date <= today);

  const byDay = new Map(rangeDays.map((d) => [d, { calories: 0, protein: 0, carbs: 0, fats: 0 }]));
  for (const e of inRange) {
    const agg = byDay.get(e.entry_date);
    if (agg) {
      agg.calories += e.calories;
      agg.protein += e.protein;
      agg.carbs += e.carbs;
      agg.fats += e.fats;
    }
  }

  const daily = rangeDays.map((d) => ({
    label: formatShortGreek(d),
    calories: r(byDay.get(d)!.calories),
  }));

  const totals = sumMacros(rangeDays.map((d) => byDay.get(d)!));
  const loggedDays = new Set(inRange.map((e) => e.entry_date)).size;
  const divisor = Math.max(loggedDays, 1);
  const avg = {
    calories: totals.calories / divisor,
    protein: totals.protein / divisor,
    carbs: totals.carbs / divisor,
    fats: totals.fats / divisor,
  };

  // Σήμερα (για πρόοδο στόχων) — ανεξάρτητα από το φίλτρο.
  const todayTotals = sumMacros(
    allLogs.filter((e) => e.entry_date === today).map((e) => ({
      calories: e.calories,
      protein: e.protein,
      carbs: e.carbs,
      fats: e.fats,
    })),
  );

  const macroKcal = {
    protein: totals.protein * 4,
    carbs: totals.carbs * 4,
    fats: totals.fats * 9,
  };

  // KPI: για «Σήμερα» δείχνουμε το σύνολο ημέρας, αλλιώς τον μέσο όρο/ημέρα.
  const isToday = range === "today";
  const kpiBase = isToday ? todayTotals : avg;

  const kpis = [
    { key: "calories", label: "Θερμίδες", value: kpiBase.calories, goal: goals.calories, unit: "kcal", color: MACRO_NEON.calories },
    { key: "protein", label: "Πρωτεΐνη", value: kpiBase.protein, goal: goals.protein, unit: "g", color: MACRO_NEON.protein },
    { key: "carbs", label: "Υδατάνθρακες", value: kpiBase.carbs, goal: goals.carbs, unit: "g", color: MACRO_NEON.carbs },
    { key: "fats", label: "Λιπαρά", value: kpiBase.fats, goal: goals.fats, unit: "g", color: MACRO_NEON.fats },
  ] as const;

  const goalProgress = [
    { label: "Θερμίδες", value: todayTotals.calories, goal: goals.calories, unit: "kcal", color: MACRO_NEON.calories },
    { label: "Πρωτεΐνη", value: todayTotals.protein, goal: goals.protein, unit: "g", color: MACRO_NEON.protein },
    { label: "Υδατάνθρακες", value: todayTotals.carbs, goal: goals.carbs, unit: "g", color: MACRO_NEON.carbs },
    { label: "Λιπαρά", value: todayTotals.fats, goal: goals.fats, unit: "g", color: MACRO_NEON.fats },
  ];

  const recentMeals = meals.map((m) => {
    const t = sumMacros(
      (m.meal_items ?? []).map((it) =>
        it.foods ? macrosForQuantity(it.foods, it.quantity) : { calories: 0, protein: 0, carbs: 0, fats: 0 },
      ),
    );
    return { id: m.id, name: m.name, meal_type: m.meal_type, calories: r(t.calories), items: m.meal_items?.length ?? 0 };
  });

  const hasAnyData = inRange.length > 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {greeting()}
            {user?.email ? `, ${user.email.split("@")[0]}` : ""} <span className="text-neon-green">👋</span>
          </h1>
          <p className="mt-1 text-sm text-muted">{formatDateGreek(today)}</p>
        </div>

        {/* Φίλτρο περιόδου */}
        <div className="flex rounded-xl border border-edge bg-surface/60 p-1">
          {(Object.keys(RANGES) as RangeKey[]).map((key) => {
            const active = key === range;
            return (
              <Link
                key={key}
                href={key === "7d" ? "/" : `/?range=${key}`}
                className={[
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                  active ? "bg-surface-2 text-neon-green" : "text-muted hover:text-foreground",
                ].join(" ")}
              >
                {RANGES[key].label}
              </Link>
            );
          })}
        </div>
      </div>

      {!hasAnyData && (
        <div className="card mt-6 flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-muted">
            Δεν υπάρχουν καταγραφές στο διάστημα <strong className="text-foreground">{RANGES[range].label.toLowerCase()}</strong>.
          </p>
          <Link
            href="/history"
            className="rounded-xl bg-neon-green px-4 py-2 text-sm font-semibold text-[#06281a] transition hover:brightness-110"
          >
            + Καταγραφή γεύματος
          </Link>
        </div>
      )}

      {/* KPI cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => {
          const pct = k.goal > 0 ? Math.min((k.value / k.goal) * 100, 100) : 0;
          return (
            <div key={k.key} className="card p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">{k.label}</span>
                <span className="h-2 w-2 rounded-full" style={{ background: k.color, boxShadow: `0 0 8px ${k.color}` }} />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-semibold tabular-nums">{r(k.value)}</span>
                <span className="text-xs text-muted">{k.unit}</span>
              </div>
              <div className="mt-1 text-[11px] text-muted">
                {isToday ? "σήμερα" : "μ.ο./ημέρα"} · στόχος {k.goal}
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: k.color, boxShadow: `0 0 10px ${k.color}` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted">Θερμίδες ανά ημέρα</h2>
            <Link href="/stats" className="text-xs text-neon-green hover:underline">
              Στατιστικά →
            </Link>
          </div>
          <CaloriesBars daily={daily} goal={goals.calories} />
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

      {/* Bottom row: στόχοι σήμερα + πρόσφατες συνταγές + σύνοψη */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Πρόοδος στόχων σήμερα (απόσπασμα Πλάνου/Ημερολογίου) */}
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted">Πρόοδος στόχων · σήμερα</h2>
            <Link href="/plan" className="text-xs text-neon-green hover:underline">Πλάνο →</Link>
          </div>
          <div className="space-y-3">
            {goalProgress.map((g) => {
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
        </div>

        {/* Πρόσφατες συνταγές (απόσπασμα Συνταγών) */}
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted">Πρόσφατες συνταγές</h2>
            <Link href="/meals" className="text-xs text-neon-green hover:underline">Όλες →</Link>
          </div>
          {recentMeals.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Καμία συνταγή ακόμα.</p>
          ) : (
            <ul className="space-y-2">
              {recentMeals.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/meals/${m.id}`}
                    className="flex items-center justify-between rounded-xl border border-edge bg-surface-2/50 px-3 py-2.5 transition hover:border-neon-green/40"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{m.name}</div>
                      <div className="text-xs text-muted">
                        {m.meal_type ? MEAL_SLOT_LABELS[m.meal_type] : "Γεύμα"} · {m.items} συστατικά
                      </div>
                    </div>
                    <span className="ml-3 shrink-0 text-sm font-semibold tabular-nums text-neon-green">{m.calories}<span className="text-[10px] text-muted"> kcal</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Σύνοψη βάσης + quick links (απόσπασμα Τροφών) */}
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-medium text-muted">Η βάση μου</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/foods" className="rounded-xl border border-edge bg-surface-2/50 p-3 transition hover:border-neon-cyan/40">
              <div className="text-2xl font-semibold tabular-nums text-neon-cyan">{foodsCount}</div>
              <div className="text-xs text-muted">τροφές</div>
            </Link>
            <Link href="/meals" className="rounded-xl border border-edge bg-surface-2/50 p-3 transition hover:border-neon-violet/40">
              <div className="text-2xl font-semibold tabular-nums" style={{ color: MACRO_NEON.fats }}>{mealsCount}</div>
              <div className="text-xs text-muted">συνταγές</div>
            </Link>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <Link href="/history" className="flex items-center justify-between rounded-xl bg-neon-green px-3 py-2.5 text-sm font-semibold text-[#06281a] transition hover:brightness-110">
              + Καταγραφή γεύματος
              <span>→</span>
            </Link>
            <Link href="/foods" className="flex items-center justify-between rounded-xl border border-edge px-3 py-2.5 text-sm text-muted transition hover:text-foreground">
              + Νέα τροφή
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
