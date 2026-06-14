import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client για Server Components / Server Actions / Route Handlers.
 * Στη Next.js 16 το `cookies()` είναι async.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Κλήση από Server Component: το set cookies γίνεται από το proxy
            // (session refresh), οπότε εδώ αγνοείται με ασφάλεια.
          }
        },
      },
    },
  );
}
