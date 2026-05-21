-- Wipes all referral, leaver, and transfer rows (history, queues, follow-ups).
-- Does NOT delete auth users or profiles.
-- Run in Supabase SQL Editor when you need a full reset.

truncate table public.referrals restart identity cascade;
truncate table public.leavers restart identity cascade;
truncate table public.transfers restart identity cascade;

notify pgrst, 'reload schema';
