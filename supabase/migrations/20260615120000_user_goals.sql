-- Πλάνο: ημερήσιοι διατροφικοί στόχοι ανά χρήστη (μία γραμμή ανά χρήστη).
-- Apply via Supabase SQL Editor (paste & run) ή `supabase db push`.

create table public.user_goals (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  calories   numeric not null default 2200 check (calories >= 0),
  protein    numeric not null default 140  check (protein  >= 0),
  carbs      numeric not null default 250  check (carbs    >= 0),
  fats       numeric not null default 70   check (fats     >= 0),
  updated_at timestamptz not null default now()
);

-- reuse του set_updated_at() από το init migration
create trigger user_goals_set_updated_at before update on public.user_goals
  for each row execute function public.set_updated_at();

-- Row Level Security: κάθε χρήστης βλέπει/γράφει μόνο τη δική του γραμμή.
alter table public.user_goals enable row level security;

create policy "user_goals_select_own" on public.user_goals
  for select using (auth.uid() = user_id);
create policy "user_goals_insert_own" on public.user_goals
  for insert with check (auth.uid() = user_id);
create policy "user_goals_update_own" on public.user_goals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
