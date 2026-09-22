// Keep bookmarked index.html links working while showing the clean directory URL.
if (window.location.pathname.endsWith('/index.html')) {
 window.history.replaceState(null, '', window.location.pathname.slice(0, -10) + window.location.search + window.location.hash);
}
const menu = document.querySelector('.menu');
const nav = document.querySelector('.nav-links');
menu?.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); nav.classList.toggle('open', open); menu.textContent = open ? 'Close ✕' : 'Menu ☰'; });
document.addEventListener('keydown', event => { if(event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') { menu.click(); menu.focus(); } });
const form = document.querySelector('#bulk-form');
if (form) {
 const date = form.querySelector('[name="Event date"]');
 const now = new Date(); date.min = [now.getFullYear(), String(now.getMonth()+1).padStart(2,'0'), String(now.getDate()).padStart(2,'0')].join('-');
 form.addEventListener('submit', event => {
  event.preventDefault(); if (!form.reportValidity()) return;
  const entries = [...new FormData(form).entries()];
  const body = 'Hello Hamperia Solutions,\r\n\r\nI would like to enquire about custom gifts for my event.\r\n\r\n' + entries.map(([key,value]) => key + ': ' + value.trim()).join('\r\n') + '\r\n\r\nPlease share availability and a quotation. Thank you!';
  const url = 'mailto:contact@hamperiasolutions.com?subject=' + encodeURIComponent('Bulk gift inquiry — ' + form.elements['Event type'].value) + '&body=' + encodeURIComponent(body);
  document.querySelector('#email-retry').href = url;
  document.querySelector('#form-status').hidden = false;
  window.location.href = url;
 });
}
