# Hamperia checkout setup

The site has wishlist, basket, delivery form and order history. `content/commerce-config.json` keeps payment disabled until the merchant setup below is complete. GitHub Pages hosts the public site; Supabase Edge Functions create and verify Razorpay orders with private keys.

1. Create a Razorpay merchant account and complete the required business verification. Start with **Test Mode** keys. In Razorpay settings, enable automatic payment capture for Orders API payments.
2. In the Supabase SQL Editor for project `gphkitnnjdqbxgwqtjpl`, run `supabase/commerce.sql` after the existing `schema.sql` and `registration.sql`. Rerun the catalogue seed at the end of that file whenever published prices change. Approved producer prices are read from `public.products` at checkout.
3. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` as **Supabase Edge Function secrets**. Keep the key secret and webhook secret out of this Git repository, browser code and chat messages. The public key ID is returned to the browser only when a checkout starts.
4. Deploy `create-checkout-order`, `verify-checkout-payment`, and `razorpay-webhook` Edge Functions from this repo. `supabase/config.toml` disables JWT enforcement only on the webhook; its raw request body is verified with the Razorpay webhook secret. The other two functions require a signed-in user and a completed Hamperia profile.
5. In Razorpay, add the webhook URL `https://gphkitnnjdqbxgwqtjpl.supabase.co/functions/v1/razorpay-webhook` for **payment.captured** and use the same webhook secret. Confirm webhook delivery in the Razorpay dashboard.
6. Test with Razorpay Test Mode: empty basket, invalid address, sign-in required, price changes, failed payment, captured payment, repeated webhook, browser closed after paying, order history, and the admin's **Mark fulfilled** action. Confirm the server total equals catalogue subtotal plus **₹99** shipping. Check product availability, contents and tax handling before live sales.
7. Set `"paymentsEnabled": true` in `content/commerce-config.json` and publish the site only after the test flow succeeds. Replace the test keys with live keys in Supabase secrets, then perform a small live transaction and confirm the order and webhook status.

The website must never create a Razorpay order directly or decide the charge from a browser-supplied price. `shop_orders` is written by Edge Functions; shoppers can only read their own orders through row-level security.
