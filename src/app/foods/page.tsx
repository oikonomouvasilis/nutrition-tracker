import { createClient } from "@/lib/supabase/server";
import type { Food } from "@/types/nutrition";
import { importStarterFoods } from "./actions";
import AddFoodForm from "./add-food-form";
import FoodsTable from "./foods-table";

export default async function FoodsPage() {
  const supabase = await createClient();
  const { data: foods } = await supabase
    .from("foods")
    .select("*")
    .order("name", { ascending: true });

  const list = (foods ?? []) as Food[];

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Τροφές</h1>
          <p className="mt-1 text-sm text-muted">
            Η βάση τροφών σου — μακροθρεπτικά, βιταμίνες & μέταλλα ανά 100 g/ml.
          </p>
        </div>
        {list.length === 0 && (
          <form action={importStarterFoods}>
            <button className="rounded-xl border border-edge px-3 py-2 text-sm font-medium text-muted transition hover:border-neon-green/50 hover:text-foreground">
              Εισαγωγή starter τροφών
            </button>
          </form>
        )}
      </header>

      {/* Χειροκίνητη / AI εισαγωγή */}
      <AddFoodForm />

      {/* Λίστα με αναζήτηση, ταξινόμηση & δυναμικές στήλες */}
      <FoodsTable foods={list} />
    </main>
  );
}
