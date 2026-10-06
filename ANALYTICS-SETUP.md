# Hamperia Google Analytics 4 setup

The storefront now has GA4 page-view and shopping-event hooks. Collection and product browsing, wishlist and basket actions, checkout starts, verified purchases, email enquiries, search usage, account sign-in/sign-up, and hamper-builder steps are measured without sending email addresses, passwords, gift messages, delivery details, or search text.

## Create the property and web stream

1. Open [Google Analytics](https://analytics.google.com/analytics/web/) and complete Google's sign-in check if prompted.
2. Create an Analytics account named **Hamperia Solutions** if you do not already have one.
3. Create a GA4 property named **Hamperia website**. Choose **India** for the reporting time zone and **Indian Rupee (INR)** for currency.
4. Add a **Web** data stream for `https://hamperiasolutions.com` and name it **Hamperia website**. Keep Enhanced measurement enabled for standard page engagement measurements.
5. Copy the **Measurement ID** shown in the stream details. It starts with `G-`.

Google documents this setup as creating a GA4 property, adding a web stream, and copying its Measurement ID from Stream Details: [Set up Analytics for a website](https://support.google.com/analytics/answer/14183469). Recommended ecommerce events follow Google's `view_item`, `add_to_cart`, `remove_from_cart`, `begin_checkout` and `purchase` conventions: [Measure ecommerce](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce).

## Connect and verify

The Hamperia Measurement ID is already set in `js/analytics-config.js`:

```js
window.HAMPERIA_GA_MEASUREMENT_ID = 'G-DBX40DVZ60';
```

Then rebuild the static pages with `npm run build`, publish the updated files to GitHub Pages, and check **Reports → Realtime** in Analytics. The Measurement ID is intended to appear in public website code; keep account passwords and any API secrets private.

The purchase event is sent only after the existing checkout flow verifies a successful payment. Since payment providers are not configured yet, purchase and revenue reports will remain empty until live payments are enabled and verified.
