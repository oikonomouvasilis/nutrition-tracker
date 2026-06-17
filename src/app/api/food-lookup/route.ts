import { createClient } from "@/lib/supabase/server";
import { lookupFood } from "@/lib/food-lookup";

export async function POST(request: Request) {
  // Auth: μόνο συνδεδεμένοι χρήστες.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { query?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const query = (body.query ?? "").trim();
  if (!query) {
    return Response.json({ error: "empty_query" }, { status: 400 });
  }
  if (query.length > 200) {
    return Response.json({ error: "too_long" }, { status: 400 });
  }

  const result = await lookupFood(query);
  return Response.json(result);
}
