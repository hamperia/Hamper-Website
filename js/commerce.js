(() => {
  'use strict';

  const root = new URL('../', document.currentScript.src);
  const link = path => new URL(path, root).href;
  const cartKey = 'hamperia_cart_v1';
  const wishKey = 'hamperia_wishlist_v1';
  const money = paise => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const read = key => {
    try { const value = JSON.parse(localStorage.getItem(key)); return Array.isArray(value) ? value : []; }
    catch { return []; }
  };
  const cart = new Map(read(cartKey).filter(x => typeof x.key === 'string' && Number.isInteger(x.quantity) && x.quantity > 0).map(x => [x.key, Math.min(10, x.quantity)]));
  const wishlist = new Set(read(wishKey).filter(x => typeof x === 'string'));
  let wishStorageKey = wishKey;
  const products = new Map();
  let config = { paymentsEnabled: false, shippingPaise: 9900, currency: 'INR' };
  let client = null;
  let user = null;
  let busy = false;

  function persist() {
    localStorage.setItem(cartKey, JSON.stringify([...cart].map(([key, quantity]) => ({ key, quantity }))));
    localStorage.setItem(wishStorageKey, JSON.stringify([...wishlist]));
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
      shortcuts.innerHTML = `<a href="${link('wishlist/')}" aria-label="Wishlist"><span aria-hidden="true">♡</span><span class="shortcut-label">Wishlist</span><span class="shortcut-count" data-wish-count>0</span></a><a href="${link('cart/')}" aria-label="Basket"><span aria-hidden="true">▣</span><span class="shortcut-label">Basket</span><span class="shortcut-count" data-cart-count>0</span></a>`;
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
    const { data, error } = await client.from('wishlist_items').select('product_key').eq('user_id', user.id);
    if (error) return;
    const remote = new Set((data || []).map(item => item.product_key));
    const missing = [...wishlist].filter(key => !remote.has(key));
    if (missing.length) await client.from('wishlist_items').upsert(missing.map(product_key => ({ user_id: user.id, product_key })), { onConflict: 'user_id,product_key' });
    remote.forEach(key => wishlist.add(key));
    persist();
  }

  async function load() {
    const [catalogueResponse, configResponse] = await Promise.all([fetch(link('content/catalogue.json')), fetch(link('content/commerce-config.json'))]);
    if (!catalogueResponse.ok || !configResponse.ok) throw new Error('The shop catalogue is unavailable. Please refresh the page.');
    const catalogue = await catalogueResponse.json();
    config = await configResponse.json();
    for (const item of catalogue.products || []) products.set(`catalog:${item.slug}`, {
      key: `catalog:${item.slug}`, name: item.name, pricePaise: Math.round(Number(item.price) * 100),
      image: link(`assets/${item.image}`), url: link(`products/${item.slug}/`), category: item.category
    });
    addShoppingControls();
    if (window.hamperia) {
      await window.hamperia.ready;
      client = window.hamperia.client;
      user = window.hamperia.state.user;
      if (user) {
        wishStorageKey = `${wishKey}:${user.id}`;
        read(wishStorageKey).filter(x => typeof x === 'string').forEach(key => wishlist.add(key));
        localStorage.removeItem(wishKey);
      }
      if (client) {
        const { data } = await client.from('products').select('id,name,price,image_url,category').eq('status', 'approved');
        for (const item of data || []) products.set(`maker:${item.id}`, {
          key: `maker:${item.id}`, name: item.name, pricePaise: Math.round(Number(item.price) * 100),
          image: /^https:\/\//i.test(item.image_url || '') ? item.image_url : link('assets/home_page.jpeg'),
          url: link(item.category === 'diy' ? 'hamperia/' : 'hampers/'), category: item.category
        });
        await syncWishlist();
      }
    }
    addShoppingControls();
    renderView();
  }

  function itemMarkup(product, quantity, mode) {
    const unavailable = !product;
    const key = product?.key || quantity.key;
    if (unavailable) return `<article class="commerce-item"><p>This product is no longer available.</p><button type="button" data-remove-item="${escape(key)}" data-list="${mode}">Remove</button></article>`;
    return `<article class="commerce-item"><a href="${escape(product.url)}"><img src="${escape(product.image)}" alt="${escape(product.name)}" loading="lazy" width="140" height="140"></a><div><h2><a href="${escape(product.url)}">${escape(product.name)}</a></h2><p>${money(product.pricePaise)}</p>${mode === 'cart' ? `<label>Quantity <input type="number" min="1" max="10" step="1" value="${quantity.quantity}" data-quantity-key="${escape(key)}"></label><p>Line total: ${money(product.pricePaise * quantity.quantity)}</p>` : `<button type="button" data-cart-key="${escape(key)}">Add to cart</button>`}<button type="button" class="text-button" data-remove-item="${escape(key)}" data-list="${mode}">Remove</button></div></article>`;
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
    if (!user) { view.innerHTML = config.paymentsEnabled ? `<div class="commerce-empty"><h2>Sign in to place an order.</h2><p>Your basket will stay here while you sign in.</p><a class="button" href="${link('auth/')}" data-checkout-signin>Sign in or create an account</a></div>` : `<div class="commerce-empty"><h2>Online checkout is being set up.</h2><p>Orders cannot be placed yet. Your basket is saved on this device.</p><a class="button secondary" href="${link('cart/')}">Review basket</a></div>`; return; }
    view.innerHTML = `<div class="commerce-layout"><form class="checkout-form" data-checkout-form><h2>Delivery address</h2><div class="checkout-fields"><label>Full name<input name="full_name" autocomplete="name" required maxlength="100" value="${escape(window.hamperia?.state.profile?.display_name || '')}"></label><label>Phone number<input name="phone" type="tel" autocomplete="tel" inputmode="numeric" pattern="[0-9]{10}" required placeholder="10-digit mobile number"></label><label>Address line 1<input name="line1" autocomplete="address-line1" required maxlength="160"></label><label>Address line 2 (optional)<input name="line2" autocomplete="address-line2" maxlength="160"></label><label>City<input name="city" autocomplete="address-level2" required maxlength="80"></label><label>State<input name="state" autocomplete="address-level1" required maxlength="80"></label><label>PIN code<input name="pincode" autocomplete="postal-code" inputmode="numeric" pattern="[0-9]{6}" required></label><label>Gift note (optional)<textarea name="gift_note" maxlength="250" rows="3"></textarea></label></div><p class="checkout-notice" role="status" data-checkout-status>${config.paymentsEnabled ? 'Payment opens securely on this page through Razorpay.' : 'Online payment is being set up. Orders cannot be placed yet.'}</p><button class="button" type="submit" ${config.paymentsEnabled ? '' : 'disabled'}>${config.paymentsEnabled ? `Pay ${money(subtotal + config.shippingPaise)} with Razorpay` : 'Checkout coming soon'}</button></form><aside class="commerce-summary"><h2>Your order</h2>${entries.map(x => `<p><span>${escape(x.product.name)} × ${x.quantity}</span><strong>${money(x.product.pricePaise * x.quantity)}</strong></p>`).join('')}<p><span>Flat shipping</span><strong>${money(config.shippingPaise)}</strong></p><p class="commerce-total"><span>Total</span><strong>${money(subtotal + config.shippingPaise)}</strong></p><a href="${link('cart/')}">Edit basket</a></aside></div>`;
  }

  async function renderOrders(view) {
    if (!user) { view.innerHTML = `<div class="commerce-empty"><h2>Sign in to view your orders.</h2><a class="button" href="${link('auth/')}">Sign in</a></div>`; return; }
    const { data, error } = await client.from('shop_orders').select('id,status,total_paise,created_at').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) { view.innerHTML = '<div class="commerce-empty"><h2>Order history is being set up.</h2><p>Please check again once online checkout is available.</p></div>'; return; }
    view.innerHTML = data?.length ? `<div class="commerce-list">${data.map(order => `<article class="order-row"><div><h2>Order ${escape(order.id.slice(0, 8).toUpperCase())}</h2><p>${escape(new Date(order.created_at).toLocaleDateString('en-IN'))}</p></div><strong>${escape(order.status.replaceAll('_', ' '))}</strong><span>${money(order.total_paise)}</span></article>`).join('')}</div>` : `<div class="commerce-empty"><h2>No orders yet.</h2><p>Your purchases will appear here after checkout.</p><a class="button" href="${link('hampers/')}">Explore hampers</a></div>`;
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
    button.disabled = true; status.textContent = 'Preparing your secure payment…';
    try {
      if (!user || !client) throw new Error('Please sign in before checkout.');
      const address = Object.fromEntries(new FormData(form));
      const items = [...cart].map(([key, quantity]) => ({ key, quantity }));
      const { data, error } = await client.functions.invoke('create-checkout-order', { body: { items, address } });
      if (error) throw new Error('Checkout could not start. Please try again later.');
      await loadRazorpay();
      const checkout = new window.Razorpay({
        key: data.key_id, amount: data.amount_paise, currency: 'INR', name: 'Hamperia Solutions',
        description: 'Gift order', order_id: data.razorpay_order_id,
        prefill: { name: address.full_name, email: user.email, contact: address.phone },
        handler: async response => {
          status.textContent = 'Verifying payment…';
          const { data: verified, error: verificationError } = await client.functions.invoke('verify-checkout-payment', {
            body: { order_id: data.order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature }
          });
          if (verificationError || !verified?.paid) { status.textContent = 'Payment is processing. Check Your orders before trying again.'; return; }
          cart.clear(); persist(); window.location.assign(link('orders/'));
        },
        modal: { ondismiss: () => { status.textContent = 'Payment was not completed. Your basket is saved.'; } }
      });
      checkout.on('payment.failed', () => { status.textContent = 'Payment failed. Your basket is saved; please try again.'; });
      checkout.open();
    } catch (error) { status.textContent = error.message || 'Checkout failed. Please try again.'; }
    finally { busy = false; button.disabled = false; }
  }

  document.addEventListener('click', event => {
    const wish = event.target.closest('[data-wish-key]');
    const add = event.target.closest('[data-cart-key]');
    const remove = event.target.closest('[data-remove-item]');
    if (wish) {
      const key = wish.dataset.wishKey;
      if (wishlist.has(key)) wishlist.delete(key); else wishlist.add(key);
      persist(); renderView();
      if (client && user) void (wishlist.has(key)
        ? client.from('wishlist_items').upsert({ user_id: user.id, product_key: key }, { onConflict: 'user_id,product_key' })
        : client.from('wishlist_items').delete().eq('user_id', user.id).eq('product_key', key));
    } else if (add) {
      const key = add.dataset.cartKey;
      if (!products.has(key)) return;
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
    input.value = String(Math.max(1, Math.min(10, Number.parseInt(input.value, 10) || 1)));
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
