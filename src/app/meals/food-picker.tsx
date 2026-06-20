"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Food } from "@/types/nutrition";

const fmt = (n: number) =>
  Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);

interface Props {
  foods: Food[];
  onSelect: (food: Food) => void;
  onClose: () => void;
  title?: string;
}

/** Αναζητήσιμο popup επιλογής τροφής (για τα υλικά συνταγής). */
export default function FoodPicker({
  foods,
  onSelect,
  onClose,
  title = "Επιλογή τροφής",
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
      ? foods.filter((f) => f.name.toLocaleLowerCase("el").includes(q))
      : foods;
    return list.slice(0, 50);
  }, [foods, query]);

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
              placeholder="Αναζήτηση τροφής…"
              className="w-full rounded-xl border border-edge bg-surface-2 py-2 pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-neon-green/60"
            />
          </div>
        </div>

        {/* Λίστα */}
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {rows.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-muted">
              {foods.length === 0
                ? "Δεν υπάρχουν τροφές."
                : "Καμία τροφή δεν ταιριάζει."}
            </p>
          ) : (
            <ul className="space-y-1">
              {rows.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(f);
                      onClose();
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-white/5"
                  >
                    <span className="min-w-0 truncate text-sm text-foreground">
                      {f.name}
                      <span className="ml-1 text-xs text-muted">/{f.unit}</span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted">
                      <span className="text-neon-green">
                        {fmt(f.calories_per_100)}
                      </span>{" "}
                      kcal · {fmt(f.protein_per_100)}/{fmt(f.carbs_per_100)}/
                      {fmt(f.fats_per_100)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
