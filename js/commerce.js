(() => {
  'use strict';

  const root = new URL('../', document.currentScript.src);
  const link = path => new URL(path, root).href;
  const shopping = window.hamperiaShoppingState.createShoppingState(localStorage);
  const { cart, wishlist } = shopping;
  const money = paise => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const products = new Map();
  let config = { paymentsEnabled: false, shippingPaise: 9900, currency: 'INR' };
  let client = null;
  let user = null;
  let busy = false;

  function persist() {
    shopping.save();
    document.querySelectorAll('[data-cart-count]').forEach(node => { node.textContent = [...cart.values()].reduce((a, b) => a + b, 0); });
    document.querySelectorAll('[data-wish-count]').forEach(node => { node.textContent = wishlist.size; });
    document.querySelectorAll('[data-wish-key]').forEach(node => {
      const saved = wishlist.has(node.dataset.wishKey);
      node.textContent = saved ? '♥' : '♡';
      node.setAttribute('aria-pressed', String(saved));
      node.setAttribute('aria-label', `${saved ? 'Remove from' : 'Add to'} wishlist: ${node.dataset.productName || 'product'}`);
    });
  }

  function makeActions(key, name) {
    const wrap = document.createElement('div');
    wrap.className = 'commerce-actions';
    const wish = document.createElement('button');
    wish.type = 'button'; wish.className = 'wish-button'; wish.dataset.wishKey = key; wish.dataset.productName = name;
    const add = document.createElement('button');
    add.type = 'button'; add.className = 'add-button'; add.dataset.cartKey = key;
    add.textContent = 'Add to cart';
    wrap.append(wish, add);
    return wrap;
  }

  function addShoppingControls() {
    const account = document.querySelector('.nav-row .auth-controls');
    if (account && !document.querySelector('.commerce-shortcuts')) {
      const shortcuts = document.createElement('div');
      shortcuts.className = 'commerce-shortcuts';
      shortcuts.innerHTML = `<a href="${link('wishlist/')}" aria-label="Wishlist"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.3 5.3 0 0 0-7.5 0L12 5.9l-1.3-1.3a5.3 5.3 0 0 0-7.5 7.5L12 21l8.8-8.9a5.3 5.3 0 0 0 0-7.5Z"/></svg><span class="shortcut-count" data-wish-count>0</span></a><a href="${link('cart/')}" aria-label="Basket"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 9 2 11h12l2-11H4ZM8 9l4-6 4 6M4 9h16M9 13v4m6-4v4"/></svg><span class="shortcut-count" data-cart-count>0</span></a>`;
      account.before(shortcuts);
    }
    document.querySelectorAll('[data-product-card]').forEach(card => {
      if (card.querySelector('.commerce-actions')) return;
      const href = card.querySelector('a[href*="/products/"]')?.href || '';
      const slug = href.match(/\/products\/([^/]+)\/?(?:\?|$)/)?.[1];
      if (!slug || !products.has(`catalog:${slug}`)) return;
      card.append(makeActions(`catalog:${slug}`, products.get(`catalog:${slug}`).name));
    });
    const slug = location.pathname.match(/\/products\/([^/]+)\/?$/)?.[1];
    const detail = document.querySelector('.product-detail > div:last-child');
    if (slug && detail && !detail.querySelector('.commerce-actions') && products.has(`catalog:${slug}`)) {
      const actions = makeActions(`catalog:${slug}`, products.get(`catalog:${slug}`).name);
      actions.classList.add('detail-actions');
      detail.querySelector('h2')?.after(actions);
    }
    const accountContent = document.querySelector('[data-account-content]');
    if (accountContent && !accountContent.querySelector('[data-commerce-account-links]')) {
      const panel = document.createElement('div');
      panel.className = 'account-grid'; panel.dataset.commerceAccountLinks = '';
      panel.innerHTML = `<article class="account-card"><h2>Your wishlist</h2><p>See gifts you saved for later.</p><a class="button secondary" href="${link('wishlist/')}">View wishlist</a></article><article class="account-card"><h2>Your orders</h2><p>Review payment and delivery status.</p><a class="button secondary" href="${link('orders/')}">View orders</a></article>`;
      accountContent.append(panel);
    }
    persist();
  }

  async function syncWishlist() {
    if (!client || !user) return;
    const accountId = user.id;
    const localWins = shopping.hadSavedWishlist || wishlist.size > 0;
    const { data, error } = await client.from('wishlist_items').select('product_key').eq('user_id', accountId);
    if (error || user?.id !== accountId) return;
    const remote = new Set((data || []).map(item => item.product_key));
    const missing = [...wishlist].filter(key => !remote.has(key));
    if (localWins) {
      if (missing.length) await client.from('wishlist_items').upsert(missing.map(product_key => ({ user_id: accountId, product_key })), { onConflict: 'user_id,product_key' });
      for (const key of remote) if (!wishlist.has(key)) await client.from('wishlist_items').delete().eq('user_id', accountId).eq('product_key', key);
    } else remote.forEach(key => wishlist.add(key));
    if (user?.id !== accountId) return;
    persist();
  }

  function applyCatalog(catalogue, rows) {
    const originals = new Map((catalogue.products || []).map(item => [item.slug, item]));
    const records = new Map((rows || []).map(row => [row.slug, row]));
    const contentsFor = (row, fallback) => row.contents?.length ? row.contents : fallback?.contents || [];
    const contentsMarkup = items => items.length ? `<section class="product-contents" data-product-contents><h3>What's inside</h3><ul>${items.map(item => `<li>${escape(item)}</li>`).join('')}</ul><p class="product-contents-note">Please confirm exact brands, quantities, colours and any substitutions before ordering.</p></section>` : '';
    const imageFor = (row, fallback) => /^https:\/\//i.test(row.image_url || '') ? row.image_url : fallback ? link(`assets/${fallback.image}`) : '';
    const tagsFor = (row, fallback) => row.collection_tags?.length ? row.collection_tags : fallback?.tags || [];
    const typeFor = row => row.product_type || (row.slug.startsWith('dry-fruit-') ? 'dry_fruit_box' : 'hamper');
    const stockFor = row => row.stock_quantity === undefined ? 10 : row.stock_quantity;
    for (const row of rows || []) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug)) continue;
      const key = `catalog:${row.slug}`;
      if (!row.active) { products.delete(key); continue; }
      const fallback = originals.get(row.slug);
      products.set(key, { key, name: row.name, pricePaise: Number(row.price_paise),
        image: imageFor(row, fallback), url: fallback ? link(`products/${row.slug}/`) : link(`products/item/?slug=${encodeURIComponent(row.slug)}`),
        category: typeFor(row), stockQuantity: stockFor(row) ?? null });
    }
    const collection = document.querySelector('[data-collection-slug]');
    const pageSlug = location.pathname.replace(/\/$/, '').split('/').pop();
    const collectionSlug = collection?.dataset.collectionSlug || (pageSlug === 'hampers' ? 'gift-hampers' : pageSlug === 'hamperia' ? 'hamperia' : null);
    const budget = /^gifts-under-(\d+)$/.exec(collectionSlug || '');
    const matchesCollection = (row, fallback) => budget
      ? Number(row.price_paise) < Number(budget[1]) * 100
      : tagsFor(row, fallback).includes(collectionSlug) &&
        (collectionSlug !== 'dry-fruit-hampers' || typeFor(row) === 'dry_fruit_box');
    document.querySelectorAll('[data-product-card][data-product-slug]').forEach(card => {
      const slug = card.dataset.productSlug;
      const row = records.get(slug);
      if (!row) return;
      const fallback = originals.get(slug);
      card.hidden = !row.active || Boolean(collection && !matchesCollection(row, fallback));
      if (card.hidden) return;
      card.dataset.price = Number(row.price_paise) / 100;
      card.dataset.name = row.name.toLowerCase();
      const image = card.querySelector('img');
      if (image && row.image_url) { image.src = imageFor(row, fallback); image.alt = row.name; }
      const title = card.querySelector('.shop-card-body h3');
      if (title) title.textContent = row.name;
      const price = card.querySelector('[data-product-price]');
      if (price) price.textContent = money(Number(row.price_paise));
      const stock = card.querySelector('[data-product-stock]') || document.createElement('small');
      stock.dataset.productStock = '';
      const quantity = stockFor(row);
      stock.textContent = quantity === null || quantity === undefined ? 'Stock to confirm' : quantity ? `${quantity} available` : 'Out of stock';
      card.querySelector('.shop-card-body')?.append(stock);
      const button = card.querySelector('[data-cart-key]');
      if (button) { button.disabled = quantity === 0; button.textContent = quantity === 0 ? 'Out of stock' : 'Add to cart'; }
      const wish = card.querySelector('[data-wish-key]');
      if (wish) wish.dataset.productName = row.name;
    });
    const grid = collection?.querySelector('[data-catalog-grid]') ||
      (['hampers', 'hamperia'].includes(pageSlug) ? document.querySelector('.shop-grid') : null);
    if (grid) for (const row of rows || []) {
      if (!row.active || !matchesCollection(row, originals.get(row.slug))) continue;
      if ([...grid.querySelectorAll('[data-product-slug]')].some(card => card.dataset.productSlug === row.slug)) continue;
      const product = products.get(`catalog:${row.slug}`);
      if (!product?.image) continue;
      const card = document.createElement('article');
      card.className = 'shop-card'; card.dataset.productCard = ''; card.dataset.productSlug = row.slug;
      card.dataset.name = row.name.toLowerCase(); card.dataset.price = Number(row.price_paise) / 100;
      card.innerHTML = `<a href="${escape(product.url)}"><span class="shop-card-image"><img src="${escape(product.image)}" alt="${escape(product.name)}" loading="lazy" width="600" height="500"></span><div class="shop-card-body"><span class="eyebrow">Hamperia product</span><h3>${escape(product.name)}</h3><p data-product-price>${money(product.pricePaise)}</p><small data-product-stock>${row.stock_quantity === 0 ? 'Out of stock' : row.stock_quantity == null ? 'Stock to confirm' : `${row.stock_quantity} available`}</small><span class="shop-card-link">View details ↗</span></div></a><div class="commerce-actions"><button class="wish-button" type="button" data-wish-key="${escape(product.key)}" data-product-name="${escape(product.name)}" aria-label="Add to wishlist: ${escape(product.name)}">♡</button><button class="add-button" type="button" data-cart-key="${escape(product.key)}" ${row.stock_quantity === 0 ? 'disabled' : ''}>${row.stock_quantity === 0 ? 'Out of stock' : 'Add to cart'}</button></div>`;
      grid.append(card);
    }
    const staticSlug = location.pathname.match(/\/products\/([^/]+)\/?$/)?.[1];
    if (staticSlug && staticSlug !== 'item' && records.has(staticSlug)) {
      const row = records.get(staticSlug);
      const detail = document.querySelector('.product-detail');
      if (detail) {
        detail.hidden = !row.active;
        if (row.active) {
          const image = detail.querySelector('img');
          if (image && row.image_url) { image.src = imageFor(row, originals.get(staticSlug)); image.alt = row.name; }
          const heading = document.querySelector('.collection-intro h1');
          if (heading) heading.textContent = row.name;
          const price = detail.querySelector('h2');
          if (price) price.textContent = money(Number(row.price_paise));
          const description = detail.querySelector('[data-product-description]');
          if (description) description.textContent = row.description || originals.get(staticSlug)?.description || '';
          const contents = detail.querySelector('[data-product-contents]');
          if (contents) contents.outerHTML = contentsMarkup(contentsFor(row, originals.get(staticSlug)));
          else price?.insertAdjacentHTML('afterend', contentsMarkup(contentsFor(row, originals.get(staticSlug))));
          const stock = document.createElement('p');
          stock.className = 'product-stock';
          stock.textContent = row.stock_quantity === null || row.stock_quantity === undefined ? 'Stock to confirm' : row.stock_quantity ? `${row.stock_quantity} available` : 'Out of stock';
          price?.after(stock);
          const button = detail.querySelector('[data-cart-key]');
          if (button) { button.disabled = row.stock_quantity === 0; button.textContent = row.stock_quantity === 0 ? 'Out of stock' : 'Add to cart'; }
        }
      }
    }
    const dynamicDetail = document.querySelector('[data-catalog-detail]');
    if (dynamicDetail) {
      const slug = new URLSearchParams(location.search).get('slug');
      const row = records.get(slug);
      const product = products.get(`catalog:${slug}`);
      dynamicDetail.innerHTML = row?.active && product?.image
        ? `<p class="eyebrow"><a href="${link('')}">Home</a> / Product</p><div class="product-detail"><div class="product-image-frame"><img src="${escape(product.image)}" alt="${escape(product.name)}" width="700" height="650"></div><div><h1>${escape(product.name)}</h1><h2>${money(product.pricePaise)}</h2><p class="product-stock">${row.stock_quantity === 0 ? 'Out of stock' : row.stock_quantity == null ? 'Stock to confirm' : `${row.stock_quantity} available`}</p>${contentsMarkup(contentsFor(row, originals.get(slug)))}<p>${escape(row.description || originals.get(slug)?.description || '')}</p><div class="commerce-actions detail-actions"><button class="wish-button" type="button" data-wish-key="${escape(product.key)}" data-product-name="${escape(product.name)}" aria-label="Add to wishlist: ${escape(product.name)}">♡</button><button class="add-button" type="button" data-cart-key="${escape(product.key)}" ${row.stock_quantity === 0 ? 'disabled' : ''}>${row.stock_quantity === 0 ? 'Out of stock' : 'Add to cart'}</button></div><a href="${link('hampers/')}">Explore more gifts →</a></div></div>`
        : '<h1>Product unavailable</h1><p>This product is no longer listed. Explore our current collections.</p>';
    }
  }

  async function load() {
    const [catalogueResponse, configResponse] = await Promise.all([fetch(link('content/catalogue.json')), fetch(link('content/commerce-config.json'))]);
    if (!catalogueResponse.ok || !configResponse.ok) throw new Error('The shop catalogue is unavailable. Please refresh the page.');
    const catalogue = await catalogueResponse.json();
    config = await configResponse.json();
    for (const item of catalogue.products || []) products.set(`catalog:${item.slug}`, {
      key: `catalog:${item.slug}`, name: item.name, pricePaise: Math.round(Number(item.price) * 100),
      image: link(`assets/${item.image}`), url: link(`products/${item.slug}/`), category: item.category,
      stockQuantity: 10
    });
    addShoppingControls();
    if (window.hamperia) {
      await window.hamperia.ready;
      client = window.hamperia.client;
      user = window.hamperia.state.user;
      shopping.activate(user?.id);
      window.hamperia.beforeSignOutListeners.push(() => { shopping.signOut(); user = null; persist(); renderView(); });
      window.hamperia.sessionListeners ||= [];
      window.hamperia.sessionListeners.push(async state => {
        if (shopping.userId === (state.user?.id || null)) return;
        user = state.user;
        shopping.activate(user?.id);
        if (user) await syncWishlist();
        persist(); renderView();
      });
      if (client) {
        const { data, error } = await client.from('catalog_products').select('*');
        if (!error) applyCatalog(catalogue, data || []);
        await syncWishlist();
      }
    } else {
      shopping.activate(null);
    }
    addShoppingControls();
    renderView();
  }

  function itemMarkup(product, quantity, mode) {
    const unavailable = !product;
    const key = product?.key || quantity.key;
    if (unavailable) return `<article class="commerce-item"><p>This product is no longer available.</p><button type="button" data-remove-item="${escape(key)}" data-list="${mode}">Remove</button></article>`;
    return `<article class="commerce-item"><a href="${escape(product.url)}"><img src="${escape(product.image)}" alt="${escape(product.name)}" loading="lazy" width="140" height="140"></a><div><h2><a href="${escape(product.url)}">${escape(product.name)}</a></h2><p>${money(product.pricePaise)}</p>${mode === 'cart' ? `<label>Quantity <input type="number" min="1" max="${Math.min(10, product.stockQuantity ?? 10)}" step="1" value="${quantity.quantity}" data-quantity-key="${escape(key)}"></label><p>Line total: ${money(product.pricePaise * quantity.quantity)}</p>` : `<button type="button" data-cart-key="${escape(key)}" ${product.stockQuantity === 0 ? 'disabled' : ''}>${product.stockQuantity === 0 ? 'Out of stock' : 'Add to cart'}</button>`}<button type="button" class="text-button" data-remove-item="${escape(key)}" data-list="${mode}">Remove</button></div></article>`;
  }

  function totals() {
    const entries = [...cart].map(([key, quantity]) => ({ product: products.get(key), key, quantity }));
    return { entries, subtotal: entries.reduce((sum, x) => sum + (x.product?.pricePaise || 0) * x.quantity, 0) };
  }

  function renderView() {
    const view = document.querySelector('[data-commerce-view]');
    if (!view) return;
    const mode = view.dataset.commerceView;
    if (mode === 'wishlist') {
      const items = [...wishlist].map(key => ({ key, product: products.get(key) }));
      view.innerHTML = items.length ? `<div class="commerce-list">${items.map(x => itemMarkup(x.product, x, 'wishlist')).join('')}</div>` : `<div class="commerce-empty"><h2>Your wishlist is empty.</h2><p>Save a gift by selecting the heart on a product card.</p><a class="button" href="${link('hampers/')}">Explore hampers</a></div>`;
    } else if (mode === 'cart') {
      const { entries, subtotal } = totals();
      view.innerHTML = entries.length ? `<div class="commerce-layout"><div class="commerce-list">${entries.map(x => itemMarkup(x.product, x, 'cart')).join('')}</div><aside class="commerce-summary"><h2>Order summary</h2><p><span>Products</span><strong>${money(subtotal)}</strong></p><p><span>Flat shipping</span><strong>${money(config.shippingPaise)}</strong></p><p class="commerce-total"><span>Total</span><strong>${money(subtotal + config.shippingPaise)}</strong></p><a class="button" href="${link('checkout/')}">Continue to checkout</a></aside></div>` : `<div class="commerce-empty"><h2>Your basket is empty.</h2><p>Explore the shop and add something thoughtful.</p><a class="button" href="${link('hamperia/')}">Explore the store</a></div>`;
    } else if (mode === 'checkout') renderCheckout(view);
    else if (mode === 'orders') void renderOrders(view);
  }

  function renderCheckout(view) {
    const { entries, subtotal } = totals();
    if (!entries.length) { view.innerHTML = `<div class="commerce-empty"><h2>Your basket is empty.</h2><a class="button" href="${link('hamperia/')}">Browse products</a></div>`; return; }
    if (entries.some(x => !x.product)) { view.innerHTML = `<div class="commerce-empty"><h2>Review your basket first.</h2><p>One or more products are unavailable.</p><a class="button" href="${link('cart/')}">Review basket</a></div>`; return; }
    if (entries.some(x => x.product.stockQuantity !== undefined && (x.product.stockQuantity === null || x.quantity > x.product.stockQuantity))) { view.innerHTML = `<div class="commerce-empty"><h2>Stock needs confirmation.</h2><p>One or more items in your basket do not have enough confirmed stock. Please review your basket or contact us.</p><a class="button" href="${link('cart/')}">Review basket</a></div>`; return; }
    if (!user) { view.innerHTML = `<div class="commerce-empty"><h2>Sign in to place an order.</h2><a class="button" href="${link('auth/')}" data-checkout-signin>Sign in or create an account</a></div>`; return; }
    const providers = config.providers || {};
    const razorpayReady = Boolean(config.paymentsEnabled && providers.razorpay);
    const payuReady = Boolean(config.paymentsEnabled && providers.payu);
    const anyReady = razorpayReady || payuReady;
    const methods = `<fieldset class="payment-methods"><legend>Choose how to pay</legend><label><input type="radio" name="provider" value="razorpay" ${razorpayReady ? 'checked' : 'disabled'}> Razorpay ${razorpayReady ? '' : '· Coming soon'}</label><label><input type="radio" name="provider" value="payu" ${payuReady && !razorpayReady ? 'checked' : ''} ${payuReady ? '' : 'disabled'}> PayU India ${payuReady ? '' : '· Coming soon'}</label></fieldset>`;
    view.innerHTML = `<div class="commerce-layout"><form class="checkout-form" data-checkout-form><h2>Delivery address</h2><div class="checkout-fields"><label>Full name<input name="full_name" autocomplete="name" required maxlength="100" value="${escape(window.hamperia?.state.profile?.display_name || '')}"></label><label>Phone number<input name="phone" type="tel" autocomplete="tel" inputmode="numeric" pattern="[0-9]{10}" required placeholder="10-digit mobile number"></label><label>Address line 1<input name="line1" autocomplete="address-line1" required maxlength="160"></label><label>Address line 2 (optional)<input name="line2" autocomplete="address-line2" maxlength="160"></label><label>City<input name="city" autocomplete="address-level2" required maxlength="80"></label><label>State<input name="state" autocomplete="address-level1" required maxlength="80"></label><label>PIN code<input name="pincode" autocomplete="postal-code" inputmode="numeric" pattern="[0-9]{6}" required></label><label>Gift note (optional)<textarea name="gift_note" maxlength="250" rows="3"></textarea></label></div>${methods}<p class="checkout-notice" role="status" data-checkout-status>${anyReady ? 'Your payment will be processed by the provider you choose.' : 'Online payment is being set up. Orders cannot be placed yet.'}</p><button class="button" type="submit" ${anyReady ? '' : 'disabled'}>${anyReady ? `Pay ${money(subtotal + config.shippingPaise)}` : 'Checkout coming soon'}</button></form><aside class="commerce-summary"><h2>Your order</h2>${entries.map(x => `<p><span>${escape(x.product.name)} × ${x.quantity}</span><strong>${money(x.product.pricePaise * x.quantity)}</strong></p>`).join('')}<p><span>Flat shipping</span><strong>${money(config.shippingPaise)}</strong></p><p class="commerce-total"><span>Total</span><strong>${money(subtotal + config.shippingPaise)}</strong></p><a href="${link('cart/')}">Edit basket</a></aside></div>`;
  }

  async function renderOrders(view) {
    if (!user) { view.innerHTML = `<div class="commerce-empty"><h2>Sign in to view your orders.</h2><a class="button" href="${link('auth/')}">Sign in</a></div>`; return; }
    const { data, error } = await client.from('shop_orders').select('id,status,total_paise,created_at').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) { view.innerHTML = '<div class="commerce-empty"><h2>Order history is being set up.</h2><p>Please check again once online checkout is available.</p></div>'; return; }
    const query = new URLSearchParams(location.search);
    const returnedOrder = (data || []).find(order => order.id === query.get('order'));
    if (returnedOrder && ['paid', 'fulfilled'].includes(returnedOrder.status)) { cart.clear(); persist(); }
    const message = query.has('payment') ? `<p role="status" class="checkout-notice">${returnedOrder && ['paid', 'fulfilled'].includes(returnedOrder.status) ? 'Payment confirmed. Thank you for your order.' : 'We are checking the payment. Please review your order status before attempting another payment.'}</p>` : '';
    view.innerHTML = message + (data?.length ? `<div class="commerce-list">${data.map(order => `<article class="order-row"><div><h2>Order ${escape(order.id.slice(0, 8).toUpperCase())}</h2><p>${escape(new Date(order.created_at).toLocaleDateString('en-IN'))}</p></div><strong>${escape(order.status.replaceAll('_', ' '))}</strong><span>${money(order.total_paise)}</span></article>`).join('')}</div>` : `<div class="commerce-empty"><h2>No orders yet.</h2><p>Your purchases will appear here after checkout.</p><a class="button" href="${link('hampers/')}">Explore hampers</a></div>`);
  }

  function notice(message) {
    const node = document.querySelector('[data-commerce-toast]') || document.createElement('div');
    node.dataset.commerceToast = ''; node.className = 'commerce-toast'; node.role = 'status';
    node.textContent = message; document.body.append(node);
    clearTimeout(notice.timer);
    notice.timer = setTimeout(() => node.remove(), 3500);
  }

  async function loadRazorpay() {
    if (window.Razorpay) return;
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = resolve; script.onerror = () => reject(new Error('Payment checkout could not load. Please try again.'));
      document.head.append(script);
    });
  }

  async function pay(form) {
    if (busy || !config.paymentsEnabled) return;
    busy = true;
    const button = form.querySelector('button[type="submit"]');
    const status = form.querySelector('[data-checkout-status]');
    const unlock = () => { busy = false; button.disabled = false; };
    button.disabled = true; status.textContent = 'Preparing your secure payment…';
    try {
      if (!user || !client) throw new Error('Please sign in before checkout.');
      const address = Object.fromEntries(new FormData(form));
      const provider = address.provider;
      if (!['razorpay', 'payu'].includes(provider) || !config.providers?.[provider]) throw new Error('Choose an available payment provider.');
      delete address.provider;
      const items = [...cart].map(([key, quantity]) => ({ key, quantity }));
      const { data, error } = await client.functions.invoke('create-checkout-order', { body: { items, address, provider } });
      if (error) throw new Error('Checkout could not start. Please try again later.');
      if (data?.provider !== provider) throw new Error('The payment provider did not match. Please try again.');
      if (provider === 'payu') {
        const action = new URL(data.action);
        if (!['test.payu.in', 'secure.payu.in'].includes(action.hostname) || action.pathname !== '/_payment' || action.protocol !== 'https:') throw new Error('Invalid PayU checkout destination');
        const paymentForm = document.createElement('form');
        paymentForm.method = 'POST'; paymentForm.action = action.href; paymentForm.hidden = true;
        for (const [key, value] of Object.entries(data.fields || {})) {
          if (!['key', 'txnid', 'amount', 'productinfo', 'firstname', 'email', 'phone', 'udf1', 'surl', 'furl', 'hash'].includes(key) || typeof value !== 'string') continue;
          const input = document.createElement('input'); input.name = key; input.value = value; paymentForm.append(input);
        }
        document.body.append(paymentForm);
        status.textContent = 'Opening PayU India…';
        paymentForm.submit();
        return;
      }
      await loadRazorpay();
      let verifying = false;
      const checkout = new window.Razorpay({
        key: data.key_id, amount: data.amount_paise, currency: 'INR', name: 'Hamperia Solutions',
        description: 'Gift order', order_id: data.razorpay_order_id,
        prefill: { name: address.full_name, email: user.email, contact: address.phone },
        handler: async response => {
          verifying = true;
          status.textContent = 'Verifying payment…';
          try {
            const { data: verified, error: verificationError } = await client.functions.invoke('verify-checkout-payment', {
              body: { order_id: data.order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature }
            });
            if (verificationError || !verified?.paid) { status.textContent = 'Payment is processing. Check Your orders before trying again.'; unlock(); return; }
            cart.clear(); persist(); window.location.assign(link('orders/'));
          } catch { status.textContent = 'Payment is processing. Check Your orders before trying again.'; unlock(); }
        },
        modal: { ondismiss: () => { if (!verifying) { status.textContent = 'Payment was not completed. Your basket is saved.'; unlock(); } } }
      });
      checkout.on('payment.failed', () => { status.textContent = 'Payment failed. Your basket is saved; please try again.'; });
      checkout.open();
    } catch (error) { status.textContent = error.message || 'Checkout failed. Please try again.'; unlock(); }
  }

  document.addEventListener('click', event => {
    const wish = event.target.closest('[data-wish-key]');
    const add = event.target.closest('[data-cart-key]');
    const remove = event.target.closest('[data-remove-item]');
    if (wish) {
      if (!user) { window.hamperia?.promptSignIn('Sign in to save products to your wishlist.'); return; }
      const key = wish.dataset.wishKey;
      if (wishlist.has(key)) wishlist.delete(key); else wishlist.add(key);
      persist(); renderView();
      if (client && user) void (wishlist.has(key)
        ? client.from('wishlist_items').upsert({ user_id: user.id, product_key: key }, { onConflict: 'user_id,product_key' })
        : client.from('wishlist_items').delete().eq('user_id', user.id).eq('product_key', key));
    } else if (add) {
      if (!user) { window.hamperia?.promptSignIn('Sign in to add products to your basket.'); return; }
      const key = add.dataset.cartKey;
      if (!products.has(key)) return;
      const stock = products.get(key).stockQuantity;
      if (stock === 0 || (stock !== null && stock !== undefined && (cart.get(key) || 0) >= stock)) { notice('No more stock is available for this item.'); return; }
      cart.set(key, Math.min(10, (cart.get(key) || 0) + 1)); persist(); renderView(); notice('Added to your basket.');
    } else if (remove) {
      const key = remove.dataset.removeItem;
      if (remove.dataset.list === 'wishlist') {
        wishlist.delete(key);
        if (client && user) void client.from('wishlist_items').delete().eq('user_id', user.id).eq('product_key', key);
      } else cart.delete(key);
      persist(); renderView();
    } else if (event.target.closest('[data-checkout-signin]')) {
      sessionStorage.setItem('hamperia_after_login', 'checkout/');
    }
  });
  document.addEventListener('change', event => {
    const input = event.target.closest('[data-quantity-key]');
    if (!input) return;
    const maximum = Math.min(10, products.get(input.dataset.quantityKey)?.stockQuantity ?? 10);
    input.value = String(Math.max(1, Math.min(maximum || 1, Number.parseInt(input.value, 10) || 1)));
    cart.set(input.dataset.quantityKey, Number(input.value)); persist(); renderView();
  });
  document.addEventListener('submit', event => {
    if (!event.target.matches('[data-checkout-form]')) return;
    event.preventDefault();
    if (event.target.reportValidity()) void pay(event.target);
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void load().catch(error => {
    const view = document.querySelector('[data-commerce-view]');
    if (view) view.textContent = error.message;
  }); });
  else void load().catch(error => { const view = document.querySelector('[data-commerce-view]'); if (view) view.textContent = error.message; });
})();
