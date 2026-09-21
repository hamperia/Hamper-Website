#!/usr/bin/env bash
set -euo pipefail
# Run from any directory. CURL_BIN can override curl on Windows.
cd "$(dirname "$0")"
if [[ -d dist ]]; then cd dist; fi
mkdir -p assets
fetch() {
  local name="$1" photo="$2" width="${3:-800}"
  local url="https://images.unsplash.com/${photo}?q=80&w=${width}&auto=format&fit=crop"
  if [[ "$photo" == https://* ]]; then url="$photo"; fi
  if ! "${CURL_BIN:-curl}" --fail --location --retry 2 --connect-timeout 20 "$url" -o "assets/${name}.tmp"; then
    # Fallback for Windows installations whose curl cannot access TLS credentials.
    node -e 'const fs=require("fs"); fetch(process.argv[1]).then(async r=>{if(!r.ok)throw Error("HTTP "+r.status);fs.writeFileSync(process.argv[2],Buffer.from(await r.arrayBuffer()));}).catch(e=>{console.error(e.message);process.exit(1)})' "$url" "assets/${name}.tmp"
  fi
  mv "assets/${name}.tmp" "assets/${name}"
}
fetch hero-banner.jpg photo-1513885535751-8b9238bd345a 1600
fetch category-hampers.jpg 'https://images.pexels.com/photos/27393960/pexels-photo-27393960/free-photo-of-present-basket-with-a-ribbon-champagne-and-chocolate-sweets-on-a-dark-background.jpeg?auto=compress&w=1200'
fetch category-diy.jpg 'https://images.pexels.com/photos/4721998/pexels-photo-4721998.jpeg?auto=compress&w=1200'
fetch category-bulk.jpg photo-1512909006721-3d6018887383
fetch hamper-golden.jpg 'https://images.pexels.com/photos/27393960/pexels-photo-27393960/free-photo-of-present-basket-with-a-ribbon-champagne-and-chocolate-sweets-on-a-dark-background.jpeg?auto=compress&w=1200'
fetch hamper-festive.jpg photo-1513885535751-8b9238bd345a
fetch hamper-corporate.jpg photo-1512909006721-3d6018887383
fetch diy-tray.jpg 'https://images.pexels.com/photos/11188238/pexels-photo-11188238.jpeg?auto=compress&w=1200'
fetch diy-net.jpg photo-1683140426885-6c0ce899409c
fetch diy-filler.jpg 'https://images.pexels.com/photos/18372328/pexels-photo-18372328/free-photo-of-close-up-of-shredded-paper.jpeg?auto=compress&w=1200'
fetch diy-tags.jpg 'https://images.pexels.com/photos/4721998/pexels-photo-4721998.jpeg?auto=compress&w=1200'
printf 'Image downloads complete.\n'
