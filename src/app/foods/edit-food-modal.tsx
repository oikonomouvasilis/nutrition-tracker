"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Food } from "@/types/nutrition";
import { updateFood } from "./actions";
import FoodFields, {
  type FoodFieldsValue,
  foodToExtras,
  appendFoodFields,
} from "./food-fields";

const inputCls =
  "w-full rounded-lg border border-edge bg-surface-2 px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-neon-green/60";

function foodToFields(food: Food): FoodFieldsValue {
  return {
    calories: String(food.calories_per_100),
    protein: String(food.protein_per_100),
    carbs: String(food.carbs_per_100),
    fats: String(food.fats_per_100),
    unit: food.unit,
    extras: foodToExtras(food),
  };
}

interface Props {
  food: Food;
  onClose: () => void;
}

export default function EditFoodModal({ food, onClose }: Props) {
  const router = useRouter();
  const [name, setName] = useState(food.name);
  const [fields, setFields] = useState<FoodFieldsValue>(() => foodToFields(food));
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  // Esc για κλείσιμο
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function patch(p: Partial<FoodFieldsValue>) {
    setFields((f) => ({ ...f, ...p }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || fields.calories === "") {
      setInfo("Όνομα και θερμίδες είναι υποχρεωτικά.");
      return;
    }
    setSaving(true);
    const fd = new FormData();
    fd.set("id", food.id);
    fd.set("name", name.trim());
    appendFoodFields(fd, fields);

    await updateFood(fd);
    setSaving(false);
    onClose();
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="card my-auto w-full max-w-lg p-4 sm:p-5"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">
            Επεξεργασία τροφής <span className="text-muted">(ανά 100 g/ml)</span>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-muted transition hover:text-foreground"
            aria-label="Κλείσιμο"
          >
            ✕
          </button>
        </div>

        {/* Όνομα */}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Όνομα τροφής"
          className={`${inputCls} mt-3`}
        />

        {/* Μακρο + προαιρετικά θρεπτικά */}
        <div className="mt-4">
          <FoodFields value={fields} onChange={patch} />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-neon-green px-5 py-2 text-sm font-semibold text-[#06281a] transition hover:brightness-110 disabled:opacity-50"
          >
            {saving ? "…" : "Αποθήκευση"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-edge px-5 py-2 text-sm font-medium text-muted transition hover:text-foreground"
          >
            Άκυρο
          </button>
          {info && <p className="text-xs text-muted">{info}</p>}
        </div>
      </form>
    </div>
  );
}
