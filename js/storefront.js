(() => {
  'use strict';
  const corporate = document.querySelector('.corporate-menu');
  const profileMenu = document.querySelector('.profile-menu');
  document.addEventListener('click', event => {
    if (corporate && !corporate.contains(event.target)) corporate.open = false;
    if (profileMenu && !profileMenu.contains(event.target)) profileMenu.open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && corporate?.open) {
      corporate.open = false;
      corporate.querySelector('summary').focus();
    }
    if (event.key === 'Escape' && profileMenu?.open) {
      profileMenu.open = false;
      profileMenu.querySelector('summary').focus();
    }
  });
  const search = document.querySelector('[data-product-search]');
  const sort = document.querySelector('[data-product-sort]');
  const cards = [...document.querySelectorAll('[data-product-card]')];
  function filterProducts() {
    const query = (search?.value || '').trim().toLowerCase();
    let count = 0;
    cards.forEach(card => { card.hidden = !card.dataset.name.includes(query); if (!card.hidden) count++; });
    const sorted = [...cards];
    if (sort?.value === 'low') sorted.sort((a,b) => Number(a.dataset.price)-Number(b.dataset.price));
    if (sort?.value === 'high') sorted.sort((a,b) => Number(b.dataset.price)-Number(a.dataset.price));
    sorted.forEach(card => card.parentElement.append(card));
    const status = document.querySelector('[data-result-count]');
    if (status) status.textContent = `${count} product${count === 1 ? '' : 's'}`;
    const empty = document.querySelector('[data-no-results]');
    if (empty) empty.hidden = count !== 0;
  }
  if (search) { search.addEventListener('input', filterProducts); sort?.addEventListener('change', filterProducts); filterProducts(); }
  const collection = new URLSearchParams(location.search).get('collection');
  const notes = document.querySelector('#bulk-form textarea');
  if (collection && notes && !notes.value) notes.value = `Interested in: ${collection.slice(0, 200)}\n`;
})();
