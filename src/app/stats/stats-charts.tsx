"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MACRO_NEON, MacroDonut } from "../_components/dashboard-charts";
import {
  GROUP_LABELS,
  NUTRIENT_BY_KEY,
  type NutrientDef,
  type NutrientGroup,
} from "@/lib/nutrients";

export interface DailyPoint {
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  // δυναμικά κλειδιά επιπλέον θρεπτικών (fiber/sugar/sodium/μικροθρεπτικά)
  [key: string]: number | string;
}

const tooltipStyle = {
  background: "rgba(18,20,29,0.95)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  fontSize: 12,
  color: "#e8eaf2",
};

const axis = { fontSize: 11, tickLine: false, axisLine: false, stroke: "#8b90a6" } as const;

interface Metric {
  key: string;
  label: string;
  color: string;
  unit: string;
  goal: boolean;
}

const BASE_METRICS: Metric[] = [
  { key: "calories", label: "Θερμίδες", color: MACRO_NEON.calories, unit: "kcal", goal: true },
  { key: "protein", label: "Πρωτεΐνη", color: MACRO_NEON.protein, unit: "g", goal: false },
  { key: "carbs", label: "Υδατάνθρακες", color: MACRO_NEON.carbs, unit: "g", goal: false },
  { key: "fats", label: "Λιπαρά", color: MACRO_NEON.fats, unit: "g", goal: false },
];

// Χρώμα ανά ομάδα για τα επιπλέον θρεπτικά (όταν επιλεγούν ως μετρική).
const EXTRA_COLOR: Record<NutrientGroup, string> = {
  extended: "#a98bff",
  vitamin: "#ff8ad1",
  mineral: "#5fe3c0",
};
const GROUP_ORDER: NutrientGroup[] = ["extended", "vitamin", "mineral"];

/** Ημερήσιο γράφημα με εναλλαγή μετρικής + επιλογή επιπλέον θρεπτικών. */
export function DailyMetricChart({
  daily,
  goalCalories,
  availableNutrientKeys = [],
}: {
  daily: DailyPoint[];
  goalCalories: number;
  availableNutrientKeys?: string[];
}) {
  const [metric, setMetric] = useState<string>("calories");
  const [selectedExtras, setSelectedExtras] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false);

  // NutrientDefs για όσα θρεπτικά υπάρχουν στα δεδομένα του διαστήματος.
  const extraDefs = useMemo(
    () =>
      availableNutrientKeys
        .map((k) => NUTRIENT_BY_KEY[k])
        .filter((d): d is NutrientDef => Boolean(d)),
    [availableNutrientKeys],
  );

  const activeMetrics: Metric[] = [
    ...BASE_METRICS,
    ...[...selectedExtras]
      .map((k): Metric | null => {
        const def = NUTRIENT_BY_KEY[k];
        return def
          ? { key: def.key, label: def.label, color: EXTRA_COLOR[def.group], unit: def.unit, goal: false }
          : null;
      })
      .filter((mm): mm is Metric => mm !== null),
  ];

  const m = activeMetrics.find((x) => x.key === metric) ?? BASE_METRICS[0];

  function toggleExtra(key: string) {
    setSelectedExtras((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        if (metric === key) setMetric("calories");
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const groups = useMemo(
    () =>
      GROUP_ORDER.map((g) => ({
        group: g,
        items: extraDefs.filter((d) => d.group === g),
      })).filter((x) => x.items.length > 0),
    [extraDefs],
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {activeMetrics.map((x) => {
          const active = x.key === m.key;
          return (
            <button
              key={x.key}
              onClick={() => setMetric(x.key)}
              className={[
                "rounded-lg px-2.5 py-1 text-xs font-medium transition",
                active ? "text-[#06281a]" : "border border-edge text-muted hover:text-foreground",
              ].join(" ")}
              style={active ? { background: x.color, boxShadow: `0 0 12px -2px ${x.color}` } : undefined}
            >
              {x.label}
            </button>
          );
        })}

        {extraDefs.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className={[
                "rounded-lg border px-2.5 py-1 text-xs font-medium transition",
                menuOpen ? "border-neon-green/60 text-foreground" : "border-edge text-muted hover:text-foreground",
              ].join(" ")}
            >
              + Άλλα{selectedExtras.size > 0 ? ` (${selectedExtras.size})` : ""}
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute left-0 top-full z-20 mt-1 max-h-72 w-60 overflow-y-auto rounded-xl border border-edge bg-surface/95 p-2 shadow-xl backdrop-blur-md">
                  {groups.map(({ group, items }) => (
                    <div key={group} className="mb-1.5 last:mb-0">
                      <div className="px-1 py-1 text-[10px] font-medium uppercase tracking-wide text-muted">
                        {GROUP_LABELS[group]}
                      </div>
                      {items.map((d) => (
                        <label
                          key={d.key}
                          className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-xs text-foreground transition hover:bg-white/5"
                        >
                          <input
                            type="checkbox"
                            checked={selectedExtras.has(d.key)}
                            onChange={() => toggleExtra(d.key)}
                            className="accent-neon-green"
                          />
                          <span className="flex-1 truncate">{d.label}</span>
                          <span className="text-muted">{d.unit}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={daily} margin={{ top: 8, right: 4, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="metricBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={m.color} stopOpacity={0.95} />
              <stop offset="100%" stopColor={m.color} stopOpacity={0.2} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={20} />
          <YAxis {...axis} width={44} />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            formatter={(v) => [`${v} ${m.unit}`, m.label]}
          />
          {m.goal && goalCalories > 0 && (
            <ReferenceLine
              y={goalCalories}
              stroke="#a98bff"
              strokeDasharray="4 4"
              strokeOpacity={0.6}
              label={{ value: `στόχος ${goalCalories}`, position: "insideTopRight", fill: "#8b90a6", fontSize: 10 }}
            />
          )}
          <Bar dataKey={m.key} fill="url(#metricBar)" radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Στοιβαγμένη τάση μακρο (g) στον χρόνο. */
export function MacroTrend({ daily }: { daily: DailyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={daily} margin={{ top: 8, right: 4, bottom: 0, left: -16 }}>
        <defs>
          {(["protein", "carbs", "fats"] as const).map((k) => (
            <linearGradient key={k} id={`area-${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={MACRO_NEON[k]} stopOpacity={0.5} />
              <stop offset="100%" stopColor={MACRO_NEON[k]} stopOpacity={0.04} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={20} />
        <YAxis {...axis} width={44} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [`${v} g`, String(n)]} />
        <Area type="monotone" dataKey="protein" name="Πρωτεΐνη" stackId="1" stroke={MACRO_NEON.protein} fill="url(#area-protein)" strokeWidth={1.5} />
        <Area type="monotone" dataKey="carbs" name="Υδατάνθρακες" stackId="1" stroke={MACRO_NEON.carbs} fill="url(#area-carbs)" strokeWidth={1.5} />
        <Area type="monotone" dataKey="fats" name="Λιπαρά" stackId="1" stroke={MACRO_NEON.fats} fill="url(#area-fats)" strokeWidth={1.5} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Θερμίδες ανά γεύμα/slot. */
export function SlotBars({ data }: { data: { label: string; calories: number }[] }) {
  const has = data.some((d) => d.calories > 0);
  if (!has) {
    return <div className="grid h-[240px] place-items-center text-sm text-muted">Δεν υπάρχουν δεδομένα.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id="slotBar" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={MACRO_NEON.calories} stopOpacity={0.35} />
            <stop offset="100%" stopColor={MACRO_NEON.calories} stopOpacity={0.95} />
          </linearGradient>
        </defs>
        <XAxis type="number" {...axis} />
        <YAxis type="category" dataKey="label" {...axis} width={90} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} formatter={(v) => [`${v} kcal`, "Θερμίδες"]} />
        <Bar dataKey="calories" fill="url(#slotBar)" radius={[0, 5, 5, 0]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export { MacroDonut };
