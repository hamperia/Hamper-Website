-- Apply before deploying the updated create-checkout-order Edge Function.
-- Existing order access policies continue to protect these per-item details.
alter table public.shop_order_items
  add column if not exists personalisation jsonb not null default '{}'::jsonb;
