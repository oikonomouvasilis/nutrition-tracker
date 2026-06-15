"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addFood } from "./actions";

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800";

interface LookupResponse {
  name?: string;
  calories_per_100?: number;
  protein_per_100?: number;
  carbs_per_100?: number;
  fats_per_100?: number;
  source?: string;
  confidence?: string;
}

export default function AddFoodForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [unit, setUnit] = useState("g");
  const [looking, setLooking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  async function aiLookup() {
    const q = name.trim();
    if (!q) {
      setInfo("Γράψε πρώτα όνομα ή περιγραφή τροφής.");
      return;
    }
    setLooking(true);
    setInfo("Αναζήτηση…");
    try {
      const res = await fetch("/api/food-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      if (!res.ok) {
        setInfo(
          res.status === 404
            ? "Δεν βρέθηκαν δεδομένα — συμπλήρωσε χειροκίνητα."
            : "Σφάλμα αναζήτησης — δοκίμασε ξανά ή συμπλήρωσε χειροκίνητα.",
        );
        return;
      }
      const d = (await res.json()) as LookupResponse;
      if (d.name) setName(d.name);
      setCalories(String(d.calories_per_100 ?? ""));
      setProtein(String(d.protein_per_100 ?? ""));
      setCarbs(String(d.carbs_per_100 ?? ""));
      setFats(String(d.fats_per_100 ?? ""));
      const src = d.source === "openfoodfacts" ? "Open Food Facts" : "AI";
      const conf = d.confidence ? ` · αξιοπιστία: ${d.confidence}` : "";
      setInfo(`✓ Συμπληρώθηκε από ${src}${conf}. Έλεγξε και αποθήκευσε.`);
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
    await addFood(fd);
    setName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFats("");
    setUnit("g");
    setInfo(null);
    setSaving(false);
    router.refresh();
  }

  return (
    <form
      onSubmit={submit}
      className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Νέα τροφή <span className="text-zinc-400">(ανά 100 g/ml)</span>
      </p>

      <div className="mt-3 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Όνομα ή περιγραφή (π.χ. «σπιτικός μουσακάς»)"
          className={inputCls}
        />
        <button
          type="button"
          onClick={aiLookup}
          disabled={looking}
          title="Δωρεάν αυτόματη εύρεση μακρο (Open Food Facts + AI)"
          className="shrink-0 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {looking ? "🔍…" : "🔍 Εύρεση με AI"}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <input
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          type="number"
          step="any"
          min="0"
          placeholder="Θερμίδες"
          className={inputCls}
        />
        <input
          value={protein}
          onChange={(e) => setProtein(e.target.value)}
          type="number"
          step="any"
          min="0"
          placeholder="Πρωτεΐνη (g)"
          className={inputCls}
        />
        <input
          value={carbs}
          onChange={(e) => setCarbs(e.target.value)}
          type="number"
          step="any"
          min="0"
          placeholder="Υδατάνθρακες (g)"
          className={inputCls}
        />
        <input
          value={fats}
          onChange={(e) => setFats(e.target.value)}
          type="number"
          step="any"
          min="0"
          placeholder="Λιπαρά (g)"
          className={inputCls}
        />
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className={inputCls}
        >
          <option value="g">g</option>
          <option value="ml">ml</option>
        </select>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {saving ? "…" : "Προσθήκη"}
        </button>
      </div>

      {info && <p className="mt-2 text-xs text-zinc-500">{info}</p>}
    </form>
  );
}
