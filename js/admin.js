(function () {
  'use strict';
  const list = document.querySelector('#pending-products');
  const gate = document.querySelector('[data-admin-gate]');
  if (!list || !window.hamperia) return;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const message = (text, type) => { list.innerHTML = `<p class="form-status ${type || ''}">${escapeHtml(text)}</p>`; };
  const ordersSection = document.querySelector('[data-admin-orders]');
  const ordersList = document.querySelector('[data-admin-orders-list]');

  async function loadOrders() {
    if (!ordersSection || !ordersList) return;
    if (window.hamperia.state.role !== 'admin') { ordersSection.hidden = true; ordersList.textContent = ''; return; }
    ordersSection.hidden = false;
    const { data, error } = await window.hamperia.client.from('shop_orders')
      .select('id,status,total_paise,delivery_address,created_at,shop_order_items(name,quantity)')
      .in('status', ['paid', 'fulfilled']).order('created_at', { ascending: false }).limit(50);
    if (error) { ordersList.textContent = 'Order history will appear after checkout setup is complete.'; return; }
    if (!data?.length) { ordersList.textContent = 'No paid orders yet.'; return; }
    ordersList.innerHTML = data.map(order => {
      const a = order.delivery_address || {};
      const address = [a.full_name, a.phone, a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).map(escapeHtml).join(', ');
      const products = (order.shop_order_items || []).map(item => `${escapeHtml(item.name)} × ${Number(item.quantity)}`).join(' · ');
      return `<article class="review-card" data-shop-order="${escapeHtml(order.id)}"><div><p class="eyebrow">${escapeHtml(order.status)} · ${escapeHtml(new Date(order.created_at).toLocaleDateString('en-IN'))}</p><h3>Order ${escapeHtml(order.id.slice(0, 8).toUpperCase())}</h3><p>${products}</p><p>${address}</p><strong>₹${(order.total_paise / 100).toLocaleString('en-IN')}</strong></div>${order.status === 'paid' ? '<button class="button" type="button" data-fulfil-order>Mark fulfilled</button>' : ''}</article>`;
    }).join('');
  }

  ordersList?.addEventListener('click', async event => {
    const button = event.target.closest('[data-fulfil-order]');
    const card = event.target.closest('[data-shop-order]');
    if (!button || !card) return;
    button.disabled = true;
    const { data, error } = await window.hamperia.client.rpc('mark_order_fulfilled', { p_order_id: card.dataset.shopOrder });
    if (error || !data) { button.disabled = false; button.textContent = 'Could not update. Retry'; return; }
    await loadOrders();
  });

  async function loadProducts() {
    const state = window.hamperia.state;
    if (!state.user || state.role !== 'admin') { gate.hidden = false; list.hidden = true; return; }
    gate.hidden = true; list.hidden = false;
    const { data, error } = await window.hamperia.client.from('products').select('id, name, description, category, price, image_url, created_at, status').eq('status', 'pending').order('created_at', { ascending: false });
    if (error) return message(`Could not load submissions: ${error.message}`, 'error');
    if (!data?.length) return message('There are no products waiting for review.', 'success');
    list.innerHTML = data.map((product) => {
      const eligible = product.name?.trim().length >= 3 && product.description?.trim().length >= 20 && Number(product.price) > 0 && product.category;
      return `<article class="review-card" data-product-id="${escapeHtml(product.id)}"><div><p class="eyebrow">${escapeHtml(product.category || 'Product')} · Pending</p><h2>${escapeHtml(product.name)}</h2><p>${escapeHtml(product.description || '')}</p><strong>₹${Number(product.price || 0).toLocaleString('en-IN')}</strong><p class="form-help">Approval conditions: meaningful name, at least 20 characters of description, category and positive price. ${eligible ? 'Ready for review.' : 'Incomplete details — reject or ask the producer to revise.'}</p></div><div class="review-actions"><button class="button" data-review="approved" type="button" ${eligible ? '' : 'disabled'}>Approve</button><button class="button secondary" data-review="rejected" type="button">Reject</button></div></article>`;
    }).join('');
    list.querySelectorAll('.review-actions').forEach(actions => {
      const label = document.createElement('label');
      label.textContent = 'Reason for rejection';
      const input = document.createElement('textarea');
      input.dataset.rejectionReason = '';
      input.maxLength = 1000;
      label.append(input);
      actions.prepend(label);
    });
  }

  list.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-review]');
    const card = event.target.closest('[data-product-id]');
    if (!button || !card) return;
    button.disabled = true;
    const status = button.dataset.review;
    const reason = card.querySelector('[data-rejection-reason]').value.trim();
    if (status === 'rejected' && !reason) {
      button.disabled = false;
      const input = card.querySelector('[data-rejection-reason]');
      input.setCustomValidity('Explain what the host needs to improve.'); input.reportValidity();
      input.addEventListener('input', () => input.setCustomValidity(''), { once: true });
      return;
    }
    const { error } = await window.hamperia.client.from('products').update({ status, rejection_reason: status === 'rejected' ? reason : null, approved_at: status === 'approved' ? new Date().toISOString() : null }).eq('id', card.dataset.productId);
    if (error) { button.disabled = false; return message(`Could not update the product: ${error.message}`, 'error'); }
    card.remove();
    if (!list.children.length) message('There are no products waiting for review.', 'success');
  });

  window.hamperia.onSession = async (state) => {
    await loadProducts(state);
    await loadOrders();
    const tools = document.querySelector('[data-admin-tools]');
    if (tools) tools.hidden = !state.user || state.role !== 'admin';
  };

  const roleForm = document.querySelector('#role-form');
  const roleStatus = document.querySelector('#role-status');
  roleForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const state = window.hamperia.state;
    if (state.role !== 'admin') return;
    const values = Object.fromEntries(new FormData(roleForm).entries());
    if (values.email.toLowerCase() === window.hamperia.adminEmail) {
      roleStatus.textContent = 'The primary admin account cannot be changed here.';
      roleStatus.hidden = false;
      return;
    }
    const { data, error } = await window.hamperia.client.from('profiles').update({ role: values.role }).eq('email', values.email.trim().toLowerCase()).select('email, role').maybeSingle();
    roleStatus.textContent = error ? `Could not update the role: ${error.message}` : data ? `${data.email} is now a ${data.role}.` : 'No profile was found for that email yet.';
    roleStatus.className = `form-status ${error ? 'error' : 'success'}`;
    roleStatus.hidden = false;
    if (!error) roleForm.reset();
  });
}());
