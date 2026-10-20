-- "Tell me when it launches" emails collected on the closed-site gate page.
-- Service role only (server.js); no client policy. Apply after review.
create table if not exists public.launch_waitlist (
  email text primary key check (email = lower(email) and length(email) <= 254),
  created_at timestamptz not null default now()
);
alter table public.launch_waitlist enable row level security;
-- verify: select count(*) from public.launch_waitlist;
