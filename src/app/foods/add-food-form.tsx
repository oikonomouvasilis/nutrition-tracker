"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addFood } from "./actions";
import {
  NUTRIENTS,
  NUTRIENT_BY_KEY,
  GROUP_LABELS,
  type NutrientGroup,
} from "@/lib/nutrients";

const inputCls =
  "w-full rounded-lg border border-edge bg-surface-2 px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-neon-green/60";

interface Candidate {
  name: string;
  brand?: string;
  calories_per_100: number;
  protein_per_100: number;
  carbs_per_100: number;
  fats_per_100: number;
  fiber_per_100?: number;
  sugar_per_100?: number;
  sodium_per_100?: number;
  micronutrients?: Record<string, number>;
  source: "openfoodfacts" | "ai";
  confidence?: "high" | "medium" | "low";
  url?: string;
}

interface LookupResponse {
  candidates: Candidate[];
  searchLinks: { label: string; url: string }[];
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const GROUPS: NutrientGroup[] = ["extended", "vitamin", "mineral"];

export default function AddFoodForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [unit, setUnit] = useState("g");
  // προαιρετικά θρεπτικά: key -> τιμή (string)
  const [extras, setExtras] = useState<Record<string, string>>({});

  const [looking, setLooking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [links, setLinks] = useState<{ label: string; url: string }[]>([]);

  function reset() {
    setName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFats("");
    setUnit("g");
    setExtras({});
    setInfo(null);
    setCandidates(null);
    setLinks([]);
  }

  function toggleExtra(key: string) {
    setExtras((e) => {
      if (key in e) {
        const next = { ...e };
        delete next[key];
        return next;
      }
      return { ...e, [key]: "" };
    });
  }
  function setExtra(key: string, value: string) {
    setExtras((e) => ({ ...e, [key]: value }));
  }
  function removeExtra(key: string) {
    setExtras((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
  }

  function applyCandidate(c: Candidate) {
    setName(c.brand ? `${c.brand} ${c.name}` : c.name);
    setCalories(String(c.calories_per_100));
    setProtein(String(c.protein_per_100));
    setCarbs(String(c.carbs_per_100));
    setFats(String(c.fats_per_100));
    const next: Record<string, string> = {};
    if (c.fiber_per_100 != null) next.fiber = String(c.fiber_per_100);
    if (c.sugar_per_100 != null) next.sugar = String(c.sugar_per_100);
    if (c.sodium_per_100 != null) next.sodium = String(c.sodium_per_100);
    for (const [k, v] of Object.entries(c.micronutrients ?? {})) {
      if (k in NUTRIENT_BY_KEY) next[k] = String(v);
    }
    setExtras(next);
    setCandidates(null);
    setInfo("✓ Συμπληρώθηκε. Έλεγξε τα στοιχεία και αποθήκευσε.");
  }

  async function aiLookup() {
    const q = name.trim();
    if (!q) {
      setInfo("Γράψε πρώτα όνομα ή περιγραφή τροφής.");
      return;
    }
    setLooking(true);
    setCandidates(null);
    setInfo("Αναζήτηση σε Open Food Facts & web…");
    try {
      const res = await fetch("/api/food-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      if (!res.ok) {
        setInfo("Σφάλμα αναζήτησης — δοκίμασε ξανά ή συμπλήρωσε χειροκίνητα.");
        return;
      }
      const d = (await res.json()) as LookupResponse;
      setLinks(d.searchLinks ?? []);
      setCandidates(d.candidates ?? []);
      setInfo(
        d.candidates?.length
          ? `Βρέθηκαν ${d.candidates.length} επιλογές — διάλεξε ή έλεγξε τους συνδέσμους.`
          : "Δεν βρέθηκαν αυτόματες επιλογές — δες τους συνδέσμους ή συμπλήρωσε χειροκίνητα.",
      );
    } catch {
      setInfo("Σφάλμα δικτύου.");
    } finally {
      setLooking(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || calories === "") {
      setInfo("Όνομα και θερμίδες είναι υποχρεωτικά.");
      return;
    }
    setSaving(true);
    const fd = new FormData();
    fd.set("name", name.trim());
    fd.set("calories", calories || "0");
    fd.set("protein", protein || "0");
    fd.set("carbs", carbs || "0");
    fd.set("fats", fats || "0");
    fd.set("unit", unit);

    // στήλες fiber/sugar/sodium + micronutrients json
    const micros: Record<string, number> = {};
    for (const [key, val] of Object.entries(extras)) {
      const def = NUTRIENT_BY_KEY[key];
      if (!def || val.trim() === "") continue;
      const n = Number(val);
      if (!Number.isFinite(n) || n < 0) continue;
      if (def.storage === "column") fd.set(def.key, String(n));
      else micros[key] = n;
    }
    fd.set("micronutrients", JSON.stringify(micros));

    await addFood(fd);
    reset();
    setSaving(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-6 flex items-center gap-2 rounded-xl bg-neon-green px-4 py-2.5 text-sm font-semibold text-[#06281a] transition hover:brightness-110"
      >
        <span className="text-base leading-none">+</span> Νέα τροφή
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card mt-6 p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          Νέα τροφή <span className="text-muted">(ανά 100 g/ml)</span>
        </p>
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="text-muted transition hover:text-foreground"
          aria-label="Κλείσιμο"
        >
          ✕
        </button>
      </div>

      {/* Όνομα + AI */}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Όνομα ή περιγραφή (π.χ. «μπασμάτι ρύζι» ή brand)"
          className={inputCls}
        />
        <button
          type="button"
          onClick={aiLookup}
          disabled={looking}
          title="Αναζήτηση σε Open Food Facts + όλο το web (AI)"
          className="shrink-0 rounded-lg border border-neon-cyan/40 px-3 py-2 text-sm font-medium text-neon-cyan transition hover:bg-neon-cyan/10 disabled:opacity-50"
        >
          {looking ? "🔍…" : "🔍 Εύρεση με AI"}
        </button>
      </div>

      {/* AI candidates */}
      {candidates && (
        <div className="mt-3 space-y-2">
          {candidates.map((c, i) => {
            const extraCount =
              (c.fiber_per_100 != null ? 1 : 0) +
              (c.sugar_per_100 != null ? 1 : 0) +
              (c.sodium_per_100 != null ? 1 : 0) +
              Object.keys(c.micronutrients ?? {}).length;
            return (
              <div
                key={i}
                className="rounded-xl border border-edge bg-surface-2/60 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {c.brand ? `${c.brand} · ` : ""}{c.name}
                      </span>
                      <span
                        className={[
                          "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                          c.source === "openfoodfacts"
                            ? "bg-neon-cyan/15 text-neon-cyan"
                            : "bg-neon-violet/15 text-neon-violet",
                        ].join(" ")}
                      >
                        {c.source === "openfoodfacts" ? "Open Food Facts" : `AI${c.confidence ? ` · ${c.confidence}` : ""}`}
                      </span>
                    </div>
                    <div className="mt-1 text-xs tabular-nums text-muted">
                      {r1(c.calories_per_100)} kcal · Π {r1(c.protein_per_100)} · Υ {r1(c.carbs_per_100)} · Λ {r1(c.fats_per_100)} g
                      {extraCount > 0 && (
                        <span className="ml-1 text-neon-green">· +{extraCount} θρεπτικά</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <button
                      type="button"
                      onClick={() => applyCandidate(c)}
                      className="rounded-lg bg-neon-green px-3 py-1 text-xs font-semibold text-[#06281a] transition hover:brightness-110"
                    >
                      Χρήση
                    </button>
                    {c.url && (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-neon-cyan hover:underline"
                      >
                        Άνοιγμα πηγής ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Web search links */}
      {links.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span>Έλεγξε στο web:</span>
          {links.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neon-cyan hover:underline"
            >
              {l.label} ↗
            </a>
          ))}
        </div>
      )}

      {/* Υποχρεωτικά μακρο */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <input value={calories} onChange={(e) => setCalories(e.target.value)} type="number" step="any" min="0" placeholder="Θερμίδες *" className={inputCls} />
        <input value={protein} onChange={(e) => setProtein(e.target.value)} type="number" step="any" min="0" placeholder="Πρωτεΐνη (g)" className={inputCls} />
        <input value={carbs} onChange={(e) => setCarbs(e.target.value)} type="number" step="any" min="0" placeholder="Υδατάνθρακες (g)" className={inputCls} />
        <input value={fats} onChange={(e) => setFats(e.target.value)} type="number" step="any" min="0" placeholder="Λιπαρά (g)" className={inputCls} />
        <select value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls}>
          <option value="g">g</option>
          <option value="ml">ml</option>
        </select>
      </div>

      {/* Προαιρετικά θρεπτικά (βιταμίνες/μέταλλα) */}
      <div className="mt-4 border-t border-edge pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted">
            Επιπλέον θρεπτικά <span className="text-muted/70">(προαιρετικά)</span>
          </span>
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-edge bg-surface-2 px-3 py-1.5 text-xs text-foreground transition hover:border-neon-green/50 [&::-webkit-details-marker]:hidden">
              + Επιλογή θρεπτικών
              {Object.keys(extras).length > 0 && (
                <span className="rounded-full bg-neon-green/15 px-1.5 text-neon-green">
                  {Object.keys(extras).length}
                </span>
              )}
              <span className="text-muted transition group-open:rotate-180">▾</span>
            </summary>
            <div className="absolute right-0 z-20 mt-2 max-h-72 w-64 overflow-y-auto rounded-xl border border-edge bg-surface p-2 shadow-xl">
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
                        checked={n.key in extras}
                        onChange={() => toggleExtra(n.key)}
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

        {Object.keys(extras).length > 0 && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {NUTRIENTS.filter((n) => n.key in extras).map((n) => (
              <div key={n.key} className="flex items-center gap-2">
                <label className="flex-1 text-xs text-muted">{n.label}</label>
                <div className="relative">
                  <input
                    value={extras[n.key]}
                    onChange={(e) => setExtra(n.key, e.target.value)}
                    type="number"
                    step="any"
                    min="0"
                    className={`${inputCls} w-28 pr-9`}
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted">
                    {n.unit}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeExtra(n.key)}
                  className="text-muted transition hover:text-neon-pink"
                  aria-label={`Αφαίρεση ${n.label}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-neon-green px-5 py-2 text-sm font-semibold text-[#06281a] transition hover:brightness-110 disabled:opacity-50"
        >
          {saving ? "…" : "Προσθήκη"}
        </button>
        {info && <p className="text-xs text-muted">{info}</p>}
      </div>
    </form>
  );
}
