"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Goals } from "@/lib/goals";
import { saveGoals } from "./actions";

const FIELDS = [
  { key: "calories", label: "Θερμίδες", unit: "kcal", color: "#2dff95" },
  { key: "protein", label: "Πρωτεΐνη", unit: "g", color: "#29d6f5" },
  { key: "carbs", label: "Υδατάνθρακες", unit: "g", color: "#ffc34d" },
  { key: "fats", label: "Λιπαρά", unit: "g", color: "#ff5c8a" },
] as const;

const inputCls =
  "w-28 rounded-lg border border-edge bg-surface-2 px-3 py-2 text-right text-sm text-foreground outline-none transition focus:border-neon-green/60";

export default function GoalsForm({ initial }: { initial: Goals }) {
  const router = useRouter();
  const [vals, setVals] = useState<Record<string, string>>({
    calories: String(initial.calories),
    protein: String(initial.protein),
    carbs: String(initial.carbs),
    fats: String(initial.fats),
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const macroKcal = useMemo(() => {
    const p = Number(vals.protein) || 0;
    const c = Number(vals.carbs) || 0;
    const f = Number(vals.fats) || 0;
    return p * 4 + c * 4 + f * 9;
  }, [vals]);

  const target = Number(vals.calories) || 0;
  const diff = macroKcal - target;
  const off = target > 0 && Math.abs(diff) / target > 0.1;

  function set(key: string, v: string) {
    setVals((s) => ({ ...s, [key]: v }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    const fd = new FormData();
    for (const f of FIELDS) fd.set(f.key, vals[f.key] || "0");
    await saveGoals(fd);
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="card mt-6 p-5">
      <h2 className="text-sm font-medium text-muted">Ημερήσιοι στόχοι</h2>

      <div className="mt-4 space-y-3">
        {FIELDS.map((f) => (
          <div key={f.key} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm text-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: f.color, boxShadow: `0 0 8px ${f.color}` }} />
              {f.label}
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="any"
                value={vals[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                className={inputCls}
              />
              <span className="w-8 text-xs text-muted">{f.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Ισοζύγιο θερμίδων από μακρο */}
      <div className="mt-4 rounded-xl border border-edge bg-surface-2/50 p-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted">Θερμίδες από μακρο</span>
          <span className="tabular-nums text-foreground">{Math.round(macroKcal)} kcal</span>
        </div>
        <p className={`mt-1 text-xs ${off ? "text-neon-amber" : "text-muted"}`}>
          {off
            ? `Διαφορά ${diff > 0 ? "+" : ""}${Math.round(diff)} kcal από τον στόχο θερμίδων — ίσως θες να εναρμονίσεις τις τιμές.`
            : "Τα μακρο είναι σε αρμονία με τον στόχο θερμίδων."}
        </p>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-neon-green px-5 py-2 text-sm font-semibold text-[#06281a] transition hover:brightness-110 disabled:opacity-50"
        >
          {saving ? "Αποθήκευση…" : "Αποθήκευση στόχων"}
        </button>
        {saved && <span className="text-xs text-neon-green">✓ Αποθηκεύτηκαν</span>}
      </div>
    </div>
  );
}
