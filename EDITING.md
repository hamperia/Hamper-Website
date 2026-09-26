# Editing Hamperia

This directory is the website repository. GitHub Pages serves the HTML, CSS, JavaScript and images directly; it does not run a Node server.

## Where to edit

- `scripts/build-storefront.cjs`: shared navigation/footer, homepage, collection descriptions, product catalogue and blog articles. Add or edit entries here, then regenerate the pages.
- `css/storefront.css`: current colours, spacing and responsive storefront layout.
- `assets/`: images. The homepage uses `personalised-gift-hamper-inspiration.webp`; the shared header uses `hamperia-solutions-logo.webp`.
- `auth/index.html` and `auth/signup/index.html`: sign-in and signup forms.
- `js/auth.js`: authentication and saved-profile handling.
- `admin/index.html`, `js/catalog-admin.js`, `css/catalog-admin.css`: the contact account's product, image, tag, price and stock editor.
- `supabase/catalog-management.sql`: admin-only catalogue permissions, image storage and starting inventory.
- `content/seo-map.csv`: generated mapping of collections/articles to URLs and topics.
- `js/commerce.js`, `js/shopping-state.js`, `css/commerce.css`: account-scoped wishlist and basket, checkout and order history.
- `js/hamper-builder.js`, `css/hamper-builder.css`: the three-step DIY builder, live illustrative preview, collection galleries and merchandise tiles. Builder choices currently request a quote because most component prices are not set.
- `content/commerce-config.json`: ₹99 shipping display and payment activation flag. See `CHECKOUT_SETUP.md` before changing the flag.

From this directory, run `node scripts/build-storefront.cjs` after editing generated content. Generated HTML can also be edited directly, but the next build will overwrite those edits. The generator preserves the functional forms in account, auth, admin, producer, tutorials and bulk-orders pages while updating their shared navigation.

## Preview and publication

Run `node scripts/serve.cjs` from this directory, then open http://127.0.0.1:4173/. Refresh after saving. Run `node --test tests/*.test.cjs` for the unit and local route checks. Preview changes before pushing this repository to GitHub. Keep `CNAME` set to `hamperiasolutions.com`.

Review `git diff` and `git status` before committing. Include the generated pages, assets, CSS and JavaScript in the same commit. The current changes have not been deployed by this build.

## Authentication setup

The frontend contains only the Supabase public publishable key. Never add a service-role key or Google client secret to this directory.

Supabase must allow the local and production callback URLs, including `/auth/callback/`. Google OAuth returns there, verifies the session, checks the saved profile and either finishes signup, reports failure, or returns a completed member to the homepage. Email confirmation is a separate Supabase Auth setting.

The database schema and registration migration are in `supabase/`. Run `supabase/catalog-management.sql` after `schema.sql`, `registration.sql` and `commerce.sql` before using the admin catalogue form. It restricts catalogue edits and image uploads to `contact@hamperiasolutions.com`, even if someone changes the browser code. Google sign-in may create an Auth identity; it does not count as a completed Hamperia registration until the required profile and password have been saved. New signups are customer accounts; producer submissions are paused.

In the admin dashboard, choose **Edit** to set an existing product's current image, price, stock, contents and collection tags. To add a product, enter its name, unique URL slug, description, contents, price, quantity and product type, upload a PNG/JPG/WebP photo, choose at least one collection, then save. All current catalogue products start with **10 units each**; replace these provisional counts with actual stock before accepting orders. The contact email must first complete a Hamperia sign-up to activate admin access. A new product appears in its tagged collection and uses a generic product detail URL. Keep `content/catalogue.json` and generated static pages in sync for search-engine metadata when an important new product is added. Collection inspiration cards without a price are enquiry concepts, not products that can be added to the basket.

## Current boundaries

- Listed catalogue prices are treated as final for the stated product configuration. Flat ₹99 shipping is added at checkout. Custom changes need a separate quote; catalogue images represent presentation inspiration. The ₹699/₹1,099/₹1,499 dry-fruit boxes need final jar sizes, net weights and assortment confirmed before payment is enabled.
- Product enquiries open an email draft. Bulk enquiries also require the visitor to send the draft; the website does not claim it sent an email or store a lead automatically.
- Producer submissions and role assignment are paused. Only the contact admin can save published catalogue details through the dashboard. Earlier producer submissions remain in the database but are not shown as public catalogue cards.
- Blogs are currently generated static pages, edited in the build script; there is no database-backed blog editor yet.
- Wishlist and basket are hidden when signed out, saved per signed-in account in this browser, and restored when that account returns. The wishlist also syncs to Supabase after the commerce SQL migration; the basket and builder choices do not sync across devices. Signed-out visitors are asked to sign in before adding products or choosing builder items.
- Online checkout is deliberately disabled until Razorpay or PayU India onboarding, Supabase migration/function deployment, stock handling and payment tests in `CHECKOUT_SETUP.md` are complete. The server refuses checkout when stock has not been confirmed.
- Successful Google signup, profile persistence, and sign-out/relogin must be checked with the account owner before production publication. Automated mocked tests are not a substitute for that account-level check.

## Product collections and images

The welcome-kit collection lives at `employee-welcome-kits/` and its only subcategory is `onboarding-kits/`. Existing static product names, descriptions and fallback images are listed in `scripts/build-storefront.cjs`; admin edits in Supabase take precedence for public visitors. Diwali products are tagged to appear in the appropriate Diwali and corporate Diwali collections. The Dry Fruit Hampers page contains only the two-jar, three-jar and four-jar boxes. A future product can appear there only when the admin marks it as a dry-fruit box and selects that collection. The supplied image graphics contain promotional text, so product cards and detail pages preserve the artwork with contain sizing. Custom Gift Boxes and New Joinee Kits routes are removed during rebuild.

`hamperia/` is the DIY builder and supply store; welcome kits stay in their employee-gifting collection. The builder lets visitors remove individual choices or clear all, then request a quote for an assembled hamper or open matching individually listed supplies to add them to the basket. Choices without a standalone product listing are labelled as such. The header, footer and page breadcrumbs link to home and broader collections. Chocolate, wellness and merchandise concept visuals are quote-only until exact contents and prices are supplied. The former `bulk-gifting/` and `bulk-diwali-gifts/` pages redirect to their broader active collections and are omitted from navigation and the sitemap.
