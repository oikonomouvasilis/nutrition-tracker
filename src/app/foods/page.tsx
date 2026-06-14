import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Food } from "@/types/nutrition";
import { addFood, deleteFood, importStarterFoods } from "./actions";

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800";

export default async function FoodsPage() {
  const supabase = await createClient();
  const { data: foods } = await supabase
    .from("foods")
    .select("*")
    .order("name", { ascending: true });

  const list = (foods ?? []) as Food[];

  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-zinc-500 hover:underline">
            ← Αρχική
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            🍎 Τροφές
          </h1>
        </div>
        {list.length === 0 && (
          <form action={importStarterFoods}>
            <button className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
              Εισαγωγή starter τροφών
            </button>
          </form>
        )}
      </header>

      {/* Add food */}
      <form
        action={addFood}
        className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Νέα τροφή <span className="text-zinc-400">(ανά 100 g/ml)</span>
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <input name="name" placeholder="Όνομα" required className={`${inputCls} col-span-2 sm:col-span-3`} />
          <input name="calories" type="number" step="any" min="0" placeholder="Θερμίδες" required className={inputCls} />
          <input name="protein" type="number" step="any" min="0" placeholder="Πρωτεΐνη (g)" className={inputCls} />
          <input name="carbs" type="number" step="any" min="0" placeholder="Υδατάνθρακες (g)" className={inputCls} />
          <input name="fats" type="number" step="any" min="0" placeholder="Λιπαρά (g)" className={inputCls} />
          <select name="unit" defaultValue="g" className={inputCls}>
            <option value="g">g</option>
            <option value="ml">ml</option>
          </select>
          <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
            Προσθήκη
          </button>
        </div>
      </form>

      {/* List */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-2 font-medium">Τροφή</th>
              <th className="px-3 py-2 text-right font-medium">Θερμ.</th>
              <th className="px-3 py-2 text-right font-medium">Π</th>
              <th className="px-3 py-2 text-right font-medium">Υ</th>
              <th className="px-3 py-2 text-right font-medium">Λ</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                  Δεν υπάρχουν τροφές ακόμα. Πρόσθεσε μία ή κάνε «Εισαγωγή starter τροφών».
                </td>
              </tr>
            ) : (
              list.map((f) => (
                <tr key={f.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="px-4 py-2 text-zinc-900 dark:text-zinc-100">
                    {f.name}
                    <span className="ml-1 text-xs text-zinc-400">/{f.unit}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{f.calories_per_100}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{f.protein_per_100}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{f.carbs_per_100}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{f.fats_per_100}</td>
                  <td className="px-3 py-2 text-right">
                    <form action={deleteFood}>
                      <input type="hidden" name="id" value={f.id} />
                      <button
                        className="text-zinc-400 hover:text-red-600"
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
    </main>
  );
}
