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
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    return supabaseResponse; // Supabase δεν έχει ρυθμιστεί ακόμα.
  }

  let response = supabaseResponse;

  const supabase = createServerClient(url, publishableKey, {
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Route protection: μη συνδεδεμένοι χρήστες -> /login (εκτός public paths).
  const path = request.nextUrl.pathname;
  const isPublic = path.startsWith("/login") || path.startsWith("/auth");

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}
