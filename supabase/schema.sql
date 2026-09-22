-- Hamperia Solutions data model.
-- Run this in Supabase SQL Editor before using producer or admin dashboards.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text,
  role text not null default 'consumer' check (role in ('consumer', 'producer', 'admin')),
  requested_role text not null default 'consumer' check (requested_role in ('consumer', 'producer')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text not null default '',
  category text not null default 'hamper',
  price numeric(12,2) not null check (price >= 0),
  image_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  constraint products_name_is_meaningful check (length(trim(name)) >= 3),
  constraint products_description_is_meaningful check (length(trim(description)) >= 20),
  constraint products_price_is_positive check (price > 0)
);

create table if not exists public.tutorials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  youtube_url text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.tutorials enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'); $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role, requested_role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email), case when lower(new.email) = 'contact@hamperiasolutions.com' then 'admin' else 'consumer' end, case when lower(coalesce(new.raw_user_meta_data->>'account_type', 'consumer')) = 'producer' then 'producer' else 'consumer' end)
  on conflict (id) do update set email = excluded.email, display_name = excluded.display_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

drop policy if exists "Users can read their profile" on public.profiles;
create policy "Users can read their profile" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists "Admins can manage profiles" on public.profiles;
create policy "Admins can manage profiles" on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Users can request producer access" on public.profiles;
create policy "Users can request producer access" on public.profiles for update to authenticated using (id = auth.uid() and role = 'consumer') with check (id = auth.uid() and role = 'consumer' and requested_role in ('consumer', 'producer'));

drop policy if exists "Anyone can read approved products" on public.products;
create policy "Anyone can read approved products" on public.products for select to anon, authenticated using (status = 'approved' or producer_id = auth.uid() or public.is_admin());
drop policy if exists "Producers can submit products" on public.products;
create policy "Producers can submit products" on public.products for insert to authenticated with check (producer_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role in ('producer', 'admin')));
drop policy if exists "Producers can update pending products" on public.products;
create policy "Producers can update pending products" on public.products for update to authenticated using (producer_id = auth.uid() and status = 'pending') with check (producer_id = auth.uid() and status = 'pending');
drop policy if exists "Admins can review products" on public.products;
create policy "Admins can review products" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Anyone can read tutorials" on public.tutorials;
create policy "Anyone can read tutorials" on public.tutorials for select to anon, authenticated using (true);
drop policy if exists "Admins can manage tutorials" on public.tutorials;
create policy "Admins can manage tutorials" on public.tutorials for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.tutorials (title, description, youtube_url)
select 'How to build a gift hamper', 'A beginner-friendly guide to choosing a theme, arranging products and finishing the presentation.', 'https://www.youtube.com/results?search_query=how+to+make+a+gift+hamper'
where not exists (select 1 from public.tutorials where title = 'How to build a gift hamper');
insert into public.tutorials (title, description, youtube_url)
select 'Gift wrapping and ribbon finishing', 'Learn simple wrapping details that make a handmade gift feel beautifully complete.', 'https://www.youtube.com/results?search_query=gift+hamper+wrapping+ribbon+tutorial'
where not exists (select 1 from public.tutorials where title = 'Gift wrapping and ribbon finishing');

-- Registration completion migration
-- Run once after schema.sql, or rerun safely. Existing completed accounts and roles are preserved.
begin;
do $$
begin
  if not exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'registration_completed') then
    alter table public.profiles add column registration_completed boolean not null default false;
    -- One-time backfill for accounts that signed up with a password in the previous version.
    update public.profiles p set registration_completed = true from auth.users u
    where u.id = p.id and coalesce(u.encrypted_password, '') <> '' and length(trim(coalesce(p.display_name, ''))) > 0;
  end if;
end;
$$;
alter table public.profiles add column if not exists phone text not null default '';
alter table public.profiles add column if not exists business_name text not null default '';

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  kind text := coalesce(new.raw_user_meta_data->>'account_type', 'consumer');
  label text := trim(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''));
  business text := trim(coalesce(new.raw_user_meta_data->>'business_name', ''));
  completed boolean;
begin
  completed := coalesce(new.encrypted_password, '') <> ''
    and new.raw_user_meta_data->>'signup_submitted' = 'true'
    and length(label) between 1 and 100 and kind in ('consumer', 'producer')
    and (kind <> 'producer' or length(business) between 1 and 120);
  insert into public.profiles(id, email, display_name, role, requested_role, phone, business_name, registration_completed)
  values(new.id, new.email, left(label, 100),
    case when lower(new.email) = 'contact@hamperiasolutions.com' then 'admin' else 'consumer' end,
    case when kind = 'producer' then 'producer' else 'consumer' end,
    left(coalesce(new.raw_user_meta_data->>'phone', ''), 30), left(business, 120), coalesce(completed, false))
  on conflict(id) do nothing;
  return new;
end;
$$;

create or replace function public.complete_registration(p_display_name text, p_account_type text, p_phone text default '', p_business_name text default '')
returns void language plpgsql security definer set search_path = public
as $$
declare account auth.users%rowtype;
begin
  if auth.uid() is null then raise exception 'Please authenticate first'; end if;
  select * into account from auth.users where id = auth.uid();
  if coalesce(account.encrypted_password, '') = '' then raise exception 'Set your Hamperia password first'; end if;
  if account.email_confirmed_at is null then raise exception 'Confirm your email first'; end if;
  if p_display_name is null or length(trim(p_display_name)) not between 1 and 100 then raise exception 'Enter your name'; end if;
  if p_account_type is null or p_account_type not in ('consumer', 'producer') then raise exception 'Choose an account type'; end if;
  if length(coalesce(p_phone, '')) > 30 or length(coalesce(p_business_name, '')) > 120 then raise exception 'Profile details are too long'; end if;
  if p_account_type = 'producer' and length(trim(coalesce(p_business_name, ''))) = 0 then raise exception 'Enter your business name'; end if;
  update public.profiles set display_name = trim(p_display_name), requested_role = p_account_type,
    phone = trim(coalesce(p_phone, '')), business_name = case when p_account_type = 'producer' then trim(p_business_name) else '' end,
    registration_completed = true
  where id = auth.uid() and not registration_completed;
  if not found and not exists(select 1 from public.profiles where id = auth.uid() and registration_completed) then
    raise exception 'Your account profile is missing';
  end if;
end;
$$;
revoke all on function public.complete_registration(text, text, text, text) from public, anon;
grant execute on function public.complete_registration(text, text, text, text) to authenticated;

-- Members cannot grant themselves privileges or bypass registration by editing profile columns.
drop policy if exists "Users can request producer access" on public.profiles;
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin' and registration_completed); $$;

drop policy if exists "Producers can submit products" on public.products;
create policy "Producers can submit products" on public.products for insert to authenticated
with check (producer_id = auth.uid() and status = 'pending' and approved_at is null
and category in ('hamper', 'diy', 'return-gift')
and exists(select 1 from public.profiles where id = auth.uid() and role in ('producer','admin') and registration_completed));
drop policy if exists "Producers can update pending products" on public.products;
create policy "Producers can update pending products" on public.products for update to authenticated
using (producer_id = auth.uid() and status = 'pending'
and exists(select 1 from public.profiles where id = auth.uid() and role in ('producer','admin') and registration_completed))
with check (producer_id = auth.uid() and status = 'pending' and approved_at is null and category in ('hamper','diy','return-gift')
and exists(select 1 from public.profiles where id = auth.uid() and role in ('producer','admin') and registration_completed));
commit;
