(() => {
 'use strict';
 const site=new URL('../',document.currentScript.src);
 document.querySelectorAll('[data-gallery-src]').forEach(button=>button.addEventListener('click',()=>{
  const frame=button.closest('.product-image-frame');const image=frame.querySelector('[data-image-zoom] img');image.src=button.dataset.gallerySrc;image.alt=button.dataset.galleryAlt;
  frame.querySelectorAll('[data-gallery-src]').forEach(x=>x.setAttribute('aria-pressed',String(x===button)));
 }));
 document.querySelector('[data-gift-finder]')?.addEventListener('submit',event=>{
  event.preventDefault();const fields=new FormData(event.currentTarget);const allowed=['gift-hampers','employee-gifts','client-gifts','employee-welcome-kits','diwali-gifts'];const collection=fields.get('collection');if(!allowed.includes(collection))return;
  const url=new URL(collection+'/',site);if(fields.get('budget'))url.searchParams.set('budget',fields.get('budget'));location.assign(url.href);
 });
 const budget=document.querySelector('[data-product-budget]');const requested=new URLSearchParams(location.search).get('budget');if(budget&&['1000','1500','2500'].includes(requested)){budget.value=requested;budget.dispatchEvent(new Event('change'));}
 const form=document.querySelector('#bulk-form');if(form){
  const logo=form.elements['Logo file link'];logo?.addEventListener('input',()=>logo.setCustomValidity(''));form.addEventListener('submit',event=>{
   event.preventDefault();if(logo?.value&&!/^https:\/\//i.test(logo.value)){logo.setCustomValidity('Please use an HTTPS link.');logo.reportValidity();return;}if(!form.reportValidity())return;
   const fields=[...new FormData(form)].map(([key,value])=>`${key}: ${String(value).trim()||'Not specified'}`);
   const brief='Hello Hamperia,\n\nPlease prepare a quotation for these gifts.\n\n'+fields.join('\n')+'\n\nPlease confirm availability, branding costs and delivery before ordering.';
   form.dataset.brief=brief;form.querySelector('[data-enquiry-preview]').textContent=brief;const result=form.querySelector('#form-status');result.hidden=false;
   form.querySelector('#email-retry').href=`mailto:contact@hamperiasolutions.com?subject=${encodeURIComponent('Gifting enquiry — '+form.elements['Event type'].value)}&body=${encodeURIComponent(brief)}`;
   result.scrollIntoView({behavior:'smooth',block:'nearest'});
  });
  form.querySelector('[data-download-brief]')?.addEventListener('click',()=>{if(!form.dataset.brief)return;const url=URL.createObjectURL(new Blob([form.dataset.brief],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='hamperia-gifting-brief.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 }
})();
