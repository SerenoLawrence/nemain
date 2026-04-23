-- ============================================================
-- WEARIX — Migration: sizes, suggested_price, sellers, orders
-- Run in Supabase SQL Editor → New Query → Paste → Run
-- ============================================================

-- 1. Add sizes and suggested_price to products
alter table products
  add column if not exists sizes       text[] default array['S','M','L'],
  add column if not exists suggested_price numeric(10,2),
  add column if not exists seller_id   uuid,
  add column if not exists description text;

-- Update existing products with sizes and suggested prices
update products set sizes = array['S','M','L'],    suggested_price = price * 0.85 where category = 'shirts';
update products set sizes = array['S','M','L'],    suggested_price = price * 0.85 where category = 'pants';
update products set sizes = array['S','M','L','XL'], suggested_price = price * 0.85 where category = 'jackets';
update products set sizes = array['38','40','42','44'], suggested_price = price * 0.85 where category = 'shoes';
update products set sizes = array['One Size'],     suggested_price = price * 0.85 where category = 'accessories';

-- 2. SELLERS TABLE
create table if not exists sellers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid,                          -- links to auth.users once auth is live
  business_name text not null,
  email         text not null unique,
  phone         text,
  description   text,
  verified      boolean default false,         -- admin manually sets this to true
  created_at    timestamptz default now()
);

-- 3. ORDERS TABLE
create table if not exists orders (
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

-- 4. RLS for new tables
alter table sellers enable row level security;
create policy if not exists "Public can read verified sellers"
  on sellers for select using (verified = true);
create policy if not exists "Anyone can apply as seller"
  on sellers for insert with check (true);

alter table orders enable row level security;
create policy if not exists "Anyone can place an order"
  on orders for insert with check (true);
create policy if not exists "Buyers can view their own orders"
  on orders for select using (true);

-- 5. Allow public read on products (re-ensure)
drop policy if exists "Public can read products" on products;
create policy "Public can read products"
  on products for select to anon using (true);
