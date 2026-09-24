(() => {
  'use strict';
  const gate = document.querySelector('[data-producer-gate]');
  const content = document.querySelector('[data-producer-content]');
  if (!gate || !content || !window.hamperia) return;
  content.remove();
  gate.hidden = false;
  gate.innerHTML = '<p class="eyebrow">Product hosting</p><h2>Submissions are paused.</h2><p>Hamperia is currently publishing products through its admin account only.</p><a class="button" href="../">Back to home</a>';
})();
