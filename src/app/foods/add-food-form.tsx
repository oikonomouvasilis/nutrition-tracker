"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addFood } from "./actions";
import { NUTRIENT_BY_KEY } from "@/lib/nutrients";
import FoodFields, {
  type FoodFieldsValue,
  EMPTY_FOOD_FIELDS,
  appendFoodFields,
} from "./food-fields";

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

/** Απλός έλεγχος: μοιάζει με http(s) URL; */
function looksLikeUrl(s: string): boolean {
  return /^https?:\/\/\S+$/i.test(s.trim());
}

export default function AddFoodForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  const [fields, setFields] = useState<FoodFieldsValue>(EMPTY_FOOD_FIELDS);

  const [looking, setLooking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [links, setLinks] = useState<{ label: string; url: string }[]>([]);

  const isUrl = looksLikeUrl(name);

  function patch(p: Partial<FoodFieldsValue>) {
    setFields((f) => ({ ...f, ...p }));
  }

  function reset() {
    setName("");
    setFields(EMPTY_FOOD_FIELDS);
    setInfo(null);
    setCandidates(null);
    setLinks([]);
  }

  function applyCandidate(c: Candidate) {
    setName(c.brand ? `${c.brand} ${c.name}` : c.name);
    const extras: Record<string, string> = {};
    if (c.fiber_per_100 != null) extras.fiber = String(c.fiber_per_100);
    if (c.sugar_per_100 != null) extras.sugar = String(c.sugar_per_100);
    if (c.sodium_per_100 != null) extras.sodium = String(c.sodium_per_100);
    for (const [k, v] of Object.entries(c.micronutrients ?? {})) {
      if (k in NUTRIENT_BY_KEY) extras[k] = String(v);
    }
    setFields((prev) => ({
      ...prev,
      calories: String(c.calories_per_100),
      protein: String(c.protein_per_100),
      carbs: String(c.carbs_per_100),
      fats: String(c.fats_per_100),
      extras,
    }));
    setCandidates(null);
    setInfo("✓ Συμπληρώθηκε. Έλεγξε τα στοιχεία και αποθήκευσε.");
  }

  async function aiLookup() {
    const q = name.trim();
    if (!q) {
      setInfo("Γράψε πρώτα όνομα, περιγραφή ή σύνδεσμο τροφής.");
      return;
    }
    setLooking(true);
    setCandidates(null);
    setInfo(
      isUrl
        ? "Διαβάζω τη σελίδα…"
        : "Αναζήτηση σε Open Food Facts & web…",
    );
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
          : isUrl
            ? "Δεν βρέθηκαν θρεπτικά στη σελίδα — δοκίμασε άλλον σύνδεσμο ή συμπλήρωσε χειροκίνητα."
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
    if (!name.trim() || fields.calories === "") {
      setInfo("Όνομα και θερμίδες είναι υποχρεωτικά.");
      return;
    }
    setSaving(true);
    const fd = new FormData();
    fd.set("name", name.trim());
    appendFoodFields(fd, fields);

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

      {/* Όνομα / σύνδεσμος + AI */}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Όνομα, περιγραφή ή σύνδεσμος (URL)"
          className={inputCls}
        />
        <button
          type="button"
          onClick={aiLookup}
          disabled={looking}
          title={
            isUrl
              ? "Διάβασε θρεπτικά απευθείας από τη σελίδα"
              : "Αναζήτηση σε Open Food Facts + όλο το web (AI)"
          }
          className="shrink-0 rounded-lg border border-neon-cyan/40 px-3 py-2 text-sm font-medium text-neon-cyan transition hover:bg-neon-cyan/10 disabled:opacity-50"
        >
          {looking ? "…" : isUrl ? "🔗 Διάβασε σύνδεσμο" : "🔍 Εύρεση με AI"}
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

      {/* Μακρο + προαιρετικά θρεπτικά */}
      <div className="mt-4">
        <FoodFields value={fields} onChange={patch} />
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
