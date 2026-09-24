(() => {
  'use strict';
  const types = new Set(['hamper', 'dry_fruit_box', 'welcome_kit', 'diy_supply', 'merchandise']);
  function validate(item) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug || '') || item.slug.length > 100) return 'Enter a valid URL slug.';
    if (!item.name || item.name.length > 120) return 'Enter a product name under 120 characters.';
    if (!item.description || item.description.length < 20 || item.description.length > 1200) return 'Enter a description between 20 and 1200 characters.';
    if (!Number.isSafeInteger(item.pricePaise) || item.pricePaise <= 0 || !Number.isSafeInteger(item.stock) || item.stock < 0) return 'Enter a valid price and whole-number stock quantity.';
    if (!types.has(item.type)) return 'Choose a valid product type.';
    if (!Array.isArray(item.tags) || !item.tags.length) return 'Choose at least one collection.';
    if (item.tags.includes('dry-fruit-hampers') && item.type !== 'dry_fruit_box') return 'Only dry-fruit boxes belong in the Dry Fruit Hampers collection.';
    if (['hamper', 'dry_fruit_box', 'welcome_kit'].includes(item.type) && (!Array.isArray(item.contents) || !item.contents.length)) return 'List what comes inside this product.';
    return null;
  }
  if (typeof module === 'object' && module.exports) module.exports = { validate };
  if (typeof window !== 'undefined') window.hamperiaCatalogRules = { validate };
})();
