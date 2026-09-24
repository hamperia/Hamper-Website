-- Run after schema.sql and registration.sql. Payment secrets never belong in SQL or the website.
create table if not exists public.catalog_products (
  slug text primary key,
  name text not null,
  price_paise integer not null check (price_paise > 0),
  active boolean not null default true
);

create table if not exists public.wishlist_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_key text not null check (length(product_key) between 3 and 120),
  created_at timestamptz not null default now(),
  primary key (user_id, product_key)
);

create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'payment_pending' check (status in ('payment_pending','paid','payment_failed','fulfilled','cancelled','refunded')),
  currency text not null default 'INR' check (currency = 'INR'),
  subtotal_paise integer not null check (subtotal_paise > 0),
  shipping_paise integer not null check (shipping_paise = 9900),
  total_paise integer not null check (total_paise = subtotal_paise + shipping_paise),
  delivery_address jsonb not null,
  gift_note text,
  payment_provider text not null default 'razorpay' check (payment_provider in ('razorpay','payu')),
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  payu_txn_id text unique,
  payu_payment_id text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- Safe to run when the earlier Razorpay-only commerce table already exists.
alter table public.shop_orders add column if not exists payment_provider text not null default 'razorpay';
alter table public.shop_orders add column if not exists payu_txn_id text unique;
alter table public.shop_orders add column if not exists payu_payment_id text unique;
alter table public.shop_orders alter column razorpay_order_id drop not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'shop_orders_provider_reference_check') then
    alter table public.shop_orders add constraint shop_orders_provider_reference_check check (
      (payment_provider = 'razorpay' and razorpay_order_id is not null and payu_txn_id is null) or
      (payment_provider = 'payu' and payu_txn_id is not null and razorpay_order_id is null)
    );
  end if;
end $$;

create table if not exists public.shop_order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.shop_orders(id) on delete cascade,
  product_key text not null,
  name text not null,
  quantity integer not null check (quantity between 1 and 10),
  unit_price_paise integer not null check (unit_price_paise > 0),
  line_total_paise integer generated always as (quantity * unit_price_paise) stored
);

create table if not exists public.shop_webhook_events (
  event_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists shop_orders_user_created_idx on public.shop_orders(user_id, created_at desc);
create index if not exists shop_order_items_order_idx on public.shop_order_items(order_id);
alter table public.catalog_products enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.shop_orders enable row level security;
alter table public.shop_order_items enable row level security;
alter table public.shop_webhook_events enable row level security;

drop policy if exists "Read active catalogue" on public.catalog_products;
create policy "Read active catalogue" on public.catalog_products for select to anon, authenticated using (active);
drop policy if exists "Own wishlist" on public.wishlist_items;
create policy "Own wishlist" on public.wishlist_items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Read own orders" on public.shop_orders;
create policy "Read own orders" on public.shop_orders for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "Read own order items" on public.shop_order_items;
create policy "Read own order items" on public.shop_order_items for select to authenticated using (exists (select 1 from public.shop_orders where id = order_id and (user_id = auth.uid() or public.is_admin())));
-- Inserts and payment status changes are made only by Edge Functions with the service key.

create or replace function public.mark_order_fulfilled(p_order_id uuid)
returns boolean language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  update public.shop_orders set status = 'fulfilled' where id = p_order_id and status = 'paid';
  return found;
end;
$$;
revoke all on function public.mark_order_fulfilled(uuid) from public;
grant execute on function public.mark_order_fulfilled(uuid) to authenticated;

-- Snapshot of current published catalogue prices. Re-run when product prices change.
insert into public.catalog_products (slug,name,price_paise,active) values
('golden-luxury-celebration','Golden Luxury Celebration',250000,true),
('festive-wedding-delight','Festive & Wedding Delight',320000,true),
('executive-corporate-box','Executive Corporate Box',180000,true),
('welcome-kit-signature-2999','Signature Welcome Kit',299900,true),
('welcome-kit-premium-1899','Premium Welcome Kit',189900,true),
('welcome-kit-essential-999','Essential Welcome Kit',99900,true),
('diwali-premium-3499-green','Diwali Premium Hamper — Green',349900,true),
('diwali-premium-3499-wine','Diwali Premium Hamper — Wine',349900,true),
('diwali-celebration-2499','Diwali Celebration Hamper',249900,true),
('diwali-thoughtful-1499','Diwali Thoughtful Hamper',149900,true),
('dry-fruit-two-jar-box','Two-Jar Dry Fruit Box',69900,true),
('dry-fruit-three-jar-box','Three-Jar Dry Fruit Box',109900,true),
('dry-fruit-four-jar-box','Four-Jar Dry Fruit Box',149900,true),
('pinewood-crate','Pinewood Crate',35000,true),
('gold-tulle-wrap','Gold Tulle Net Wrapping',25000,true),
('paper-filler','Shredded Paper Filler',15000,true),
('tags-and-ribbons','Custom Tags & Satin Ribbons',10000,true)
on conflict (slug) do update set name=excluded.name, price_paise=excluded.price_paise, active=excluded.active;
