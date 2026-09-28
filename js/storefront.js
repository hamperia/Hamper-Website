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
  const budget = document.querySelector('[data-product-budget]');
  function filterProducts() {
    const cards = [...document.querySelectorAll('[data-product-card]')];
    const query = (search?.value || '').trim().toLowerCase();
    let count = 0;
    cards.forEach(card => { card.hidden = !window.hamperiaFilter.matches({text:card.dataset.name,price:card.dataset.price,unavailable:card.dataset.catalogHidden === "true"},query,budget?.value); if (!card.hidden) count++; });
    const sorted = [...cards];
    if (sort?.value === 'low') sorted.sort((a,b) => Number(a.dataset.price)-Number(b.dataset.price));
    if (sort?.value === 'high') sorted.sort((a,b) => Number(b.dataset.price)-Number(a.dataset.price));
    sorted.forEach(card => card.parentElement.append(card));
    const status = document.querySelector('[data-result-count]');
    if (status) status.textContent = `${count} product${count === 1 ? '' : 's'}`;
    const empty = document.querySelector('[data-no-results]');
    if (empty) empty.hidden = count !== 0;
  }
  if (search) { search.addEventListener('input', filterProducts); sort?.addEventListener('change', filterProducts); budget?.addEventListener('change',filterProducts); document.addEventListener('hamperia:catalog-updated',filterProducts); filterProducts(); }
  const collection = new URLSearchParams(location.search).get('collection');
  const notes = document.querySelector('#bulk-form textarea');
  if (collection && notes && !notes.value) notes.value = `Interested in: ${collection.slice(0, 200)}\n`;
  document.querySelectorAll('[data-product-rail]').forEach(rail => {
    const track = rail.querySelector('.product-rail-track');
    rail.querySelector('[data-rail-prev]')?.addEventListener('click', () => track.scrollBy({ left: -track.clientWidth * .8, behavior: 'smooth' }));
    rail.querySelector('[data-rail-next]')?.addEventListener('click', () => track.scrollBy({ left: track.clientWidth * .8, behavior: 'smooth' }));
  });
  const scriptBase = document.currentScript.src;
  const shoppingState = document.createElement('script');
  shoppingState.src = new URL('./shopping-state.js', scriptBase).href;
  shoppingState.onload = () => {
    const personalisation = document.createElement('script');
    personalisation.src = new URL('./personalisation.js', scriptBase).href;
    personalisation.onload = () => {
    const commerce = document.createElement('script');
    commerce.src = new URL('./commerce.js', scriptBase).href;
    document.head.append(commerce);
    };
    document.head.append(personalisation);
  };
  const commerceStyles = document.createElement('link');
  commerceStyles.rel = 'stylesheet';
  commerceStyles.href = new URL('../css/commerce.css', document.currentScript.src).href;
  document.head.append(commerceStyles);
  const builderStyles = document.createElement('link');
  builderStyles.rel = 'stylesheet';
  builderStyles.href = new URL('../css/hamper-builder.css', document.currentScript.src).href;
  document.head.append(builderStyles);
  const navigationStyles = document.createElement('link');
  navigationStyles.rel = 'stylesheet';
  navigationStyles.href = new URL('../css/navigation-polish.css', document.currentScript.src).href;
  document.head.append(navigationStyles);
  document.head.append(shoppingState);
})();
const experienceStyle = document.createElement('link');
experienceStyle.rel = 'stylesheet';
experienceStyle.href = new URL('../css/experience.css', document.currentScript.src).href;
document.head.append(experienceStyle);
const experienceScript = document.createElement('script');
experienceScript.src = new URL('./experience.js', document.currentScript.src).href;
document.head.append(experienceScript);

const studioStyle=document.createElement('link');studioStyle.rel='stylesheet';studioStyle.href=new URL('../css/studio.css',document.currentScript.src).href;document.head.append(studioStyle);
const studioScript=document.createElement('script');studioScript.src=new URL('./studio.js',document.currentScript.src).href;document.head.append(studioScript);
