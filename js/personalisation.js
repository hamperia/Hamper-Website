(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.hamperiaPersonalisation=api;})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const limits={recipient:80,message:250,company:100,logo:500,preferences:250};
 function clean(value={}){
  const result={};for(const [key,max] of Object.entries(limits))result[key]=typeof value[key]==='string'?value[key].trim().slice(0,max):'';
  if(result.logo){let url;try{url=new URL(result.logo);}catch{throw new Error('Enter a valid HTTPS link to your logo.');}if(url.protocol!=='https:'||url.username||url.password)throw new Error('Use an HTTPS logo link without a password in the URL.');result.logo=url.href;}
  return result;
 }
 function describe(value){const p=clean(value);return Object.entries(p).filter(([,v])=>v).map(([k,v])=>`${({recipient:'Recipient',message:'Gift message',company:'Company / sender',logo:'Logo file',preferences:'Preferences'})[k]}: ${v}`).join('\n');}
 function createStore(storage){let user=null;let data={};const key=id=>`hamperia_personalisation_v1:${id}`;function save(){if(user)storage.setItem(key(user),JSON.stringify(data));}return {
  activate(id){user=id||null;data={};if(user)try{const saved=JSON.parse(storage.getItem(key(user))||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))data=saved;}catch{}},
  get(item){try{return clean(data[item]);}catch{return clean();}},
  set(item,value){if(!user)throw new Error('Sign in to save your personalisation.');data[item]=clean(value);save();return data[item];},
  remove(item){delete data[item];save();},
  get userId(){return user;}
 };}
 function bundleQuantities(cart,keys,products){const result=new Map(cart);for(const key of new Set(keys)){const product=products.get(key);if(!product)throw new Error('A selected supply is unavailable.');const next=(result.get(key)||0)+1;if(next>10||product.stockQuantity===null||next>(product.stockQuantity??10))throw new Error('Not enough stock for all selected supplies.');result.set(key,next);}return result;}
 return {clean,describe,createStore,bundleQuantities};
});
