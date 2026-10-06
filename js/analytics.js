/* Hamperia GA4 setup and privacy-safe commerce events. Never send account or form data. */
(function () {
  'use strict';

  const measurementId = String(window.HAMPERIA_GA_MEASUREMENT_ID || '').trim();
  const enabled = /^G-[A-Z0-9]+$/i.test(measurementId);

  function send(name, params = {}) {
    if (enabled && typeof window.gtag === 'function') window.gtag('event', name, params);
  }

  function safeReferrer(value) {
    try {
      const referrer = new URL(value);
      return referrer.origin + referrer.pathname;
    } catch { return ''; }
  }

  function cleanUtm() {
    const query = new URLSearchParams(location.search);
    const map = {
      utm_id: 'campaign_id', utm_source: 'campaign_source', utm_medium: 'campaign_medium',
      utm_name: 'campaign_name', utm_content: 'campaign_content'
    };
    return Object.fromEntries(Object.entries(map).flatMap(([source, target]) => {
      const value = query.get(source);
      return value && value.length <= 100 ? [[target, value]] : [];
    }));
  }

  function itemFrom(node, index) {
    const card = node?.matches?.('[data-product-slug]') ? node : node?.closest?.('[data-product-slug]');
    if (!card) return null;
    const name = card.querySelector('.shop-card-body h3')?.textContent?.trim() || card.dataset.productName || '';
    const price = Number(card.dataset.price);
    return {
      item_id: card.dataset.productSlug,
      item_name: name.slice(0, 100),
      item_category: String(card.dataset.category || 'gift').slice(0, 60),
      ...(Number.isFinite(price) && price >= 0 ? { price } : {}),
      ...(Number.isInteger(index) ? { index } : {})
    };
  }

  function itemByKey(key, quantity = 1) {
    const button = [...document.querySelectorAll('[data-cart-key], [data-wish-key]')]
      .find(node => node.dataset.cartKey === key || node.dataset.wishKey === key);
    const item = itemFrom(button, undefined);
    if (item) return { ...item, quantity };
    if (!button) return null;
    const detail = button.closest('.product-detail');
    const slug = String(key || '').replace(/^catalog:/, '');
    const name = detail?.querySelector('.product-title')?.textContent?.trim();
    const price = Number((detail?.querySelector('h2')?.textContent || '').replace(/[^\d.]/g, ''));
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !name) return null;
    return { item_id: slug, item_name: name.slice(0, 100), item_category: 'gift', quantity,
      ...(Number.isFinite(price) ? { price } : {}) };
  }

  function trackItems(name, items, value) {
    const safeItems = items.filter(Boolean);
    if (safeItems.length) send(name, { currency: 'INR', ...(Number.isFinite(value) ? { value } : {}), items: safeItems });
  }

  window.hamperiaAnalytics = {
    enabled,
    send,
    trackItems,
    itemByKey,
    track(name, item, value) {
      if (!item) return;
      send(name, { currency: 'INR', value: Number.isFinite(value) ? value : undefined, items: [item] });
    }
  };

  if (!enabled) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  const tag = document.createElement('script');
  tag.async = true;
  tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
  document.head.append(tag);
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: true,
    page_location: location.origin + location.pathname,
    page_path: location.pathname,
    page_title: document.title,
    page_referrer: safeReferrer(document.referrer),
    currency: 'INR',
    ...cleanUtm()
  });

  const detail = document.querySelector('.product-detail');
  if (detail) {
    const button = detail.querySelector('[data-cart-key], [data-wish-key]');
    const item = itemByKey(button?.dataset.cartKey || button?.dataset.wishKey);
    const priceText = detail.querySelector('h2')?.textContent || '';
    const price = Number(priceText.replace(/[^\d.]/g, ''));
    if (item) {
      if (Number.isFinite(price)) item.price = price;
      send('view_item', { currency: 'INR', value: Number.isFinite(price) ? price : undefined, items: [item] });
    }
  }

  document.querySelectorAll('.shop-grid, .product-rail-track').forEach((grid, listIndex) => {
    const cards = [...grid.querySelectorAll('[data-product-slug]')].filter(card => !card.hidden);
    const items = cards.map(itemFrom).filter(Boolean);
    cards.forEach(card => { card.dataset.gaListed = 'true'; });
    if (items.length) {
      const heading = grid.closest('section')?.querySelector('h2')?.textContent?.trim() ||
        document.querySelector('[data-collection-slug]')?.dataset.collectionSlug || 'Hamperia products';
      send('view_item_list', { item_list_name: heading.slice(0, 100), item_list_id: 'list_' + listIndex, items });
    }
  });

  document.addEventListener('hamperia:catalog-updated', () => {
    const newCards = [...document.querySelectorAll('[data-product-card][data-product-slug]:not([data-ga-listed])')]
      .filter(card => !card.hidden);
    newCards.forEach(card => { card.dataset.gaListed = 'true'; });
    const listedItems = newCards.map(itemFrom).filter(Boolean);
    if (listedItems.length) send('view_item_list', {
      item_list_name: document.querySelector('[data-collection-slug]')?.dataset.collectionSlug || 'Hamperia products',
      items: listedItems
    });
    const detail = document.querySelector('[data-catalog-detail] .product-detail');
    const key = detail?.querySelector('[data-cart-key]')?.dataset.cartKey;
    const item = itemByKey(key);
    if (item && !detail.dataset.gaViewed) {
      detail.dataset.gaViewed = 'true';
      send('view_item', { currency: 'INR', value: item.price, items: [item] });
    }
  });

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    const card = link?.closest('[data-product-slug]');
    if (card) {
      const item = itemFrom(card, [...card.parentElement.querySelectorAll('[data-product-slug]')].indexOf(card));
      if (item) send('select_item', { item_list_name: card.closest('section')?.querySelector('h2')?.textContent?.trim() || 'Hamperia products', items: [item] });
    }
    if (event.target.closest('[data-builder-share]')) send('share', { content_type: 'hamper_design' });
    if (link?.matches('a[href^="mailto:"]')) send('generate_lead', { method: 'email' });
    if (event.target.closest('[data-download-brief]')) send('file_download', { file_name: 'hamperia-gifting-brief.txt' });
  });

  if (location.pathname.endsWith('/search/') || location.pathname.endsWith('/search')) {
    const hasQuery = Boolean(new URLSearchParams(location.search).get('q'));
    if (hasQuery) send('site_search', { has_search_term: true });
  }
}());
