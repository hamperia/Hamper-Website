# Hamperia search setup

Run `npm run build` after changing the catalogue or page generator, then `npm test` before publishing. Commit and push the generated files to the GitHub Pages branch.

## Google Search Console — account owner

1. Open https://search.google.com/search-console and add a Domain property for `hamperiasolutions.com`.
2. Copy Google's verification TXT value. In Squarespace domain DNS, add a TXT record at `@` with that exact value. Keep the existing Google Workspace MX, SPF and DKIM records.
3. Return to Search Console and verify after DNS updates. Keep the verification record.
4. Submit `https://hamperiasolutions.com/sitemap.xml` under Sitemaps.
5. Inspect the homepage, corporate gifting, corporate Diwali and employee welcome-kit URLs. Use Test Live URL, then request indexing once the new deployment is live.
6. Review indexing errors and search queries in Search Console. Resolve specific errors before repeatedly requesting indexing.

## Content maintenance

- Core metadata and structured data: `scripts/seo.cjs`.
- Collection copy, products and original guides: `scripts/build-storefront.cjs`.
- Additional guides: `content/seo-articles.json`.
- Image conversion: `scripts/optimize-images.py` (requires Python with Pillow). Source originals remain in assets. The manifest records the generated filenames, dimensions and sizes; use those WebP filenames in new content.
- Sitemap and catalogue are generated. Do not edit them directly.
- New products need public static product pages to be included in the sitemap. Admin-only database additions currently use a dynamic noindex detail page; add them to the static build before expecting indexing.

Product schema intentionally omits purchase offers while payment setup is incomplete. When checkout becomes available, generate offers from current prices and stock, including verified shipping/return terms. Do not assume the initial stock count is current.

Review blog product facts whenever the catalogue changes. Do not invent publication dates, reviews, ratings or service claims. Never block images, styles or scripts needed to render public pages in robots.txt. Private data still requires authentication and database permissions.
