"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  type MacroTotals,
  type MealSlot,
  MEAL_SLOTS,
  MEAL_SLOT_LABELS,
} from "@/types/nutrition";
import { deleteMeal } from "./actions";

export interface RecipeItem {
  name: string;
  unit: string;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}
export interface Recipe {
  id: string;
  name: string;
  meal_type: MealSlot | null;
  description: string | null;
  items: RecipeItem[];
  totals: MacroTotals;
}

const r = (n: number) => Math.round(n);
const PAGE_SIZE = 9;

export default function Cookbook({ recipes }: { recipes: Recipe[] }) {
  const [query, setQuery] = useState("");
  const [slot, setSlot] = useState<MealSlot | "">("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("el");
    return recipes.filter((m) => {
      if (slot && m.meal_type !== slot) return false;
      if (q && !m.name.toLocaleLowerCase("el").includes(q)) return false;
      return true;
    });
  }, [recipes, query, slot]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Αλλαγή φίλτρων -> πίσω στη σελίδα 1.
  function onFilter(fn: () => void) {
    fn();
    setPage(1);
  }

  return (
    <div className="mt-6">
      {/* Φίλτρα */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">🔍</span>
          <input
            value={query}
            onChange={(e) => onFilter(() => setQuery(e.target.value))}
            placeholder="Αναζήτηση συνταγής…"
            className="w-full rounded-xl border border-edge bg-surface-2 py-2 pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-neon-green/60"
          />
        </div>
        <select
          value={slot}
          onChange={(e) => onFilter(() => setSlot(e.target.value as MealSlot | ""))}
          className="rounded-xl border border-edge bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-neon-green/60"
        >
          <option value="">Όλοι οι τύποι</option>
          {MEAL_SLOTS.map((s) => (
            <option key={s} value={s}>{MEAL_SLOT_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* Grid καρτών */}
      {pageItems.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-edge p-10 text-center text-muted">
          {recipes.length === 0
            ? "Δεν υπάρχουν συνταγές ακόμα. Πάτα «+ Νέα συνταγή»."
            : "Καμία συνταγή δεν ταιριάζει στα φίλτρα."}
        </p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pageItems.map((m) => {
            const open = openId === m.id;
            return (
              <article
                key={m.id}
                className={[
                  "card flex flex-col overflow-hidden p-0 transition",
                  open ? "ring-1 ring-neon-green/30" : "hover:-translate-y-0.5",
                ].join(" ")}
              >
                {/* Header (κλικ για άνοιγμα) */}
                <button
                  onClick={() => setOpenId(open ? null : m.id)}
                  className="flex items-start justify-between gap-3 p-4 text-left"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold text-foreground">{m.name}</h3>
                      {m.meal_type && (
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">
                          {MEAL_SLOT_LABELS[m.meal_type]}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs tabular-nums text-muted">
                      Π {r(m.totals.protein)} · Υ {r(m.totals.carbs)} · Λ {r(m.totals.fats)} g · {m.items.length} υλικά
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-lg font-semibold tabular-nums text-neon-green">{r(m.totals.calories)}</div>
                    <div className="text-[10px] text-muted">kcal</div>
                    <span className={`mt-1 inline-block text-muted transition ${open ? "rotate-180" : ""}`}>▾</span>
                  </div>
                </button>

                {/* Expanded: υλικά + σύνολα */}
                {open && (
                  <div className="border-t border-edge px-4 pb-4 pt-3">
                    {m.description && (
                      <p className="mb-3 text-xs text-muted">{m.description}</p>
                    )}
                    {m.items.length === 0 ? (
                      <p className="text-xs text-muted">Χωρίς υλικά.</p>
                    ) : (
                      <ul className="divide-y divide-edge/70">
                        {m.items.map((it, i) => (
                          <li key={i} className="flex items-center justify-between gap-2 py-1.5">
                            <span className="min-w-0 truncate text-sm text-foreground">
                              {it.name}
                              <span className="ml-1 text-xs tabular-nums text-muted">
                                {r(it.quantity)}{it.unit}
                              </span>
                            </span>
                            <span className="shrink-0 text-xs tabular-nums text-muted">
                              {r(it.calories)} kcal
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Σύνολα */}
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {([
                        ["Θερμ.", r(m.totals.calories)],
                        ["Π", r(m.totals.protein)],
                        ["Υ", r(m.totals.carbs)],
                        ["Λ", r(m.totals.fats)],
                      ] as const).map(([lbl, val]) => (
                        <div key={lbl} className="rounded-lg bg-surface-2 py-1.5 text-center">
                          <div className="text-[10px] text-muted">{lbl}</div>
                          <div className="text-sm font-semibold tabular-nums">{val}</div>
                        </div>
                      ))}
                    </div>

                    {/* Ενέργειες */}
                    <div className="mt-3 flex items-center gap-2">
                      <Link
                        href={`/meals/${m.id}`}
                        className="flex-1 rounded-lg border border-edge py-1.5 text-center text-xs font-medium text-muted transition hover:border-neon-green/50 hover:text-foreground"
                      >
                        Επεξεργασία
                      </Link>
                      <form action={deleteMeal}>
                        <input type="hidden" name="id" value={m.id} />
                        <button
                          className="rounded-lg border border-edge px-3 py-1.5 text-xs text-muted transition hover:border-neon-pink/50 hover:text-neon-pink"
                          aria-label={`Διαγραφή ${m.name}`}
                        >
                          Διαγραφή
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Σελιδοποίηση */}
      {pageCount > 1 && (
        <div className="mt-6 flex items-center justify-center gap-1.5">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="rounded-lg border border-edge px-3 py-1.5 text-sm text-muted transition hover:text-foreground disabled:opacity-40"
          >
            ←
          </button>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={[
                "min-w-9 rounded-lg px-3 py-1.5 text-sm font-medium transition",
                p === safePage ? "bg-surface-2 text-neon-green" : "border border-edge text-muted hover:text-foreground",
              ].join(" ")}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={safePage === pageCount}
            className="rounded-lg border border-edge px-3 py-1.5 text-sm text-muted transition hover:text-foreground disabled:opacity-40"
          >
            →
          </button>
        </div>
      )}

      <p className="mt-3 text-center text-xs text-muted">
        {filtered.length} {filtered.length === 1 ? "συνταγή" : "συνταγές"}
        {(query || slot) && ` από ${recipes.length}`}
      </p>
    </div>
  );
}
