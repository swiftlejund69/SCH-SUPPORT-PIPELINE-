-- Run in Supabase SQL Editor (Dashboard → SQL → New query) if follow-ups fail to save.
alter table public.referrals
add column if not exists follow_up_reasons text[] default '{}',
add column if not exists tenant_type text;

notify pgrst, 'reload schema';
