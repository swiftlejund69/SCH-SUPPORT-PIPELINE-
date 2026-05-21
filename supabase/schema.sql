create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  app_record_id bigint unique,
  monday_item_id text,
  full_name text not null,
  phone_number text,
  date_of_birth date,
  age integer,
  ni_number text,
  income_amount numeric,
  family_members_below_10 integer,
  referral_type text check (referral_type in ('walk-in', 'sourced')),
  referral_officer text,
  secured_property_address text,
  secured_room_number text,
  driver_status text,
  referral_officer_status text,
  support_worker text,
  assigned_to text,
  assigned_by text,
  assigned_at timestamptz,
  escalation_count integer not null default 0,
  escalation_paused_at timestamptz,
  hb_claims_status text,
  rms_status text,
  tenants_management_status text,
  monday_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leavers (
  id uuid primary key default gen_random_uuid(),
  app_record_id bigint unique,
  monday_item_id text,
  full_name text not null,
  ni_number text,
  property_address text not null,
  room_number text not null,
  leaving_date date not null,
  maintenance_works_required text,
  cleaning_type text check (cleaning_type in ('cleaning', 'maintenance')),
  has_maintenance_photos boolean not null default false,
  has_maintenance_videos boolean not null default false,
  tenants_management_status text,
  hb_claims_status text,
  rms_status text,
  maintenance_status text,
  assigned_to text,
  assigned_by text,
  assigned_at timestamptz,
  escalation_count integer not null default 0,
  assigned_job_date date,
  cleaning_scheduled_date date,
  maintenance_scheduled_date date,
  inspection_report jsonb,
  monday_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  app_record_id bigint unique,
  monday_item_id text,
  full_name text not null,
  ni_number text,
  current_property_address text not null,
  current_room_number text not null,
  transfer_date date not null,
  new_property_address text not null,
  new_room_number text not null,
  old_room_maintenance_work text,
  cleaning_type text check (cleaning_type in ('cleaning', 'maintenance')),
  has_maintenance_photos boolean not null default false,
  has_maintenance_videos boolean not null default false,
  tenants_management_status text,
  hb_claims_status text,
  rms_status text,
  maintenance_status text,
  assigned_to text,
  assigned_by text,
  assigned_at timestamptz,
  escalation_count integer not null default 0,
  assigned_job_date date,
  cleaning_scheduled_date date,
  maintenance_scheduled_date date,
  inspection_report jsonb,
  monday_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_referrals_updated_at on public.referrals;
create trigger set_referrals_updated_at
before update on public.referrals
for each row execute function public.set_updated_at();

drop trigger if exists set_leavers_updated_at on public.leavers;
create trigger set_leavers_updated_at
before update on public.leavers
for each row execute function public.set_updated_at();

drop trigger if exists set_transfers_updated_at on public.transfers;
create trigger set_transfers_updated_at
before update on public.transfers
for each row execute function public.set_updated_at();

alter table public.referrals enable row level security;
alter table public.leavers enable row level security;
alter table public.transfers enable row level security;

alter table public.leavers
add column if not exists cleaning_type text check (cleaning_type in ('cleaning', 'maintenance')),
add column if not exists ni_number text,
add column if not exists assigned_job_date date,
add column if not exists assigned_to text,
add column if not exists assigned_by text,
add column if not exists assigned_at timestamptz,
add column if not exists escalation_count integer not null default 0,
add column if not exists inspection_report jsonb;

alter table public.transfers
add column if not exists cleaning_type text check (cleaning_type in ('cleaning', 'maintenance')),
add column if not exists ni_number text,
add column if not exists assigned_job_date date,
add column if not exists assigned_to text,
add column if not exists assigned_by text,
add column if not exists assigned_at timestamptz,
add column if not exists escalation_count integer not null default 0,
add column if not exists inspection_report jsonb;

notify pgrst, 'reload schema';

alter table public.referrals
add column if not exists follow_up_reasons text[] default '{}',
add column if not exists tenant_type text;

alter table public.referrals
add column if not exists support_worker text,
add column if not exists assigned_to text,
add column if not exists assigned_by text,
add column if not exists assigned_at timestamptz,
add column if not exists escalation_count integer not null default 0,
add column if not exists escalation_paused_at timestamptz;

drop policy if exists "temporary public read referrals" on public.referrals;
create policy "temporary public read referrals"
on public.referrals for select
to anon, authenticated
using (true);

drop policy if exists "temporary public write referrals" on public.referrals;
create policy "temporary public write referrals"
on public.referrals for insert
to anon, authenticated
with check (true);

drop policy if exists "temporary public update referrals" on public.referrals;
create policy "temporary public update referrals"
on public.referrals for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "temporary public read leavers" on public.leavers;
create policy "temporary public read leavers"
on public.leavers for select
to anon, authenticated
using (true);

drop policy if exists "temporary public write leavers" on public.leavers;
create policy "temporary public write leavers"
on public.leavers for insert
to anon, authenticated
with check (true);

drop policy if exists "temporary public update leavers" on public.leavers;
create policy "temporary public update leavers"
on public.leavers for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "temporary public read transfers" on public.transfers;
create policy "temporary public read transfers"
on public.transfers for select
to anon, authenticated
using (true);

drop policy if exists "temporary public write transfers" on public.transfers;
create policy "temporary public write transfers"
on public.transfers for insert
to anon, authenticated
with check (true);

drop policy if exists "temporary public update transfers" on public.transfers;
create policy "temporary public update transfers"
on public.transfers for update
to anon, authenticated
using (true)
with check (true);

alter table public.referrals
add column if not exists handoff_notes text,
add column if not exists timeline_end date,
add column if not exists monday_status text;

alter table public.leavers
add column if not exists property_inspected boolean not null default false,
add column if not exists inspection_completed_at date,
add column if not exists monday_status text;

alter table public.transfers
add column if not exists property_inspected boolean not null default false,
add column if not exists inspection_completed_at date,
add column if not exists monday_status text;

notify pgrst, 'reload schema';
