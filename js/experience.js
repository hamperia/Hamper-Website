(() => {
  const query = document.querySelector('[data-product-search]');
  if(query){query.value = new URLSearchParams(location.search).get('q') || '';query.dispatchEvent(new Event('input'));}
  document.querySelectorAll('[data-image-zoom]').forEach(button=>{
    button.addEventListener('click',()=>{
      const dialog=document.createElement('dialog');dialog.className='image-dialog';dialog.setAttribute('aria-label','Product image detail');
      const close=document.createElement('button');close.textContent='Close image ×';close.type='button';
      const image=button.querySelector('img').cloneNode();dialog.append(close,image);document.body.append(dialog);
      close.addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
      dialog.addEventListener('close',()=>{dialog.remove();button.focus()});dialog.showModal();
    });
  });
})();
