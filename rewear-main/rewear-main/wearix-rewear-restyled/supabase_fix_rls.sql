-- ============================================================
-- WEARIX — RLS Fix
-- Run this in Supabase SQL Editor if contact/newsletter forms
-- are returning errors. This ensures anonymous inserts work.
-- ============================================================

-- Drop and recreate contact_messages policies
drop policy if exists "Anyone can send a message" on contact_messages;
create policy "Anyone can send a message"
  on contact_messages for insert
  to anon
  with check (true);

-- Drop and recreate newsletter policies
drop policy if exists "Anyone can subscribe" on newsletter_subscribers;
create policy "Anyone can subscribe"
  on newsletter_subscribers for insert
  to anon
  with check (true);

-- Make sure RLS is enabled on both
alter table contact_messages enable row level security;
alter table newsletter_subscribers enable row level security;

-- Also ensure products and blog_posts are readable by anon
drop policy if exists "Public can read products" on products;
create policy "Public can read products"
  on products for select
  to anon
  using (true);

drop policy if exists "Public can read blog posts" on blog_posts;
create policy "Public can read blog posts"
  on blog_posts for select
  to anon
  using (true);
