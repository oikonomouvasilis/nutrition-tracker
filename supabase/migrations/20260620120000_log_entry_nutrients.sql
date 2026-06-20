-- log_entries: snapshot ΕΠΙΠΛΕΟΝ θρεπτικών (πέρα από τα 4 βασικά μακρο).
-- Επιτρέπει στα Στατιστικά να εμφανίζουν και ίνες/σάκχαρα/νάτριο + βιταμίνες/μέταλλα,
-- όχι μόνο θερμίδες & μακρο. Τιμές = ΣΥΝΟΛΑ τη στιγμή της καταγραφής (όχι ανά 100),
-- ως key→ποσότητα, π.χ. {"fiber": 8.2, "sodium": 410, "vitamin_c": 32}.
--
-- Εφαρμογή: Supabase SQL Editor (paste & run) ή `supabase db push`.
alter table public.log_entries
  add column if not exists nutrients jsonb not null default '{}'::jsonb;
