import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/lib/auth/actions";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          🥗 Nutrition Tracker
        </h1>
        <form action={logout}>
          <button className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
            Αποσύνδεση
          </button>
        </form>
      </header>

      <p className="mt-2 text-sm text-zinc-500">
        Συνδεδεμένος ως {user?.email}
      </p>

      <nav className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link
          href="/foods"
          className="rounded-2xl border border-zinc-200 bg-white p-6 transition hover:border-zinc-400 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <h2 className="font-medium text-zinc-900 dark:text-zinc-50">
            🍎 Τροφές
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Διαχείριση βάσης τροφών & μακροθρεπτικών.
          </p>
        </Link>

        <Link
          href="/meals"
          className="rounded-2xl border border-zinc-200 bg-white p-6 transition hover:border-zinc-400 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <h2 className="font-medium text-zinc-900 dark:text-zinc-50">
            🍽️ Γεύματα
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Σύνθεση γευμάτων & υπολογισμός μακρο.
          </p>
        </Link>

        <Link
          href="/history"
          className="rounded-2xl border border-zinc-200 bg-white p-6 transition hover:border-zinc-400 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <h2 className="font-medium text-zinc-900 dark:text-zinc-50">
            📅 Ημερολόγιο
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Καταγραφή & ιστορικό ανά ημέρα.
          </p>
        </Link>
      </nav>
    </main>
  );
}
