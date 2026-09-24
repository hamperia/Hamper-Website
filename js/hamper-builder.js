(() => {
  'use strict';
  const root = document.querySelector('[data-hamper-builder]');
  if (!root) return;
  const site = new URL('../', document.currentScript.src);
  const asset = name => new URL(`assets/${name}`, site).href;

  const steps = [
    { key: 'base', number: '01', title: 'Choose a hamper', hint: 'Start with the basket or box you want to fill.', multiple: false, options: [
      { id: 'woven-basket', name: 'Woven basket', image: 'diy-containers-concept.png' },
      { id: 'gift-box', name: 'Gift box', image: 'diy-containers-concept.png' },
      { id: 'magnetic-box', name: 'Magnetic gift box', image: 'builder-magnetic-box.png' },
      { id: 'round-box', name: 'Round gift box', image: 'builder-round-box.png' },
      { id: 'wooden-tray', name: 'Wooden tray', image: 'diy-tray.jpg' }
    ] },
    { key: 'contents', number: '02', title: 'Choose what goes inside', hint: 'Pick a few things your recipient will enjoy.', multiple: true, options: [
      { id: 'chocolates', name: 'Chocolates', image: 'chocolate-hamper-concept.png' },
      { id: 'dry-fruits', name: 'Dry fruits', image: 'dry-fruit-three-jar.png' },
      { id: 'tea', name: 'Tea', image: 'wellness-hamper-concept.png' },
      { id: 'candle', name: 'Scented candle', image: 'wellness-hamper-concept.png' },
      { id: 'journal', name: 'Journal', image: 'builder-journal.png' },
      { id: 'coffee', name: 'Coffee', image: 'builder-coffee.png' },
      { id: 'bottle', name: 'Insulated bottle', image: 'builder-bottle.png' },
      { id: 'tumbler', name: 'Travel tumbler', image: 'builder-tumbler.png' }
    ] },
    { key: 'decor', number: '03', title: 'Choose decorative items', hint: 'Finish it with texture, colour and a message.', multiple: true, options: [
      { id: 'ribbon', name: 'Satin ribbon', image: 'diy-tags.jpg' },
      { id: 'tulle', name: 'Tulle wrap', image: 'diy-net.jpg' },
      { id: 'filler', name: 'Paper filler', image: 'diy-filler.jpg' },
      { id: 'flowers', name: 'Dried flowers', image: 'wellness-hamper-concept.png' },
      { id: 'name-tag', name: 'Name tag', image: 'diy-tags.jpg' }
    ] }
  ];
  const byStep = Object.fromEntries(steps.map(step => [step.key, new Map(step.options.map(option => [option.id, option]))]));
  let builderUser;
  const state = {
    base: null,
    contents: new Set(),
    decor: new Set()
  };
  const options = root.querySelector('[data-builder-options]');
  const visual = root.querySelector('[data-builder-visual]');
  const summary = root.querySelector('[data-builder-summary]');
  const available = root.querySelector('[data-builder-available]');
  const enquiry = root.querySelector('[data-builder-enquiry]');
  const status = document.createElement('p');
  status.className = 'builder-status'; status.role = 'status';
  enquiry.before(status);

  options.innerHTML = steps.map(step => `<section class="builder-step" aria-labelledby="builder-${step.key}"><div class="builder-step-heading"><span>${step.number}</span><div><h3 id="builder-${step.key}">${step.title}</h3><p>${step.hint}</p></div></div><div class="builder-options-grid">${step.options.map(option => `<button type="button" class="builder-option" data-builder-step="${step.key}" data-builder-id="${option.id}" aria-pressed="false">${step.key === 'base' && ['woven-basket', 'gift-box'].includes(option.id) ? `<span class="builder-option-photo ${option.id}" style="background-image:url('${asset(option.image)}')" aria-hidden="true"></span>` : `<img src="${asset(option.image)}" alt="" loading="lazy" width="130" height="110">`}<span>${option.name}</span></button>`).join('')}</div></section>`).join('');

  function picked(step, id) { return step === 'base' ? state.base === id : state[step].has(id); }
  function names(step) { return [...state[step]].map(id => byStep[step].get(id).name); }
  const listedSupplies = {
    tulle: { slug: 'gold-tulle-wrap', name: 'Gold Tulle Net Wrapping' },
    filler: { slug: 'paper-filler', name: 'Shredded Paper Filler' },
    ribbon: { slug: 'tags-and-ribbons', name: 'Custom Tags & Satin Ribbons' },
    'name-tag': { slug: 'tags-and-ribbons', name: 'Custom Tags & Satin Ribbons' }
  };
  function selectedEntries(step) {
    const ids = step === 'base' ? (state.base ? [state.base] : []) : [...state[step]];
    return ids.map(id => ({ step, id, name: byStep[step].get(id).name }));
  }
  function selectedGroup(step, title, empty) {
    const entries = selectedEntries(step);
    return `<div class="builder-choice-group"><strong>${title}</strong><div>${entries.length ? entries.map(item => `<span class="builder-selected-chip">${item.name}<button type="button" data-builder-remove-step="${step}" data-builder-remove-id="${item.id}" aria-label="Remove ${item.name} from hamper">Remove ×</button></span>`).join('') : `<span class="builder-empty-choice">${empty}</span>`}</div></div>`;
  }
  function sample() {
    if (state.contents.has('chocolates')) return ['chocolate-hamper-concept.png', 'A chocolate hamper inspiration photo', 'Sample hamper inspiration · your final mix will differ'];
    if (state.contents.has('dry-fruits')) return ['dry-fruit-three-jar.png', 'A dry-fruit hamper inspiration photo', 'Sample hamper inspiration · your final mix will differ'];
    if (state.contents.has('candle') || state.contents.has('tea')) return ['wellness-hamper-concept.png', 'A wellness hamper inspiration photo', 'Sample hamper inspiration · your final mix will differ'];
    const first = state.contents.values().next().value;
    if (first) {
      const item = byStep.contents.get(first);
      return [item.image, item.name, 'Selected product inspiration · your final mix will differ'];
    }
    if (state.base) {
      const item = byStep.base.get(state.base);
      return [item.image, item.name, 'Selected hamper base · add products to continue'];
    }
    return ['diy-containers-concept.png', 'Empty hamper, gift box and tray inspiration', 'Choose a base and products to begin'];
  }
  function render() {
    root.querySelectorAll('[data-builder-step]').forEach(button => {
      const selected = picked(button.dataset.builderStep, button.dataset.builderId);
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('selected', selected);
    });
    const [sampleFile, sampleAlt, sampleCaption] = sample();
    const chosen = [...state.contents].map(id => byStep.contents.get(id));
    visual.innerHTML = `<div class="builder-visual-grid"><div class="builder-composition ${state.base || 'empty'}"><p class="builder-mini-label">Your selected pieces</p><div class="builder-mini-items">${chosen.length ? chosen.map(item => `<figure><img src="${asset(item.image)}" alt="" width="90" height="90"><figcaption>${item.name}</figcaption></figure>`).join('') : '<p>Choose products to see them here.</p>'}</div><div class="builder-mini-finish">${names('decor').map(name => `<span>${name}</span>`).join('')}</div><p class="builder-base-label">${state.base ? byStep.base.get(state.base).name : 'Choose a hamper base'}</p></div><figure class="builder-sample"><img src="${asset(sampleFile)}" alt="${sampleAlt}" width="450" height="450"><figcaption>${sampleCaption}</figcaption></figure></div>`;
    const selected = [...selectedEntries('base'), ...selectedEntries('contents'), ...selectedEntries('decor')];
    summary.innerHTML = `<h3>Your choices</h3>${selectedGroup('base', 'Hamper', 'Choose one')}${selectedGroup('contents', 'Inside', 'Choose at least one')}${selectedGroup('decor', 'Decorations', 'Add your finishing touches')}${selected.length ? '<button type="button" class="builder-clear" data-builder-clear>Clear all choices</button>' : ''}`;
    const purchasable = new Map();
    const unlisted = [];
    selected.forEach(item => {
      const listing = listedSupplies[item.id];
      if (listing) purchasable.set(listing.slug, listing);
      else unlisted.push(item.name);
    });
    available.innerHTML = selected.length ? `<p class="builder-availability-label">Matching listed supplies</p>${purchasable.size ? `<ul>${[...purchasable.values()].map(item => `<li><a href="../products/${item.slug}/">${item.name} · View & add to basket →</a></li>`).join('')}</ul>` : '<p>No selected pieces have an individual listing yet.</p>'}${unlisted.length ? `<p>Ask us about individual availability for: ${unlisted.join(', ')}.</p>` : ''}` : '<p>Choose pieces above to see available individual supplies.</p>';
    const ready = Boolean(state.base && state.contents.size);
    enquiry.setAttribute('aria-disabled', String(!ready));
    enquiry.classList.toggle('is-disabled', !ready);
    const lines = ['Hello Hamperia,', '', 'I would like a custom hamper with:', `Hamper: ${state.base ? byStep.base.get(state.base).name : 'Not selected'}`, `Contents: ${names('contents').join(', ') || 'Not selected'}`, `Decorations: ${names('decor').join(', ') || 'None selected'}`, '', 'Please confirm what is available, the final contents and a price.'];
    enquiry.href = `mailto:contact@hamperiasolutions.com?subject=${encodeURIComponent('My custom hamper idea')}&body=${encodeURIComponent(lines.join('\n'))}`;
    if (builderUser) try { localStorage.setItem(`hamperia_builder_v2:${builderUser}`, JSON.stringify({ base: state.base, contents: [...state.contents], decor: [...state.decor] })); } catch { /* Private browsing can block storage. */ }
  }
  function loadFor(user) {
    const nextId = user?.id || null;
    if (builderUser === nextId) return;
    builderUser = nextId;
    let saved = {};
    if (builderUser) {
      try { saved = JSON.parse(localStorage.getItem(`hamperia_builder_v2:${builderUser}`) || localStorage.getItem('hamperia_builder_v1') || '{}') || {}; } catch { /* Start fresh. */ }
    }
    localStorage.removeItem('hamperia_builder_v1');
    state.base = byStep.base.has(saved.base) ? saved.base : null;
    state.contents = new Set((Array.isArray(saved.contents) ? saved.contents : []).filter(id => byStep.contents.has(id)));
    state.decor = new Set((Array.isArray(saved.decor) ? saved.decor : []).filter(id => byStep.decor.has(id)));
    status.textContent = '';
    render();
  }
  function requireAccount() {
    if (builderUser) return false;
    window.hamperia?.promptSignIn('Sign in to build and save your personalised hamper.');
    return true;
  }
  root.addEventListener('click', event => {
    if (!event.target.closest('[data-builder-step], [data-builder-remove-step], [data-builder-clear]')) return;
    if (requireAccount()) return;
    if (event.target.closest('[data-builder-clear]')) {
      state.base = null;
      state.contents.clear();
      state.decor.clear();
      status.textContent = '';
      render();
      return;
    }
    const remove = event.target.closest('[data-builder-remove-step]');
    if (remove) {
      const step = remove.dataset.builderRemoveStep;
      const id = remove.dataset.builderRemoveId;
      if (step === 'base') {
        if (state.base === id) state.base = null;
      } else if (byStep[step]?.has(id)) state[step].delete(id);
      status.textContent = '';
      render();
      return;
    }
    const button = event.target.closest('[data-builder-step]');
    if (!button) return;
    const { builderStep: step, builderId: id } = button.dataset;
    if (!byStep[step]?.has(id)) return;
    if (step === 'base') state.base = state.base === id ? null : id;
    else if (state[step].has(id)) state[step].delete(id);
    else state[step].add(id);
    status.textContent = '';
    render();
  });
  enquiry.addEventListener('click', event => {
    if (requireAccount()) { event.preventDefault(); return; }
    if (state.base && state.contents.size) return;
    event.preventDefault();
    status.textContent = 'Choose a hamper and at least one product before requesting your quote.';
  });
  render();
  if (window.hamperia) {
    window.hamperia.sessionListeners.push(session => loadFor(session.user));
    window.hamperia.beforeSignOutListeners.push(() => loadFor(null));
    void window.hamperia.ready.then(() => loadFor(window.hamperia.state.user));
  }
})();
