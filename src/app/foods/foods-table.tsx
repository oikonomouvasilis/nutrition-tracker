"use client";

import { useMemo, useState } from "react";
import type { Food } from "@/types/nutrition";
import {
  NUTRIENTS,
  GROUP_LABELS,
  nutrientValue,
  type NutrientGroup,
} from "@/lib/nutrients";
import { deleteFood } from "./actions";

const GROUPS: NutrientGroup[] = ["extended", "vitamin", "mineral"];

type SortKey =
  | "name-asc"
  | "name-desc"
  | "calories-desc"
  | "calories-asc"
  | "protein-desc"
  | "carbs-desc"
  | "fats-desc";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "name-asc", label: "Όνομα (Α→Ω)" },
  { key: "name-desc", label: "Όνομα (Ω→Α)" },
  { key: "calories-desc", label: "Θερμίδες (υψηλές)" },
  { key: "calories-asc", label: "Θερμίδες (χαμηλές)" },
  { key: "protein-desc", label: "Πρωτεΐνη (υψηλή)" },
  { key: "carbs-desc", label: "Υδατάνθρακες (υψηλοί)" },
  { key: "fats-desc", label: "Λιπαρά (υψηλά)" },
];

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));

export default function FoodsTable({ foods }: { foods: Food[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("name-asc");
  const [cols, setCols] = useState<string[]>([]);

  function toggleCol(key: string) {
    setCols((c) => (c.includes(key) ? c.filter((k) => k !== key) : [...c, key]));
  }

  const activeCols = useMemo(
    () => NUTRIENTS.filter((n) => cols.includes(n.key)),
    [cols],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("el");
    const filtered = q
      ? foods.filter((f) => f.name.toLocaleLowerCase("el").includes(q))
      : foods.slice();

    filtered.sort((a, b) => {
      switch (sort) {
        case "name-desc":
          return b.name.localeCompare(a.name, "el");
        case "calories-desc":
          return b.calories_per_100 - a.calories_per_100;
        case "calories-asc":
          return a.calories_per_100 - b.calories_per_100;
        case "protein-desc":
          return b.protein_per_100 - a.protein_per_100;
        case "carbs-desc":
          return b.carbs_per_100 - a.carbs_per_100;
        case "fats-desc":
          return b.fats_per_100 - a.fats_per_100;
        default:
          return a.name.localeCompare(b.name, "el");
      }
    });
    return filtered;
  }, [foods, query, sort]);

  const th = "px-3 py-2.5 text-right font-medium text-muted whitespace-nowrap";
  const td = "px-3 py-2.5 text-right tabular-nums";

  return (
    <div className="mt-6">
      {/* Toolbar: αναζήτηση + ταξινόμηση + στήλες */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Αναζήτηση τροφής…"
            className="w-full rounded-xl border border-edge bg-surface-2 py-2 pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-neon-green/60"
          />
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-xl border border-edge bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-neon-green/60"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>

        {/* Δυναμικές στήλες */}
        <details className="group relative">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-xl border border-edge bg-surface-2 px-3 py-2 text-sm text-foreground transition hover:border-neon-green/50 [&::-webkit-details-marker]:hidden">
            Στήλες
            {cols.length > 0 && (
              <span className="rounded-full bg-neon-green/15 px-1.5 text-xs text-neon-green">{cols.length}</span>
            )}
            <span className="text-muted transition group-open:rotate-180">▾</span>
          </summary>
          <div className="absolute right-0 z-20 mt-2 max-h-80 w-64 overflow-y-auto rounded-xl border border-edge bg-surface p-2 shadow-xl">
            {GROUPS.map((g) => (
              <div key={g} className="mb-1">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  {GROUP_LABELS[g]}
                </div>
                {NUTRIENTS.filter((n) => n.group === g).map((n) => (
                  <label
                    key={n.key}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={cols.includes(n.key)}
                      onChange={() => toggleCol(n.key)}
                      className="accent-[var(--color-neon-green)]"
                    />
                    <span className="flex-1">{n.label}</span>
                    <span className="text-[10px] text-muted">{n.unit}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </details>
      </div>

      {/* Πίνακας */}
      <div className="shadow-soft mt-3 overflow-x-auto rounded-2xl border border-edge bg-surface/30">
        <table className="w-full text-sm">
          <thead className="bg-surface-2/60 text-left">
            <tr>
              <th className="px-4 py-2.5 font-medium text-muted">Τροφή</th>
              <th className={th}>Θερμ.</th>
              <th className={th}>Π</th>
              <th className={th}>Υ</th>
              <th className={th}>Λ</th>
              {activeCols.map((n) => (
                <th key={n.key} className={th} title={`${n.label} (${n.unit})`}>
                  {n.short}
                </th>
              ))}
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-edge/60">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6 + activeCols.length} className="px-4 py-10 text-center text-muted">
                  {foods.length === 0
                    ? "Δεν υπάρχουν τροφές ακόμα. Πρόσθεσε μία ή κάνε «Εισαγωγή starter τροφών»."
                    : "Καμία τροφή δεν ταιριάζει στην αναζήτηση."}
                </td>
              </tr>
            ) : (
              rows.map((f) => (
                <tr key={f.id} className="transition hover:bg-white/[0.03]">
                  <td className="px-4 py-2.5 text-foreground">
                    {f.name}
                    <span className="ml-1 text-xs text-muted">/{f.unit}</span>
                    {f.source === "ai" && (
                      <span className="ml-1.5 rounded-full bg-neon-violet/15 px-1.5 text-[10px] text-neon-violet">AI</span>
                    )}
                  </td>
                  <td className={`${td} text-neon-green`}>{fmt(f.calories_per_100)}</td>
                  <td className={td}>{fmt(f.protein_per_100)}</td>
                  <td className={td}>{fmt(f.carbs_per_100)}</td>
                  <td className={td}>{fmt(f.fats_per_100)}</td>
                  {activeCols.map((n) => {
                    const v = nutrientValue(f, n);
                    return (
                      <td key={n.key} className={`${td} ${v == null ? "text-muted/40" : ""}`}>
                        {v == null ? "—" : fmt(v)}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-right">
                    <form action={deleteFood}>
                      <input type="hidden" name="id" value={f.id} />
                      <button
                        className="text-muted transition hover:text-neon-pink"
                        aria-label={`Διαγραφή ${f.name}`}
                      >
                        ✕
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs text-muted">
        {rows.length} {rows.length === 1 ? "τροφή" : "τροφές"}
        {query && ` από ${foods.length}`}
      </p>
    </div>
  );
}
