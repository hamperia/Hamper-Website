# Hamperia checkout setup

The basket, wishlist, checkout form, and order history are ready for testing. Live payment remains disabled in `content/commerce-config.json` until a merchant account, server secrets, and end-to-end test transactions are available. GitHub Pages serves the public files; Supabase Edge Functions create orders and verify payments. Never put merchant secrets in this repository or the browser.

## Shared setup

1. In the Supabase SQL Editor for project `gphkitnnjdqbxgwqtjpl`, run `supabase/commerce.sql` after `schema.sql` and `registration.sql`. This also upgrades an earlier Razorpay-only `shop_orders` table for PayU. Keep the catalogue seed in that file aligned with every published product price. Approved producer prices are read from `public.products` at checkout.
2. Deploy `create-checkout-order` and `verify-checkout-payment`. A signed-in user with a completed Hamperia profile is required to create an order. The server reads product prices from the database and adds flat ₹99 shipping.
3. Test sign-in, saved basket and wishlist, unavailable products, invalid addresses, price changes, payment failure, payment success, order history, and the admin **Mark fulfilled** action. Confirm that each order total matches the server catalogue subtotal plus ₹99. Decide tax treatment and confirm product contents before accepting live orders.
4. Enable a provider individually in `content/commerce-config.json` only after its test flow works. `paymentsEnabled` must also be `true`. Do not enable a provider merely because its button appears on the checkout page.

## Razorpay

1. Create and verify a Razorpay merchant account. Start in Test Mode and enable automatic capture for Orders API payments.
2. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` as Supabase Edge Function secrets.
3. Deploy `razorpay-webhook`. Configure `https://gphkitnnjdqbxgwqtjpl.supabase.co/functions/v1/razorpay-webhook` in Razorpay for the `payment.captured` event, using the same webhook secret. Its raw request body is verified server-side.
4. Run test payments, including interrupted browser returns and repeated webhooks. Check the payment and order status in both systems. Then enable `providers.razorpay` and `paymentsEnabled` and publish. Replace test keys with live keys only after the test flow succeeds, and verify a small live payment.

## PayU India

1. Create and verify a PayU India merchant account. Obtain test merchant key and salt. Set `PAYU_KEY`, `PAYU_SALT`, and `PAYU_MODE=test` as Supabase Edge Function secrets. For live use, set live credentials and `PAYU_MODE=live`.
2. Deploy `payu-return` and `payu-webhook` along with `create-checkout-order`. The browser is sent to PayU Hosted Checkout. Both callbacks validate the response hash and call PayU's Verify Payment API before recording a paid order. The public callback URL is `https://gphkitnnjdqbxgwqtjpl.supabase.co/functions/v1/payu-return`; configure the PayU webhook URL as `https://gphkitnnjdqbxgwqtjpl.supabase.co/functions/v1/payu-webhook` when the merchant dashboard offers payment webhooks. `supabase/config.toml` disables JWT enforcement for these signed gateway callbacks.
3. Run a complete PayU test payment, failure, and browser-return flow. Check the order amount and payment status in both PayU and Supabase. Then enable `providers.payu` and `paymentsEnabled` and publish. Do not switch `PAYU_MODE` to live until the live credentials and a small live transaction have been checked.

The website cannot activate either provider without merchant credentials. Keep both provider flags `false` until onboarding and verification are complete.
