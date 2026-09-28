# Hamperia storefront preview

This is a local review build. No commit, push, database migration or payment activation was performed.

## Review routes

- `/`: photographic hero, six discovery categories, recipient/budget finder, three personalised hampers, four-card Diwali rail, hamper-making story and corporate enquiry.
- `/products/diwali-celebration-2499/`: studio image and original artwork gallery, contents, quantity, personalisation, basket and checkout links, related products.
- `/hamperia/`: account-scoped hamper choices, removable items, design links, personalisation and separate assembled/DIY paths.
- `/bulk-orders/`: company, quantity, budget, delivery, artwork link and gift message; prepare an email or download the brief.
- `/tutorials/`: existing video area plus supply combinations with stock-checked bundle additions.

## Behaviour

Gift messages, recipient names, logo links and preferences are saved per account in this browser. They clear from the visible form on sign-out and return for the same account. Personalisation applies to every unit of the same basket product; separate messages per unit are not yet supported. Product and builder enquiries include these details. Logo files use an accessible HTTPS sharing link; direct private uploads are not implemented.

The builder's design link contains only product choices, never a recipient, message or logo. Import requires sign-in and an explicit click. Its supplies subtotal covers only individually listed matching supplies; unlisted contents and assembly require a quote. No automatic photorealistic rendering of an arbitrary selection is claimed.

The bulk form prepares an email; it does not submit to a backend, create an order or send an email automatically. Customers must review and send from their email app. A downloadable text brief is provided.

## Photography

Seven generated studio presentations replace the promotional posters on product cards. The originals remain in the product galleries. Each new WebP is 1200 × 1200 and approximately 120–205 KB. They are labelled illustrative and need business approval against real products before publishing. The legacy `diwali-premium-3499-wine` URL is preserved, but its visible colour name is corrected to Taupe to match the supplied reference.

Image filenames and exact generation prompts are recorded in `content/studio-photo-prompts.json`. No competitor photos were copied. The Gift Studio informed the product gallery and detail hierarchy; Dream a Dozen's published storefront content informed the occasion/budget discovery and distinct corporate enquiry path. Its live browser page timed out during review. Real customer reviews, verified client logos, unboxing videos and fulfilment guarantees still need business-supplied material.

## Before activating checkout

Razorpay and PayU remain disabled. This preview does not charge customers or place orders.

1. Apply `supabase/migrations/20260928_order_personalisation.sql` to add private per-item order details under existing order access policies.
2. Deploy the updated `create-checkout-order` function and its shared personalisation validator.
3. Configure merchant test credentials and complete sandbox payment, verification, failure and webhook tests before enabling live payment.
4. Confirm packaging dimensions, food labels, branding costs, delivery serviceability/timelines and real stock.

Requests containing custom logo artwork or changed colours/sizes/contents are quote-only. Both frontend and server validation prevent charging the unchanged catalogue price for these requests.

## Local commands

From this `dist` directory:

```powershell
node scripts/build-storefront.cjs
node --test tests/*.test.cjs
node scripts/serve.cjs
```

Preview: http://127.0.0.1:4173/
