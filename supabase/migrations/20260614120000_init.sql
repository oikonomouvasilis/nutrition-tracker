-- Nutrition Tracker — initial schema + Row Level Security
-- Apply via Supabase SQL Editor (paste & run) or `supabase db push`.
--
-- Entities (από το Excel):
--   foods       -> Product's List  (μακρο ανά 100 g/ml)
--   meals       -> Cookbook        (συνταγές/γεύματα)
--   meal_items  -> Recipe Creator  (συστατικά × ποσότητα)
--   log_entries -> Meal Calendar   (ιστορικό ανά ημέρα, snapshot)

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- foods : η βάση τροφών
-- ----------------------------------------------------------------------------
create table public.foods (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  unit             text not null default 'g' check (unit in ('g','ml')),
  -- 4 βασικά μακρο (υποχρεωτικά), ανά 100 g/ml
  calories_per_100 numeric not null check (calories_per_100 >= 0),
  protein_per_100  numeric not null default 0 check (protein_per_100 >= 0),
  carbs_per_100    numeric not null default 0 check (carbs_per_100 >= 0),
  fats_per_100     numeric not null default 0 check (fats_per_100 >= 0),
  -- προαιρετικά extended μακρο
  fiber_per_100    numeric check (fiber_per_100 >= 0),
  sugar_per_100    numeric check (sugar_per_100 >= 0),
  sodium_per_100   numeric check (sodium_per_100 >= 0),
  -- ευέλικτες βιταμίνες/μέταλλα (προαιρετικά), π.χ. {"vitamin_c": 12, "iron": 2.1}
  micronutrients   jsonb not null default '{}'::jsonb,
  source           text not null default 'manual' check (source in ('manual','ai')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index foods_user_id_idx on public.foods(user_id);
create index foods_name_idx on public.foods(user_id, name);

-- ----------------------------------------------------------------------------
-- meals : συνταγές / γεύματα (Cookbook)
-- ----------------------------------------------------------------------------
create table public.meals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  meal_type   text check (meal_type in ('breakfast','lunch','afternoon','evening','other')),
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index meals_user_id_idx on public.meals(user_id);

-- ----------------------------------------------------------------------------
-- meal_items : συστατικά ενός γεύματος με ρυθμιζόμενη ποσότητα (g/ml)
-- τα μακρο της κάθε γραμμής = quantity/100 × food.*_per_100 (υπολογίζονται live)
-- ----------------------------------------------------------------------------
create table public.meal_items (
  id         uuid primary key default gen_random_uuid(),
  meal_id    uuid not null references public.meals(id) on delete cascade,
  food_id    uuid not null references public.foods(id) on delete restrict,
  quantity   numeric not null check (quantity > 0),
  position   int not null default 0,
  created_at timestamptz not null default now()
);
create index meal_items_meal_id_idx on public.meal_items(meal_id);
create index meal_items_food_id_idx on public.meal_items(food_id);

-- ----------------------------------------------------------------------------
-- log_entries : ημερολόγιο/ιστορικό. Κρατάει SNAPSHOT των μακρο τη στιγμή της
-- καταγραφής ώστε αλλαγές σε συνταγές να μην αλλοιώνουν το ιστορικό.
-- ----------------------------------------------------------------------------
create table public.log_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  entry_date date not null default current_date,
  slot       text not null check (slot in ('breakfast','lunch','afternoon','evening','other')),
  meal_id    uuid references public.meals(id) on delete set null,
  -- snapshot
  name       text not null,
  calories   numeric not null default 0,
  protein    numeric not null default 0,
  carbs      numeric not null default 0,
  fats       numeric not null default 0,
  created_at timestamptz not null default now()
);
create index log_entries_user_date_idx on public.log_entries(user_id, entry_date);

-- ----------------------------------------------------------------------------
-- updated_at trigger
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger foods_set_updated_at before update on public.foods
  for each row execute function public.set_updated_at();
create trigger meals_set_updated_at before update on public.meals
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security : κάθε χρήστης βλέπει/γράφει ΜΟΝΟ τα δικά του δεδομένα
-- ----------------------------------------------------------------------------
alter table public.foods       enable row level security;
alter table public.meals       enable row level security;
alter table public.meal_items  enable row level security;
alter table public.log_entries enable row level security;

-- foods
create policy "foods_select_own" on public.foods for select using (auth.uid() = user_id);
create policy "foods_insert_own" on public.foods for insert with check (auth.uid() = user_id);
create policy "foods_update_own" on public.foods for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "foods_delete_own" on public.foods for delete using (auth.uid() = user_id);

-- meals
create policy "meals_select_own" on public.meals for select using (auth.uid() = user_id);
create policy "meals_insert_own" on public.meals for insert with check (auth.uid() = user_id);
create policy "meals_update_own" on public.meals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "meals_delete_own" on public.meals for delete using (auth.uid() = user_id);

-- meal_items : πρόσβαση μέσω ιδιοκτησίας του γονικού meal
create policy "meal_items_select_own" on public.meal_items for select
  using (exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid()));
create policy "meal_items_insert_own" on public.meal_items for insert
  with check (exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid()));
create policy "meal_items_update_own" on public.meal_items for update
  using (exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid()));
create policy "meal_items_delete_own" on public.meal_items for delete
  using (exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid()));

-- log_entries
create policy "log_select_own" on public.log_entries for select using (auth.uid() = user_id);
create policy "log_insert_own" on public.log_entries for insert with check (auth.uid() = user_id);
create policy "log_update_own" on public.log_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "log_delete_own" on public.log_entries for delete using (auth.uid() = user_id);
