"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { macrosForQuantity } from "@/types/nutrition";
import type { MealOption } from "./log-adder";

const r = (n: number) => Math.round(n);

interface Props {
  meals: MealOption[];
  onSelect: (meal: MealOption) => void;
  onClose: () => void;
  title?: string;
}

/** Αναζητήσιμο popup επιλογής συνταγής (ίδιο στυλ με το FoodPicker). */
export default function MealPicker({
  meals,
  onSelect,
  onClose,
  title = "Επιλογή συνταγής",
}: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("el");
    const list = q
      ? meals.filter((m) => m.name.toLocaleLowerCase("el").includes(q))
      : meals;
    return list.slice(0, 50);
  }, [meals, query]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="card my-auto flex max-h-[80vh] w-full max-w-md flex-col p-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Κεφαλίδα + αναζήτηση */}
        <div className="border-b border-edge p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">{title}</p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Κλείσιμο"
              className="text-muted transition hover:text-foreground"
            >
              ✕
            </button>
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              🔍
            </span>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Αναζήτηση συνταγής…"
              className="w-full rounded-xl border border-edge bg-surface-2 py-2 pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-neon-green/60"
            />
          </div>
        </div>

        {/* Λίστα */}
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {rows.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-muted">
              {meals.length === 0
                ? "Δεν υπάρχουν συνταγές."
                : "Καμία συνταγή δεν ταιριάζει."}
            </p>
          ) : (
            <ul className="space-y-1">
              {rows.map((m) => {
                const kcal = m.items.reduce(
                  (s, it) => s + macrosForQuantity(it.per100, it.quantity || 0).calories,
                  0,
                );
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(m);
                        onClose();
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-white/5"
                    >
                      <span className="min-w-0 truncate text-sm text-foreground">
                        {m.name}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-muted">
                        <span className="text-neon-green">{r(kcal)}</span> kcal ·{" "}
                        {m.items.length} υλικά
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
