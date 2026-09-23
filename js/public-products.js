(function () {
  'use strict';
  const section = document.querySelector('[data-approved-products]');
  if (!section || !window.hamperia) return;
  const grid = section.querySelector('.products');
  const category = section.dataset.approvedProducts;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const safeImage = (value) => /^https?:\/\//i.test(value || '') ? escapeHtml(value) : '../assets/home_page.jpeg';
  window.hamperia.ready.then(async () => {
    if (!window.hamperia.client) return;
    const { data, error } = await window.hamperia.client.from('products').select('id, name, description, category, price, image_url').eq('status', 'approved').eq('category', category).order('approved_at', { ascending: false });
    if (error) throw error;
    if (!data?.length) return;
    grid.innerHTML = data.map((product) => `<article class="product"><div class="image-frame"><img src="${safeImage(product.image_url)}" alt="${escapeHtml(product.name)}" loading="lazy" width="600" height="500"></div><div class="product-body"><p class="eyebrow">Approved producer product</p><h2>${escapeHtml(product.name)}</h2><p class="price">₹${Number(product.price || 0).toLocaleString('en-IN')}</p><p class="product-description">${escapeHtml(product.description)}</p><div class="commerce-actions"><button class="wish-button" type="button" data-wish-key="maker:${escapeHtml(product.id)}" data-product-name="${escapeHtml(product.name)}" aria-label="Add to wishlist">♡</button><button class="add-button" type="button" data-cart-key="maker:${escapeHtml(product.id)}">Add to cart</button></div></div></article>`).join('');
    section.hidden = false;
  }).catch(() => {
    section.hidden = false;
    grid.textContent = 'Maker products could not be loaded. Please refresh to try again.';
  });
}());
