create table if not exists public.staff_profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  pin_code text,
  module_name text not null check (
    module_name in (
      'Receptionist',
      'Referral Officer',
      'HB Claims Team',
      'RMS Team',
      'Maintenance Team',
      'Tenants Management',
      'Support Officer',
      'Job Assigner',
      'Driver'
    )
  ),
  monday_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.staff_profiles
drop constraint if exists staff_profiles_id_fkey;

alter table public.staff_profiles
alter column id set default gen_random_uuid();

alter table public.staff_profiles
add column if not exists pin_code text;

create unique index if not exists staff_profiles_pin_code_key
on public.staff_profiles (pin_code)
where pin_code is not null;

drop trigger if exists set_staff_profiles_updated_at on public.staff_profiles;
create trigger set_staff_profiles_updated_at
before update on public.staff_profiles
for each row execute function public.set_updated_at();

alter table public.staff_profiles enable row level security;

drop policy if exists "staff can read own profile" on public.staff_profiles;
create policy "staff can read own profile"
on public.staff_profiles for select
to authenticated
using (auth.uid() = id);

create or replace function public.verify_staff_pin(staff_pin text)
returns table (
  id uuid,
  full_name text,
  module_name text,
  monday_name text
)
language sql
security definer
set search_path = public
as $$
  select
    staff_profiles.id,
    staff_profiles.full_name,
    staff_profiles.module_name,
    staff_profiles.monday_name
  from public.staff_profiles
  where staff_profiles.pin_code = staff_pin
  limit 1;
$$;

grant execute on function public.verify_staff_pin(text) to anon, authenticated;

-- Seed default staff profiles (safe to re-run)
insert into public.staff_profiles (full_name, pin_code, module_name, monday_name)
values
  ('Reception Staff', '1001', 'Receptionist', null),
  ('Driver Staff', '1002', 'Driver', null),
  ('Tuubee', '1003', 'Referral Officer', 'Tuubee'),
  ('HB Claims Staff', '1004', 'HB Claims Team', null),
  ('RMS Staff', '1005', 'RMS Team', null),
  ('Maintenance Staff', '1006', 'Maintenance Team', null),
  ('Tenants Management Staff', '1007', 'Tenants Management', null),
  ('Support Officer Staff', '1008', 'Support Officer', null)
on conflict do nothing;
