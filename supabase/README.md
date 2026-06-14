# Supabase

Schema & migrations για τη βάση του Nutrition Tracker.

## Εφαρμογή του schema

**Επιλογή Α — SQL Editor (πιο γρήγορο):**
1. Πήγαινε στο Supabase project → **SQL Editor** → **New query**.
2. Κάνε copy-paste όλο το περιεχόμενο του `migrations/20260614120000_init.sql`.
3. **Run**.

**Επιλογή Β — Supabase CLI:**
```bash
supabase link --project-ref <project-ref>
supabase db push
```

## Τι δημιουργεί

- Πίνακες: `foods`, `meals`, `meal_items`, `log_entries`
- **RLS policies** σε όλους: κάθε χρήστης βλέπει/γράφει μόνο τα δικά του δεδομένα (`auth.uid() = user_id`).
- Trigger `updated_at`, indexes, check constraints για slots/units/source.

## Μετά το schema

- Στο dashboard → **Authentication → Providers** βεβαιώσου ότι το **Email** είναι ενεργό.
- Πάρε τα keys από **Project Settings → API** και βάλ' τα στο `.env.local` (δες `.env.example`).
