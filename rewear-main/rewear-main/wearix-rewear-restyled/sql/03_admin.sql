-- ============================================================
-- REWEAR — RUN 3: ADMIN TABLES
-- Admin sessions (PIN-based access)
-- Run this AFTER 01_store.sql and 02_users.sql
-- ============================================================

-- ADMIN SESSIONS
create table admin_sessions (
  id         uuid primary key default gen_random_uuid(),
  pin_hash   text not null,
  created_at timestamptz default now()
);

-- Default PIN is: 1234
-- The hash below is SHA-256 of "1234"
-- IMPORTANT: Change your PIN after first login by updating this value
insert into admin_sessions (pin_hash)
values ('03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4');

-- RLS
alter table admin_sessions enable row level security;
create policy "Admin can read sessions" on admin_sessions for select to anon using (true);
