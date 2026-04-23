-- ============================================================
-- REWEAR — RUN 2: USER TABLES
-- Sellers, Orders, Wishlists
-- Run this AFTER 01_store.sql
-- ============================================================

-- SELLERS
create table sellers (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid,
  business_name    text not null,
  email            text not null unique,
  phone            text,
  description      text,
  verified         boolean default false,
  verified_at      timestamptz,
  rejection_reason text,
  created_at       timestamptz default now()
);

-- ORDERS
create table orders (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid references products(id) on delete set null,
  buyer_name    text not null,
  buyer_email   text not null,
  size_selected text,
  quantity      int default 1,
  total_price   numeric(10,2),
  status        text default 'pending' check (status in ('pending','confirmed','shipped','delivered','cancelled')),
  created_at    timestamptz default now()
);

-- WISHLISTS (ready for when auth is live)
create table wishlists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  product_id uuid not null references products(id) on delete cascade,
  added_at   timestamptz default now(),
  unique (user_id, product_id)
);

-- RLS
alter table sellers   enable row level security;
alter table orders    enable row level security;
alter table wishlists enable row level security;

-- Sellers
create policy "Anyone can apply as seller"     on sellers for insert to anon with check (true);
create policy "Admin read all sellers"         on sellers for select to anon using (true);
create policy "Admin update sellers"           on sellers for update to anon using (true) with check (true);

-- Orders
create policy "Anyone can place order"         on orders for insert to anon with check (true);
create policy "Anyone can read orders"         on orders for select to anon using (true);
create policy "Admin update orders"            on orders for update to anon using (true) with check (true);

-- Wishlists (locked until auth)
create policy "Users manage own wishlist"      on wishlists for all using (auth.uid() = user_id);
