# Hamperia Solutions

A four-page static website for hampers, DIY gifting supplies and bulk event inquiries.

## GitHub Pages

The downloadable ZIP already has the correct repository layout: upload its extracted contents to the root of `hamperia/Hamper-Website`. In the local working copy, the same website files are inside `dist`. Keep `assets`, `css`, `js`, `hampers`, `diy-supplies` and `bulk-orders` as folders. Include `.nojekyll`.

In repository **Settings → Pages**, select **Deploy from a branch**, choose **main** and **/(root)**, then save. GitHub currently requires this account to upgrade or make the repository public before enabling Pages.

The expected address after a successful deployment is `https://hamperia.github.io/Hamper-Website/`.

## Editing

- `index.html`: homepage.
- `hampers/index.html`: hamper catalog, INR and indicative USD prices.
- `diy-supplies/index.html`: supply catalog.
- `bulk-orders/index.html`: inquiry form.
- `css/style.css`: shared colors, fonts and responsive layouts.
- `js/main.js`: mobile menu, form validation and email draft generation.
- `assets/`: local stock photographs.

No build tools or backend server are required. For local development, serve the folder containing `index.html` with a local static HTTP server. All links are relative and work under the GitHub repository subpath.

## Images

Run `bash download-images.sh` to refresh the images. The script uses curl and falls back to Node.js if curl fails (for example, Windows TLS credential errors). The downloaded files are already included, so running the script is optional.

Broken supplied links and unrelated photographs were replaced with relevant stock images. See `IMAGE-CREDITS.md`. These are illustrative stock photographs, not verified photographs of the exact products; catalog pages disclose that. Replace them with actual product photography when available. The brand uses a typographic H monogram because no original logo was provided.

## Ordering

Buy Now and Order Supplies open a prefilled email to `contact@hamperiasolutions.com`. Bulk inquiries validate required fields, a future/current event date, at least 25 units and at least ₹350 per unit, then open a populated email draft. The customer must send that draft from their configured email app. There is no payment processing, automatic email service, stock tracking or order database.

Google Fonts supplies Playfair Display and Poppins; local serif/sans-serif fallbacks remain usable if the font service is unavailable.
