-- ============================================================
-- WEARIX — Supabase Database Setup
-- Run this entire file in your Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================


-- ============================================================
-- 1. PRODUCTS TABLE
-- Source: shop.html product cards
-- Fields: name, price, category, image_url, rating, in_stock
-- Categories used: shirts | pants | jackets | shoes | accessories
-- ============================================================

create table products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  price       numeric(10, 2) not null,
  category    text not null check (category in ('shirts', 'pants', 'jackets', 'shoes', 'accessories')),
  image_url   text,                        -- Cloudinary URL goes here
  rating      numeric(2, 1) default 5.0 check (rating >= 1 and rating <= 5),
  in_stock    boolean default true,
  created_at  timestamptz default now()
);

-- Seed with the 12 products from shop.html
insert into products (name, price, category, image_url, rating) values
  ('Premium Cotton Shirt',   89.00,  'shirts',      'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&q=80', 5.0),
  ('Classic Denim Jacket',   129.00, 'jackets',     'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80',   5.0),
  ('Tailored Trousers',      109.00, 'pants',       'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&q=80', 4.0),
  ('Linen Blend Shirt',      79.00,  'shirts',      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80', 5.0),
  ('Leather Sneakers',       149.00, 'shoes',       'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=600&q=80', 5.0),
  ('Wool Overcoat',          259.00, 'jackets',     'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=600&q=80',   5.0),
  ('Slim Fit Jeans',         99.00,  'pants',       'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&q=80', 4.0),
  ('Leather Messenger Bag',  189.00, 'accessories', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80',   5.0),
  ('Oxford Shirt',           85.00,  'shirts',      'https://images.unsplash.com/photo-1602810319250-971d62e889f3?w=600&q=80', 5.0),
  ('Bomber Jacket',          139.00, 'jackets',     'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&q=80', 4.0),
  ('Chelsea Boots',          169.00, 'shoes',       'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=600&q=80', 5.0),
  ('Leather Belt',           59.00,  'accessories', 'https://images.unsplash.com/photo-1523772354886-34a1dc2f72e7?w=600&q=80', 5.0);


-- ============================================================
-- 2. BLOG POSTS TABLE
-- Source: blog.html article cards
-- Fields: title, excerpt, category, image_url, published_at, read_time_minutes
-- Categories used: style | trends | stories | care
-- ============================================================

create table blog_posts (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  excerpt             text,
  category            text not null check (category in ('style', 'trends', 'stories', 'care')),
  image_url           text,                        -- Cloudinary URL goes here
  read_time_minutes   int default 5,
  published_at        timestamptz default now(),
  created_at          timestamptz default now()
);

-- Seed with the 9 articles from blog.html
insert into blog_posts (title, excerpt, category, image_url, read_time_minutes, published_at) values
  (
    'How to master the art of minimalist street style',
    'Discover the secrets to creating effortlessly chic looks with a capsule wardrobe that works for any occasion.',
    'style',
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80',
    5,
    '2026-04-15 00:00:00+00'
  ),
  (
    'Spring essentials: what''s trending for the new season',
    'From oversized blazers to tailored trousers, explore the key pieces defining this season''s aesthetic.',
    'trends',
    'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80',
    4,
    '2026-04-12 00:00:00+00'
  ),
  (
    'Premium fabric care: keeping your pieces timeless',
    'Expert tips on washing, storing, and maintaining your premium wardrobe for years to come.',
    'care',
    'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80',
    6,
    '2026-04-10 00:00:00+00'
  ),
  (
    'Behind the collection: designing with intention',
    'An inside look at how our design team creates pieces that balance form, function, and timeless appeal.',
    'stories',
    'https://images.unsplash.com/photo-1558769132-cb1aea1c8347?w=800&q=80',
    7,
    '2026-04-08 00:00:00+00'
  ),
  (
    'Layering techniques for transitional weather',
    'Master the art of layering with our guide to creating depth and dimension in your outfits.',
    'style',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80',
    5,
    '2026-04-05 00:00:00+00'
  ),
  (
    'The fashion industry''s shift toward sustainability',
    'Exploring how conscious consumption and ethical production are reshaping modern fashion.',
    'trends',
    'https://images.unsplash.com/photo-1467043198406-dc953a3defa0?w=800&q=80',
    8,
    '2026-04-03 00:00:00+00'
  ),
  (
    '10 wardrobe essentials every closet needs',
    'Build a foundation of versatile pieces that work seamlessly together for endless styling options.',
    'style',
    'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=800&q=80',
    6,
    '2026-04-01 00:00:00+00'
  ),
  (
    'The artisans behind your favorite pieces',
    'Meet the skilled craftspeople who bring precision and passion to every stitch and seam.',
    'stories',
    'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&q=80',
    7,
    '2026-03-28 00:00:00+00'
  ),
  (
    'The definitive guide to leather shoe care',
    'Keep your premium leather footwear looking pristine with these essential maintenance techniques.',
    'care',
    'https://images.unsplash.com/photo-1620799140188-3b2a02fd9a77?w=800&q=80',
    5,
    '2026-03-25 00:00:00+00'
  );


-- ============================================================
-- 3. NEWSLETTER SUBSCRIBERS TABLE
-- Source: newsletter form on every page (email input)
-- ============================================================

create table newsletter_subscribers (
  id           uuid primary key default gen_random_uuid(),
  email        text not null unique,
  subscribed_at timestamptz default now()
);


-- ============================================================
-- 4. CONTACT MESSAGES TABLE
-- Source: contact.html form
-- Fields: firstName, lastName, email, phone, subject, message
-- ============================================================

create table contact_messages (
  id           uuid primary key default gen_random_uuid(),
  first_name   text not null,
  last_name    text not null,
  email        text not null,
  phone        text,                        -- optional field in the form
  subject      text not null,
  message      text not null,
  created_at   timestamptz default now()
);


-- ============================================================
-- 5. WISHLISTS TABLE
-- Source: script.js wishlist logic (currently localStorage)
-- Prep for when auth is added — links user_id to product_id
-- Leave this for now, wire up after auth is ready
-- ============================================================

create table wishlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,               -- will reference auth.users(id) once auth is live
  product_id  uuid not null references products(id) on delete cascade,
  added_at    timestamptz default now(),
  unique (user_id, product_id)             -- no duplicate wishlist entries per user
);


-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- Public can READ products and blog posts
-- Only authenticated users can write to wishlists
-- Anyone can INSERT into newsletter and contact (no auth needed)
-- ============================================================

-- Products: public read
alter table products enable row level security;
create policy "Public can read products"
  on products for select using (true);

-- Blog posts: public read
alter table blog_posts enable row level security;
create policy "Public can read blog posts"
  on blog_posts for select using (true);

-- Newsletter: anyone can subscribe (insert only)
alter table newsletter_subscribers enable row level security;
create policy "Anyone can subscribe"
  on newsletter_subscribers for insert with check (true);

-- Contact messages: anyone can send (insert only)
alter table contact_messages enable row level security;
create policy "Anyone can send a message"
  on contact_messages for insert with check (true);

-- Wishlists: users manage their own (enable after auth is set up)
alter table wishlists enable row level security;
create policy "Users manage their own wishlist"
  on wishlists for all using (auth.uid() = user_id);
