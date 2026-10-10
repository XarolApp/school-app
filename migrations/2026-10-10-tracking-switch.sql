-- "Záznam používání" switch in Nastavení (LEGAL-01, 10 October 2026).
-- Re-runnable. Copied from supabase-setup.sql, which stays the source of truth.
alter table public.beta_profile add column if not exists tracking_paused_at timestamptz;
