(() => {
  'use strict';
  const panel = document.querySelector('[data-catalog-admin]');
  if (!panel || !window.hamperia) return;
  const form = panel.querySelector('[data-catalog-form]');
  const list = panel.querySelector('[data-catalog-list]');
  const status = panel.querySelector('[data-catalog-status]');
  const tagsBox = panel.querySelector('[data-catalog-tags]');
  const site = new URL('../', document.currentScript.src);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const money = paise => `₹${(Number(paise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  let staticProducts = new Map();
  let records = new Map();
  let categories = [];
  let loaded = false;
  const admin = () => window.hamperia.state.role === 'admin' &&
    window.hamperia.state.user?.email?.toLowerCase() === 'contact@hamperiasolutions.com';

  function show(message, error = false) {
    status.textContent = message;
    status.className = `form-status ${error ? 'error' : 'success'}`;
  }
  const displayProduct = slug => {
    const row = records.get(slug) || {};
    const fallback = staticProducts.get(slug) || {};
    return { ...fallback, ...row, slug,
      description: row.description || fallback.description || '',
      contents: row.contents?.length ? row.contents : fallback.contents || [],
      image_url: row.image_url || (fallback.image ? new URL(`assets/${fallback.image}`, site).href : ''),
      collection_tags: row.collection_tags?.length ? row.collection_tags : fallback.tags || [],
      product_type: (!row.product_type || row.product_type === 'hamper') && slug.startsWith('dry-fruit-') ? 'dry_fruit_box' : row.product_type || (fallback.category === 'kit' ? 'welcome_kit' : fallback.category === 'hamper' ? 'hamper' : 'diy_supply'),
      stock_quantity: row.stock_quantity === undefined ? 10 : row.stock_quantity
    };
  };
  function renderTags() {
    tagsBox.innerHTML = categories.map(category => `<label><input type="checkbox" name="tag" value="${esc(category.slug)}"> ${esc(category.title)}</label>`).join('');
    filterTags();
  }
  function filterTags() {
    const dryFruit = form.elements.product_type.value === 'dry_fruit_box';
    const checkbox = tagsBox.querySelector('input[value="dry-fruit-hampers"]');
    if (!checkbox) return;
    checkbox.disabled = !dryFruit;
    if (!dryFruit) checkbox.checked = false;
  }
  function reset() {
    form.reset();
    form.elements.editing_slug.value = '';
    form.elements.slug.readOnly = false;
    panel.querySelector('[data-editor-heading]').textContent = 'Add a product';
    tagsBox.querySelectorAll('input').forEach(input => { input.checked = false; });
    filterTags();
  }
  function renderList() {
    const slugs = new Set([...staticProducts.keys(), ...records.keys()]);
    list.innerHTML = `<div class="catalog-product-list">${[...slugs].map(slug => {
      const item = displayProduct(slug);
      const image = item.image_url && /^https:\/\//i.test(item.image_url) ? `<img src="${esc(item.image_url)}" alt="" width="80" height="80">` : '';
      return `<article class="catalog-product-row"><div class="catalog-product-photo">${image}</div><div><h4>${esc(item.name)}</h4><p>${money(item.price_paise ?? Math.round(Number(item.price) * 100))} · ${item.stock_quantity === null || item.stock_quantity === undefined ? 'Stock not set' : `${item.stock_quantity} in stock`} · ${item.active === false ? 'Hidden' : 'Published'}</p><small>${(item.collection_tags || []).map(esc).join(' · ')}</small></div><button type="button" class="button secondary" data-edit-slug="${esc(slug)}">Edit</button></article>`;
    }).join('')}</div>`;
  }
  async function load() {
    if (!admin()) { panel.hidden = true; return; }
    panel.hidden = false;
    if (!loaded) {
      const response = await fetch(new URL('content/catalogue.json', site));
      if (!response.ok) throw new Error('Could not load the catalogue file.');
      const catalogue = await response.json();
      staticProducts = new Map((catalogue.products || []).map(item => [item.slug, item]));
      categories = [...Object.values(catalogue.collections || {}).filter(item => !item.limit), { slug: 'hamperia', title: 'Hamperia Store' }];
      renderTags();
      loaded = true;
    }
    const { data, error } = await window.hamperia.client.from('catalog_products').select('*').order('name');
    if (error) throw new Error(`Could not load product records: ${error.message}`);
    records = new Map((data || []).map(row => [row.slug, row]));
    renderList();
    if (!(data || []).some(row => Object.hasOwn(row, 'stock_quantity'))) show('Run supabase/catalog-management.sql to enable product images, tags and stock.', true);
    else show('Choose a product to edit, or add a new one.');
  }
  panel.addEventListener('click', event => {
    if (event.target.closest('[data-catalog-reset]')) { reset(); show('Form cleared.'); return; }
    const button = event.target.closest('[data-edit-slug]');
    if (!button) return;
    const item = displayProduct(button.dataset.editSlug);
    reset();
    form.elements.editing_slug.value = item.slug;
    form.elements.slug.value = item.slug;
    form.elements.slug.readOnly = true;
    form.elements.name.value = item.name || '';
    form.elements.description.value = item.description;
    form.elements.contents.value = item.contents.join('\n');
    form.elements.price.value = ((item.price_paise ?? Math.round(Number(item.price) * 100)) / 100).toFixed(2);
    form.elements.stock.value = item.stock_quantity ?? '';
    form.elements.product_type.value = item.product_type;
    form.elements.active.checked = item.active !== false;
    filterTags();
    tagsBox.querySelectorAll('input').forEach(input => { if (!input.disabled) input.checked = item.collection_tags.includes(input.value); });
    panel.querySelector('[data-editor-heading]').textContent = `Edit ${item.name}`;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  form.elements.product_type.addEventListener('change', filterTags);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!admin() || !form.reportValidity()) return;
    const values = new FormData(form);
    const slug = String(values.get('slug') || '').trim();
    const editing = String(values.get('editing_slug') || '');
    const tags = values.getAll('tag').map(String);
    const type = String(values.get('product_type'));
    const contents = String(values.get('contents') || '').split(/\r?\n/).map(value => value.trim()).filter(Boolean);
    const stock = Number(values.get('stock'));
    const price = Number(values.get('price'));
    const paise = Math.round(price * 100);
    const problem = window.hamperiaCatalogRules.validate({ slug, name: String(values.get('name') || '').trim(), description: String(values.get('description') || '').trim(), pricePaise: paise, stock, type, tags, contents });
    if (problem) return show(problem, true);
    if (editing && editing !== slug) return show('The URL slug cannot be changed after creation.', true);
    const file = form.elements.image.files[0];
    if (file && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) return show('Choose a PNG, JPG or WebP image under 5 MB.', true);
    if (!editing && !file) return show('Add a product image before publishing a new item.', true);
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    show('Saving the product…');
    let uploadedPath = null;
    try {
      let imageUrl = records.get(slug)?.image_url || null;
      if (file) {
        const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
        uploadedPath = `${slug}/${crypto.randomUUID()}.${ext}`;
        const bucket = window.hamperia.client.storage.from('product-images');
        const { error } = await bucket.upload(uploadedPath, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        imageUrl = bucket.getPublicUrl(uploadedPath).data.publicUrl;
      }
      const item = { name: String(values.get('name')).trim(), description: String(values.get('description')).trim(), contents,
        price_paise: paise, stock_quantity: stock, product_type: type, collection_tags: tags,
        image_url: imageUrl, active: values.has('active') };
      const query = editing
        ? window.hamperia.client.from('catalog_products').update(item).eq('slug', slug)
        : window.hamperia.client.from('catalog_products').insert({ slug, ...item });
      const { error } = await query;
      if (error) throw error;
      reset();
      await load();
      show('Product saved. Its price, image, collections and stock are now in the catalogue.');
    } catch (error) {
      if (uploadedPath) await window.hamperia.client.storage.from('product-images').remove([uploadedPath]);
      show(`Could not save: ${error.message || 'Please try again.'}`, true);
    } finally { button.disabled = false; }
  });
  window.hamperia.sessionListeners.push(() => load().catch(error => show(error.message, true)));
  void window.hamperia.ready.then(() => load().catch(error => show(error.message, true)));
})();
