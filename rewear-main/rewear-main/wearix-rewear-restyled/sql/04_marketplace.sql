-- ============================================================
-- REWEAR — RUN 4: MARKETPLACE TABLES
-- Listing Fees, Transactions, Earnings, and additive column
-- migrations on products and orders.
--
-- Run this after 01_store.sql, 02_users.sql, and 03_admin.sql
-- in the Supabase SQL Editor.
-- ============================================================

-- -------------------------------------------------------
-- NEW TABLE: listing_fees
-- Tracks upfront fees paid by sellers to list products.
-- Each tier grants a fixed number of listing slots with
-- an optional expiry window.
-- -------------------------------------------------------
create table listing_fees (
  id              uuid primary key default gen_random_uuid(),
  seller_id       uuid not null references sellers(id) on delete cascade,
  tier            text not null check (tier in ('basic', 'standard', 'premium')),
  amount_paid     numeric(10,2) not null,
  max_listings    int not null,
  listings_used   int not null default 0,
  status          text not null default 'active'
                    check (status in ('active', 'expired', 'exhausted')),
  paid_at         timestamptz not null default now(),
  expires_at      timestamptz,
  payment_method  text check (payment_method in ('gcash', 'cash', 'bank_transfer', 'manual')),
  payment_ref     text,
  created_at      timestamptz default now()
);

-- -------------------------------------------------------
-- NEW TABLE: transactions
-- Records every sale and calculates REWEAR's commission
-- cut and the seller's net payout.
-- -------------------------------------------------------
create table transactions (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references orders(id) on delete restrict,
  seller_id         uuid not null references sellers(id) on delete restrict,
  gross_amount      numeric(10,2) not null,
  commission_rate   numeric(4,3) not null,
  commission_amount numeric(10,2) not null,
  seller_payout     numeric(10,2) not null,
  status            text not null default 'pending'
                      check (status in ('pending', 'released', 'disputed', 'refunded')),
  created_at        timestamptz default now(),
  released_at       timestamptz
);

-- -------------------------------------------------------
-- NEW TABLE: earnings
-- Aggregated ledger of REWEAR's revenue — listing fees
-- collected and commissions earned on completed sales.
-- -------------------------------------------------------
create table earnings (
  id            uuid primary key default gen_random_uuid(),
  source        text not null check (source in ('listing_fee', 'commission')),
  reference_id  uuid not null,
  amount        numeric(10,2) not null,
  recorded_at   timestamptz default now()
);

-- -------------------------------------------------------
-- MODIFIED TABLE: products (additive migration)
-- Links each product to the listing fee slot it consumed,
-- enabling the listings_used counter to stay accurate.
-- -------------------------------------------------------
alter table products
  add column if not exists listing_fee_id uuid references listing_fees(id) on delete set null;

-- -------------------------------------------------------
-- MODIFIED TABLE: orders (additive migration)
-- Links each order to its corresponding transaction record
-- once the order is confirmed by admin.
-- -------------------------------------------------------
alter table orders
  add column if not exists transaction_id uuid references transactions(id) on delete set null;

-- -------------------------------------------------------
-- RLS POLICIES
-- Follow the same anon read/write pattern as existing
-- tables until Supabase Auth is live.
-- -------------------------------------------------------

alter table listing_fees  enable row level security;
alter table transactions   enable row level security;
alter table earnings       enable row level security;

-- listing_fees
create policy "Admin read listing_fees"
  on listing_fees for select to anon using (true);
create policy "Admin insert listing_fees"
  on listing_fees for insert to anon with check (true);
create policy "Admin update listing_fees"
  on listing_fees for update to anon using (true) with check (true);

-- transactions
create policy "Admin read transactions"
  on transactions for select to anon using (true);
create policy "Admin insert transactions"
  on transactions for insert to anon with check (true);
create policy "Admin update transactions"
  on transactions for update to anon using (true) with check (true);

-- earnings
create policy "Admin read earnings"
  on earnings for select to anon using (true);
create policy "Admin insert earnings"
  on earnings for insert to anon with check (true);

-- -------------------------------------------------------
-- PERFORMANCE INDEXES
-- -------------------------------------------------------

-- listing_fees: common filter is seller_id + status
create index if not exists idx_listing_fees_seller_status
  on listing_fees (seller_id, status);

-- transactions: common filter is seller_id + status
create index if not exists idx_transactions_seller_status
  on transactions (seller_id, status);

-- earnings: aggregation queries filter by source and sort by recorded_at
create index if not exists idx_earnings_source_recorded_at
  on earnings (source, recorded_at);
