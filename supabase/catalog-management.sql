-- Run after schema.sql, registration.sql, and commerce.sql.
-- The contact account is the only catalogue administrator.
update public.profiles set role = 'admin'
where lower(email) = 'contact@hamperiasolutions.com';

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and registration_completed
      and lower(email) = 'contact@hamperiasolutions.com'
  );
$$;

-- Product-host submissions are paused. Existing submissions remain for review.
drop policy if exists "Producers can submit products" on public.products;
drop policy if exists "Producers can update pending products" on public.products;

create table if not exists public.catalog_products (
  slug text primary key,
  name text not null,
  price_paise integer not null check (price_paise > 0),
  active boolean not null default true
);
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
on conflict (slug) do nothing;

alter table public.catalog_products add column if not exists description text not null default '';
alter table public.catalog_products add column if not exists contents text[] not null default '{}';
alter table public.catalog_products add column if not exists image_url text;
alter table public.catalog_products add column if not exists collection_tags text[] not null default '{}';
alter table public.catalog_products add column if not exists product_type text not null default 'hamper';
alter table public.catalog_products add column if not exists stock_quantity integer;
alter table public.catalog_products enable row level security;

-- Initial counts supplied by the owner. Re-running leaves later stock edits intact.
update public.catalog_products set stock_quantity = coalesce(stock_quantity, 10);
update public.catalog_products
set product_type = 'dry_fruit_box',
    collection_tags = case when cardinality(collection_tags) = 0
      then array['dry-fruit-hampers','gift-hampers','employee-gifts','client-gifts','corporate-gifting']
      else collection_tags end
where slug in ('dry-fruit-two-jar-box','dry-fruit-three-jar-box','dry-fruit-four-jar-box');

update public.catalog_products set product_type = 'welcome_kit'
where slug like 'welcome-kit-%' and product_type = 'hamper';
update public.catalog_products set product_type = 'diy_supply'
where slug in ('pinewood-crate','gold-tulle-wrap','paper-filler','tags-and-ribbons') and product_type = 'hamper';
update public.catalog_products set collection_tags = array_remove(collection_tags, 'dry-fruit-hampers')
where product_type <> 'dry_fruit_box' and 'dry-fruit-hampers' = any(collection_tags);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'catalog_stock_nonnegative') then
    alter table public.catalog_products add constraint catalog_stock_nonnegative
      check (stock_quantity is null or stock_quantity >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'catalog_type_allowed') then
    alter table public.catalog_products add constraint catalog_type_allowed
      check (product_type in ('hamper','dry_fruit_box','welcome_kit','diy_supply','merchandise'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'catalog_dry_fruit_only') then
    alter table public.catalog_products add constraint catalog_dry_fruit_only
      check (not ('dry-fruit-hampers' = any(collection_tags)) or product_type = 'dry_fruit_box');
  end if;
end $$;

drop policy if exists "Read active catalogue" on public.catalog_products;
create policy "Read active catalogue" on public.catalog_products for select to anon, authenticated
using (active or public.is_admin());
drop policy if exists "Only contact admin edits catalogue" on public.catalog_products;
create policy "Only contact admin edits catalogue" on public.catalog_products for all to authenticated
using (public.is_admin()) with check (public.is_admin());
revoke insert, update, delete on public.catalog_products from anon;
grant select on public.catalog_products to anon, authenticated;
grant insert, update, delete on public.catalog_products to authenticated;

-- Public product photos, with uploads and removal restricted to the contact admin.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Contact admin uploads product images" on storage.objects;
create policy "Contact admin uploads product images" on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "Contact admin updates product images" on storage.objects;
create policy "Contact admin updates product images" on storage.objects for update to authenticated
using (bucket_id = 'product-images' and public.is_admin())
with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "Contact admin removes product images" on storage.objects;
create policy "Contact admin removes product images" on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and public.is_admin());
