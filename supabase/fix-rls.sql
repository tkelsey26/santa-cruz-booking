-- Fix recursive RLS policies.
-- The original admin policies queried the profiles table from within a
-- profiles policy, causing an infinite loop. This replaces them with a
-- security-definer function which bypasses RLS and breaks the recursion.

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Profiles
drop policy if exists "profiles_admin_read" on public.profiles;
drop policy if exists "profiles_admin_update" on public.profiles;

create policy "profiles_admin_read" on public.profiles
  for select using (public.is_admin());

create policy "profiles_admin_update" on public.profiles
  for update using (public.is_admin());

-- Bookings
drop policy if exists "bookings_admin_read" on public.bookings;
drop policy if exists "bookings_insert_admin" on public.bookings;
drop policy if exists "bookings_admin_update" on public.bookings;
drop policy if exists "bookings_admin_delete" on public.bookings;

create policy "bookings_admin_read" on public.bookings
  for select using (public.is_admin());

create policy "bookings_insert_admin" on public.bookings
  for insert with check (public.is_admin());

create policy "bookings_admin_update" on public.bookings
  for update using (public.is_admin());

create policy "bookings_admin_delete" on public.bookings
  for delete using (public.is_admin());

-- Blocked dates
drop policy if exists "blocked_dates_admin_write" on public.blocked_dates;

create policy "blocked_dates_admin_write" on public.blocked_dates
  for all using (public.is_admin());
