(function () {
  'use strict';
  function matchesArticle(text, topic, query, selectedTopic) {
    const terms = String(query).trim().toLowerCase().split(/\s+/).filter(Boolean);
    return (selectedTopic === 'all' || selectedTopic === topic) && terms.every(term => text.toLowerCase().includes(term));
  }
  function estimateBudget(quantity, price) {
    if (String(quantity).trim() === '' || String(price).trim() === '') return null;
    const count = Number(quantity), rupees = Number(price);
    if (!Number.isInteger(count) || count < 1 || count > 100000 || !Number.isInteger(rupees) || rupees < 1 || rupees > 1000000) return null;
    return count * rupees;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { matchesArticle, estimateBudget };
  if (typeof document === 'undefined') return;

  const tools = document.querySelector('[data-journal-tools]');
  if (tools) {
    const search = tools.querySelector('[data-journal-search]');
    const buttons = [...tools.querySelectorAll('[data-journal-topic]')];
    const cards = [...document.querySelectorAll('#journal-grid [data-journal-card]')];
    let topic = 'all';
    function filter() {
      let count = 0;
      cards.forEach(card => {
        card.hidden = !matchesArticle(card.dataset.search, card.dataset.topic, search.value, topic);
        if (!card.hidden) count++;
      });
      buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.journalTopic === topic)));
      tools.querySelector('[data-journal-count]').textContent = `${count} ${count === 1 ? 'guide' : 'guides'} to explore`;
      document.querySelector('[data-journal-empty]').hidden = count !== 0;
    }
    buttons.forEach(button => button.addEventListener('click', () => { topic = button.dataset.journalTopic; filter(); }));
    search.addEventListener('input', filter);
    document.querySelector('[data-journal-reset]').addEventListener('click', () => { search.value = ''; topic = 'all'; filter(); search.focus(); });
    tools.hidden = false;
    filter();
  }
  document.querySelectorAll('[data-journal-checklist]').forEach(checklist => {
    const checks = [...checklist.querySelectorAll('[data-plan-check]')];
    function update() {
      const count = checks.filter(box => box.checked).length;
      checklist.querySelector('[data-checklist-status]').textContent = count === checks.length ? 'All set — explore the collections below.' : `${count} of ${checks.length} ready`;
    }
    checks.forEach(box => box.addEventListener('change', update));
    checklist.querySelector('[data-checklist-reset]').addEventListener('click', () => { checks.forEach(box => { box.checked = false; }); update(); });
    checklist.hidden = false;
    update();
  });
  document.querySelectorAll('[data-journal-budget]').forEach(tool => {
    const count = tool.querySelector('[data-gift-count]'), price = tool.querySelector('[data-gift-budget]');
    function update() {
      const total = estimateBudget(count.value, price.value);
      tool.querySelector('[data-budget-result]').textContent = total === null ? 'Enter whole numbers: 1–100,000 gifts and ₹1–10,00,000 per gift.' : `Gift budget: ₹${total.toLocaleString('en-IN')}`;
    }
    count.addEventListener('input', update);
    price.addEventListener('input', update);
    tool.hidden = false;
    update();
  });
  const bar = document.querySelector('[data-reading-bar]'), prose = document.querySelector('[data-reading-content]');
  if (bar && prose) {
    let queued = false;
    function update() {
      const bounds = prose.getBoundingClientRect();
      bar.querySelector('progress').value = Math.min(100, Math.max(0, -bounds.top / Math.max(1, bounds.height - window.innerHeight) * 100));
      queued = false;
    }
    function requestUpdate() { if (!queued) { queued = true; window.requestAnimationFrame(update); } }
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    window.addEventListener('load', requestUpdate);
    bar.hidden = false;
    update();
  }
})();
