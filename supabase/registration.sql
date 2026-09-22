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
