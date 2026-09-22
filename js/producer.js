(function () {
  'use strict';
  const form = document.querySelector('#producer-product-form');
  const status = document.querySelector('#producer-status');
  if (!form || !window.hamperia) return;
  if (new URLSearchParams(window.location.search).get('category') === 'diy') {
    form.elements.category.value = 'diy';
  }
  const message = (text, type) => { status.textContent = text; status.className = `form-status ${type || ''}`; status.hidden = false; };
  const submissions = document.createElement('section');
  submissions.className = 'section';
  form.parentElement.append(submissions);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function loadSubmissions() {
    const { data, error } = await window.hamperia.client.from('products').select('name,status,rejection_reason,created_at').eq('producer_id', window.hamperia.state.user.id).order('created_at', { ascending: false });
    submissions.innerHTML = '<h2>Your submissions</h2>' + (error ? '<p>Could not load your submissions. Please reload to try again.</p>' : data.length ? data.map(p => `<article class="review-card"><h3>${escapeHtml(p.name)}</h3><p>Status: ${escapeHtml(p.status)}</p>${p.rejection_reason ? `<p>Admin feedback: ${escapeHtml(p.rejection_reason)}</p>` : ''}</article>`).join('') : '<p>You have not submitted any products yet.</p>');
  }

  window.hamperia.onSession = async (state) => {
    const gate = document.querySelector('[data-producer-gate]');
    const content = document.querySelector('[data-producer-content]');
    if (!state.user) { gate.hidden = false; content.hidden = true; return; }
    if (!['producer', 'admin'].includes(state.role)) {
      gate.hidden = false; content.hidden = true;
      gate.innerHTML = '<p class="eyebrow">Producer access</p><h2>Approval is required.</h2><p>Your account is signed in, but an admin must assign producer access before you can submit products.</p>';
      return;
    }
    gate.hidden = true; content.hidden = false;
    await loadSubmissions();
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const state = window.hamperia.state;
    if (!state.user || !['producer', 'admin'].includes(state.role)) return message('Please sign in with an approved producer account.', 'error');
    const values = Object.fromEntries(new FormData(form).entries());
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    message('Submitting your product…');
    try {
    const { error } = await window.hamperia.client.from('products').insert({
      producer_id: state.user.id,
      name: values.name.trim(),
      description: values.description.trim(),
      category: values.category,
      price: Number(values.price),
      image_url: values.image_url.trim() || null,
      status: 'pending'
    });
    if (error) return message(`Could not submit this product: ${error.message}`, 'error');
    form.reset();
    message('Submitted for admin review. It will appear publicly only after approval.', 'success');
    await loadSubmissions();
    } catch { message('The submission could not be completed. Check your connection and try again.', 'error'); }
    finally { button.disabled = false; }
  });
}());
