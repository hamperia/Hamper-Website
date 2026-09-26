"""Run with Python and Pillow. Originals are kept for future editing."""
from pathlib import Path
import json
from PIL import Image, ImageOps

root = Path(__file__).resolve().parent.parent
names = {
 'home_page':'personalised-gift-hamper-inspiration', 'logo':'hamperia-solutions-logo',
 'diwali-2499':'premium-corporate-diwali-gift-hamper-2499',
 'diwali-1499':'diwali-dry-fruit-chocolate-candle-hamper-1499',
 'diwali-1499-wine':'wine-diwali-dry-fruit-chocolate-hamper-1499',
 'diwali-3499-green':'green-premium-diwali-gift-hamper-3499',
 'diwali-3499-wine':'wine-premium-diwali-gift-hamper-3499',
 'welcome-kit-999':'essential-employee-welcome-kit-999',
 'welcome-kit-1899':'premium-employee-welcome-kit-1899',
 'welcome-kit-2999':'signature-employee-welcome-kit-2999',
 'builder-coffee':'coffee-gift-for-hamper', 'builder-journal':'hardcover-journal-for-gift-hamper',
 'builder-bottle':'reusable-water-bottle-gift', 'builder-tumbler':'insulated-tumbler-gift',
 'builder-round-box':'round-gift-box-for-hamper', 'builder-magnetic-box':'magnetic-closure-gift-box',
 'dry-fruit-two-jar':'two-glass-jar-dry-fruit-gift-box-699',
 'dry-fruit-three-jar':'three-glass-jar-dry-fruit-gift-box-1099',
 'dry-fruit-four-jar':'four-glass-jar-dry-fruit-gift-box-1499',
 'golden-luxury-celebration-v2':'golden-chocolate-candle-celebration-hamper',
 'festive-wedding-delight-v2':'festive-wedding-dry-fruit-chocolate-hamper',
 'executive-corporate-box-v2':'executive-corporate-planner-coffee-gift-box',
 'category-diy':'creative-gift-wrapping-inspiration', 'category-bulk':'corporate-gift-presentation',
 'category-hampers':'curated-gift-hamper-presentation',
 'diy-tray':'hamper-base-presentation-inspiration', 'diy-net':'gift-wrapping-presentation-inspiration',
 'diy-filler':'gift-filler-presentation-inspiration', 'diy-tags':'gift-tag-presentation-inspiration'
}
report = []
for source in sorted((root/'assets').iterdir()):
 if source.suffix.lower() not in ('.png','.jpg','.jpeg'): continue
 target = source.with_name(names.get(source.stem, source.stem)+'.webp')
 with Image.open(source) as original:
  im = ImageOps.exif_transpose(original).convert('RGBA' if 'A' in original.getbands() else 'RGB')
  im.thumbnail((256,256) if source.stem == 'logo' else (1600,1600), Image.Resampling.LANCZOS)
  im.save(target,'WEBP',quality=86,method=6)
 report.append(dict(source=source.name,image=target.name,width=im.width,height=im.height,before=source.stat().st_size,after=target.stat().st_size))
(root/'content/image-manifest.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'images':len(report),'before':sum(i['before'] for i in report),'after':sum(i['after'] for i in report)}))
