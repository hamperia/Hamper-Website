(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.hamperiaMerchandise=factory();})(typeof window==='undefined'?globalThis:window,()=>{
  const key=item=>item.id+'|'+item.colour;
  function normalise(rows,products){
    if(!Array.isArray(rows))return [];
    const valid=new Map();
    for(const row of rows.slice(0,100)){
      const product=products.find(p=>p.id===row?.id),quantity=Number(row?.quantity);
      if(!product||!product.colours.includes(row.colour)||!Number.isInteger(quantity)||quantity<1||quantity>100000)continue;
      const item={id:product.id,colour:row.colour,quantity};
      const previous=valid.get(key(item));
      item.quantity=Math.min(100000,quantity+(previous?.quantity||0));valid.set(key(item),item);
    }
    return [...valid.values()];
  }
  function parse(value,products){try{return normalise(JSON.parse(value||'[]'),products);}catch{return [];}}
  function describe(rows,products){return normalise(rows,products).map(row=>`${products.find(p=>p.id===row.id).name} — ${row.colour} — quantity ${row.quantity}`).join('\n');}
  return {key,normalise,parse,describe};
});
