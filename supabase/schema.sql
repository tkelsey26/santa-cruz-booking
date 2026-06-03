-- ============================================================
-- Santa Cruz Booking — Supabase schema
-- Run this in: Supabase dashboard > SQL Editor > New query
-- ============================================================

-- Profiles (one row per user, linked to auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  email text,
  role text not null default 'regular_guest'
    check (role in ('admin', 'priority_guest', 'regular_guest')),
  created_at timestamptz default now()
);

-- Bookings
create table public.bookings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  check_in date not null,
  check_out date not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  notes text,
  admin_notes text,
  admin_override boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint valid_dates check (check_out > check_in)
);

-- Blocked date ranges
create table public.blocked_dates (
  id uuid default gen_random_uuid() primary key,
  start_date date not null,
  end_date date not null,
  reason text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  constraint valid_range check (end_date >= start_date)
);

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at on bookings
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_booking_updated
  before update on public.bookings
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.bookings enable row level security;
alter table public.blocked_dates enable row level security;

-- Profiles: users see their own; admins see all
create policy "profiles_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_admin_read" on public.profiles
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_admin_update" on public.profiles
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Bookings: users see their own + all approved; admins see all
create policy "bookings_own" on public.bookings
  for select using (auth.uid() = user_id);

create policy "bookings_approved" on public.bookings
  for select using (status = 'approved');

create policy "bookings_admin_read" on public.bookings
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "bookings_insert_own" on public.bookings
  for insert with check (auth.uid() = user_id);

create policy "bookings_insert_admin" on public.bookings
  for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "bookings_delete_own_pending" on public.bookings
  for delete using (auth.uid() = user_id and status = 'pending');

create policy "bookings_admin_update" on public.bookings
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "bookings_admin_delete" on public.bookings
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Blocked dates: everyone can read; only admins can write
create policy "blocked_dates_read" on public.blocked_dates
  for select using (true);

create policy "blocked_dates_admin_write" on public.blocked_dates
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ============================================================
-- After running this schema:
-- 1. Sign up at your app's /login page
-- 2. In Supabase dashboard → Table Editor → profiles
--    Find your row and set role = 'admin'
-- You'll then have full admin access in the app.
-- ============================================================
