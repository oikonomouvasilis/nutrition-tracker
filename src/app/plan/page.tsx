import { getUserGoals } from "@/lib/goals-data";
import GoalsForm from "./goals-form";

export default async function PlanPage() {
  const goals = await getUserGoals();

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Πλάνο</h1>
      <p className="mt-1 text-sm text-muted">
        Όρισε τους ημερήσιους στόχους σου — χρησιμοποιούνται αυτόματα στην Αρχική & στα Στατιστικά.
      </p>

      <GoalsForm initial={goals} />
    </main>
  );
}
