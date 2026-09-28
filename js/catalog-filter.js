(function(root){
  const matches=(item,query,max)=>!item.unavailable && (!Number(max)||Number(item.price)<=Number(max)) && String(query||'').trim().toLowerCase().split(/\s+/).every(word=>String(item.text||'').toLowerCase().includes(word));
  if(typeof module==='object'&&module.exports) module.exports={matches};
  else root.hamperiaFilter={matches};
})(typeof window==='undefined'?globalThis:window);
