-- ============================================================
-- REWEAR — FULL DATABASE SETUP (Single Run)
-- Paste this entire file into Supabase SQL Editor → Run
-- Fresh install only — will fail if tables already exist
-- ============================================================


-- ============================================================
-- 1. PRODUCTS
-- ============================================================
create table products (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  price            numeric(10,2) not null,
  category         text not null check (category in ('shirts','pants','jackets','shoes','accessories')),
  image_url        text,
  rating           numeric(2,1) default 5.0 check (rating >= 1 and rating <= 5),
  in_stock         boolean default true,
  status           text default 'approved' check (status in ('pending','approved','rejected')),
  sizes            text[] default array['S','M','L'],
  suggested_price  numeric(10,2),
  description      text,
  rejection_reason text,
  seller_id        uuid,
  created_at       timestamptz default now()
);

insert into products (name, price, category, image_url, rating, sizes, suggested_price) values
  ('Premium Cotton Shirt',  89.00,  'shirts',      'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&q=80', 5.0, array['S','M','L'],          75.00),
  ('Classic Denim Jacket',  129.00, 'jackets',     'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80',   5.0, array['S','M','L','XL'],     110.00),
  ('Tailored Trousers',     109.00, 'pants',       'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&q=80', 4.0, array['S','M','L'],          92.00),
  ('Linen Blend Shirt',     79.00,  'shirts',      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80', 5.0, array['S','M','L'],          67.00),
  ('Leather Sneakers',      149.00, 'shoes',       'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=600&q=80', 5.0, array['38','40','42','44'],  126.00),
  ('Wool Overcoat',         259.00, 'jackets',     'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=600&q=80',   5.0, array['S','M','L','XL'],     220.00),
  ('Slim Fit Jeans',        99.00,  'pants',       'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&q=80', 4.0, array['S','M','L'],          84.00),
  ('Leather Messenger Bag', 189.00, 'accessories', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80',   5.0, array['One Size'],            160.00),
  ('Oxford Shirt',          85.00,  'shirts',      'https://images.unsplash.com/photo-1602810319250-971d62e889f3?w=600&q=80', 5.0, array['S','M','L'],          72.00),
  ('Bomber Jacket',         139.00, 'jackets',     'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&q=80', 4.0, array['S','M','L','XL'],     118.00),
  ('Chelsea Boots',         169.00, 'shoes',       'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=600&q=80', 5.0, array['38','40','42','44'],  143.00),
  ('Leather Belt',          59.00,  'accessories', 'https://images.unsplash.com/photo-1523772354886-34a1dc2f72e7?w=600&q=80', 5.0, array['One Size'],            50.00);


-- ============================================================
-- 2. BLOG POSTS
-- ============================================================
create table blog_posts (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  excerpt           text,
  category          text not null check (category in ('style','trends','stories','care')),
  image_url         text,
  read_time_minutes int default 5,
  published_at      timestamptz default now(),
  created_at        timestamptz default now()
);

insert into blog_posts (title, excerpt, category, image_url, read_time_minutes, published_at) values
  ('How to master the art of minimalist street style',    'Discover the secrets to creating effortlessly chic looks with a capsule wardrobe.',                        'style',   'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80', 5, '2026-04-15 00:00:00+00'),
  ('Spring essentials: what''s trending for the season',  'From oversized blazers to tailored trousers, explore the key pieces defining this season''s aesthetic.',   'trends',  'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80', 4, '2026-04-12 00:00:00+00'),
  ('Premium fabric care: keeping your pieces timeless',   'Expert tips on washing, storing, and maintaining your premium wardrobe for years to come.',                'care',    'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80', 6, '2026-04-10 00:00:00+00'),
  ('Behind the collection: designing with intention',     'An inside look at how our design team creates pieces that balance form, function, and timeless appeal.',    'stories', 'https://images.unsplash.com/photo-1558769132-cb1aea1c8347?w=800&q=80', 7, '2026-04-08 00:00:00+00'),
  ('Layering techniques for transitional weather',        'Master the art of layering with our guide to creating depth and dimension in your outfits.',                'style',   'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80', 5, '2026-04-05 00:00:00+00'),
  ('The fashion industry''s shift toward sustainability', 'Exploring how conscious consumption and ethical production are reshaping modern fashion.',                  'trends',  'https://images.unsplash.com/photo-1467043198406-dc953a3defa0?w=800&q=80', 8, '2026-04-03 00:00:00+00'),
  ('10 wardrobe essentials every closet needs',           'Build a foundation of versatile pieces that work seamlessly together for endless styling options.',         'style',   'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=800&q=80', 6, '2026-04-01 00:00:00+00'),
  ('The artisans behind your favorite pieces',            'Meet the skilled craftspeople who bring precision and passion to every stitch and seam.',                   'stories', 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&q=80', 7, '2026-03-28 00:00:00+00'),
  ('The definitive guide to leather shoe care',           'Keep your premium leather footwear looking pristine with these essential maintenance techniques.',          'care',    'https://images.unsplash.com/photo-1620799140188-3b2a02fd9a77?w=800&q=80', 5, '2026-03-25 00:00:00+00');


-- ============================================================
-- 3. NEWSLETTER SUBSCRIBERS
-- ============================================================
create table newsletter_subscribers (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  subscribed_at timestamptz default now()
);


-- ============================================================
-- 4. CONTACT MESSAGES
-- ============================================================
create table contact_messages (
  id         uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name  text not null,
  email      text not null,
  phone      text,
  subject    text not null,
  message    text not null,
  created_at timestamptz default now()
);


-- ============================================================
-- 5. SELLERS
-- ============================================================
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


-- ============================================================
-- 6. ORDERS
-- ============================================================
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


-- ============================================================
-- 7. WISHLISTS (ready for auth)
-- ============================================================
create table wishlists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  product_id uuid not null references products(id) on delete cascade,
  added_at   timestamptz default now(),
  unique (user_id, product_id)
);


-- ============================================================
-- 8. ADMIN SESSIONS
-- Default PIN: 1234
-- Change after first login!
-- ============================================================
create table admin_sessions (
  id         uuid primary key default gen_random_uuid(),
  pin_hash   text not null,
  created_at timestamptz default now()
);

insert into admin_sessions (pin_hash)
values ('03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4');


-- ============================================================
-- 9. ROW LEVEL SECURITY
-- ============================================================

-- Products
alter table products enable row level security;
create policy "Public read approved products"  on products for select to anon using (status = 'approved');
create policy "Admin read all products"        on products for select to anon using (true);
create policy "Admin insert products"          on products for insert to anon with check (true);
create policy "Admin update products"          on products for update to anon using (true) with check (true);

-- Blog posts
alter table blog_posts enable row level security;
create policy "Public read blog posts"         on blog_posts for select to anon using (true);

-- Newsletter
alter table newsletter_subscribers enable row level security;
create policy "Anyone can subscribe"           on newsletter_subscribers for insert to anon with check (true);

-- Contact
alter table contact_messages enable row level security;
create policy "Anyone can contact"             on contact_messages for insert to anon with check (true);

-- Sellers
alter table sellers enable row level security;
create policy "Anyone can apply as seller"     on sellers for insert to anon with check (true);
create policy "Admin read all sellers"         on sellers for select to anon using (true);
create policy "Admin update sellers"           on sellers for update to anon using (true) with check (true);

-- Orders
alter table orders enable row level security;
create policy "Anyone can place order"         on orders for insert to anon with check (true);
create policy "Anyone can read orders"         on orders for select to anon using (true);
create policy "Admin update orders"            on orders for update to anon using (true) with check (true);

-- Wishlists
alter table wishlists enable row level security;
create policy "Users manage own wishlist"      on wishlists for all using (auth.uid() = user_id);

-- Admin sessions
alter table admin_sessions enable row level security;
create policy "Admin read sessions"            on admin_sessions for select to anon using (true);
