import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Ανανεώνει το Supabase session σε κάθε request (καλείται από το `src/proxy.ts`).
 * Αν δεν έχουν οριστεί ακόμα τα Supabase env vars, γίνεται no-op ώστε η εφαρμογή
 * να τρέχει κανονικά πριν συνδεθεί η βάση.
 */
export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return supabaseResponse; // Supabase δεν έχει ρυθμιστεί ακόμα.
  }

  let response = supabaseResponse;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // ΣΗΜΑΝΤΙΚΟ: μην βάζεις κώδικα ανάμεσα στο createServerClient και το getUser().
  await supabase.auth.getUser();

  // Σημείωση: route protection (redirect σε /login) θα προστεθεί όταν χτιστεί
  // το auth UI. Προς το παρόν απλώς ανανεώνουμε το session.
  return response;
}
