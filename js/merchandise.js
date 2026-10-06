(() => {
 'use strict';
 const data=document.getElementById('merchandise-data');if(!data)return;
 const products=JSON.parse(data.textContent),model=window.hamperiaMerchandise;
 const custom=Boolean(document.querySelector('#merch-request-form'));
 const assetBase=custom?'../../assets/':'../assets/';
 let selection=model.parse(new URLSearchParams(location.search).get('items'),products),brief='';
 const tabs=[...document.querySelectorAll('[data-merch-tab]')];
 const activate=index=>tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;document.getElementById(tab.getAttribute('aria-controls')).hidden=i!==index;});
 tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>activate(index));tab.addEventListener('keydown',event=>{const next=event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:-1;if(next<0)return;event.preventDefault();activate(next);tabs[next].focus();});});if(tabs.length)activate(0);
 const container=document.querySelector('[data-merch-selection]');
 function element(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text)el.textContent=text;return el;}
 function render(){
  container.replaceChildren();
  if(!selection.length)container.append(element('p','','Choose a product and colour to start your selection.'));
  for(const item of selection){
   const product=products.find(p=>p.id===item.id),row=element('article','merch-selected-row');
   const picture=element(product.crop?'span':'img',product.crop?`merch-selected-photo merch-photo-crop crop-${product.crop}`:'merch-selected-photo');
   if(product.crop){picture.setAttribute('role','img');picture.setAttribute('aria-label',product.name);}else{picture.src=assetBase+product.image;picture.alt=product.name;}
   const detail=element('div','merch-selected-info');detail.append(element('h3','',product.name),element('p','',item.colour));
   const label=element('label','','Quantity');const input=element('input');input.type='number';input.min='1';input.max='100000';input.step='1';input.value=item.quantity;input.setAttribute('aria-label',`${product.name}, ${item.colour} quantity`);
   input.addEventListener('input',()=>{const n=Number(input.value);if(Number.isInteger(n)&&n>=1&&n<=100000){item.quantity=n;syncLinks();}});
   input.addEventListener('change',()=>{input.value=item.quantity;});label.append(input);
   const remove=element('button','merch-remove','Remove');remove.type='button';remove.setAttribute('aria-label',`Remove ${product.name}, ${item.colour}`);remove.addEventListener('click',()=>{selection=selection.filter(x=>model.key(x)!==model.key(item));render();});
   row.append(picture,detail,label,remove);container.append(row);
  }
  syncLinks();
 }
 function syncLinks(){
  const query=selection.length?'?items='+encodeURIComponent(JSON.stringify(selection)):'';
  document.querySelectorAll('[data-custom-link]').forEach(a=>a.href='custom/'+query);
  const back=document.querySelector('[data-back-catalogue]');if(back)back.href='../'+query;
  // Only product choices go into this URL; contact details and artwork never do.
  history.replaceState(null,'',location.pathname+query+location.hash);
  const result=document.querySelector('[data-merch-result]');if(result)result.hidden=true;
 }
 function add(form,id){const fields=new FormData(form);const rows=model.normalise([...selection,{id,colour:fields.get('colour'),quantity:Number(fields.get('quantity'))}],products);selection=rows;render();const product=products.find(p=>p.id===id);document.querySelector('[data-merch-status]').textContent=`Added ${product.name} in ${fields.get('colour')}. Your selection is below.`;}
 document.querySelectorAll('[data-merch-add]').forEach(form=>form.addEventListener('submit',event=>{event.preventDefault();if(form.reportValidity())add(form,form.dataset.merchAdd);}));
 const extra=document.querySelector('[data-merch-extra]');extra?.addEventListener('submit',event=>{event.preventDefault();if(extra.reportValidity())add(extra,extra.elements.product.value);});
 const form=document.querySelector('#merch-request-form');
 if(form){
  form.addEventListener('input',()=>{form.querySelector('[data-merch-result]').hidden=true;});
  form.addEventListener('submit',event=>{
   event.preventDefault();if(!form.reportValidity())return;
   const error=form.querySelector('[data-merch-error]');error.hidden=selection.length>0;
   if(!selection.length){error.textContent='Add at least one product to your enquiry.';return;}
   const fields=[...new FormData(form)].map(([key,value])=>`${key}: ${String(value).trim()||'Not specified'}`);
   brief=['Hello Hamperia,','','Please quote for these merchandise items:',model.describe(selection,products),'',...fields,'','Logo file: '+(form.querySelector('[data-merch-logo]').files?.[0]?.name||'Not provided'),'Reference design: '+(form.querySelector('[data-merch-design]').files?.[0]?.name||'Not provided'),'','I will attach the artwork to this email. Please confirm specifications, colours, branding, price and delivery, and send a final proof before production.'].join('\n');
   form.querySelector('[data-merch-brief]').textContent=brief;
   form.querySelector('[data-merch-email]').href='mailto:contact@hamperiasolutions.com?subject='+encodeURIComponent('Merchandise enquiry — '+form.elements.Company.value)+'&body='+encodeURIComponent(brief);
   form.querySelector('[data-merch-result]').hidden=false;
  });
  form.querySelector('[data-merch-download]').addEventListener('click',()=>{if(!brief)return;const url=URL.createObjectURL(new Blob([brief],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='hamperia-merchandise-brief.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 }
 render();
})();
