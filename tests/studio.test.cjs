const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {clean,describe,createStore,bundleQuantities}=require('../js/personalisation.js');
const {createShoppingState}=require('../js/shopping-state.js');
const root=path.join(__dirname,'..');
function storage(){const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
test('gift messages and logo preferences are isolated by account and restored after sign-out',()=>{
 const db=storage(),notes=createStore(db),shop=createShoppingState(db);
 assert.throws(()=>notes.set('catalog:gift',{message:'Hello'}),/Sign in/);
 notes.activate('alice');shop.activate('alice');shop.cart.set('catalog:gift',2);shop.save();
 notes.set('catalog:gift',{recipient:'Sam',message:'Welcome, Sam',logo:'https://example.com/brand.png'});
 shop.signOut();notes.activate(null);assert.equal(shop.cart.size,0);assert.equal(notes.get('catalog:gift').message,'');
 notes.activate('bob');shop.activate('bob');assert.equal(notes.get('catalog:gift').logo,'');assert.equal(shop.cart.size,0);
 notes.activate('alice');shop.activate('alice');assert.equal(notes.get('catalog:gift').recipient,'Sam');assert.equal(shop.cart.get('catalog:gift'),2);
 notes.remove('catalog:gift');assert.equal(notes.get('catalog:gift').message,'');
});
test('logo links must be HTTPS without embedded credentials; notes are bounded',()=>{
 for(const logo of ['javascript:alert(1)','http://example.com/logo.png','https://user:secret@example.com/a','not a link'])assert.throws(()=>clean({logo}));
 assert.equal(clean({message:'x'.repeat(999)}).message.length,250);
 assert.equal(clean({recipient:'  Sam  '}).recipient,'Sam');
 assert.match(describe({message:'Welcome',company:'Hamperia'}),/Gift message: Welcome\nCompany \/ sender: Hamperia/);
});
test('recipe supply bundles add once per listing and reject insufficient stock atomically',()=>{
 const cart=new Map([['a',1]]),products=new Map([['a',{stockQuantity:3}],['b',{stockQuantity:2}]]);
 const next=bundleQuantities(cart,['a','b','b'],products);assert.deepEqual([...next],[['a',2],['b',1]]);assert.deepEqual([...cart],[['a',1]]);
 assert.throws(()=>bundleQuantities(cart,['b','unknown'],products),/unavailable/);assert.deepEqual([...cart],[['a',1]]);
 assert.throws(()=>bundleQuantities(new Map([['a',3]]),['a'],products),/stock/);
 assert.throws(()=>bundleQuantities(new Map(),['a'],new Map([['a',{stockQuantity:null}]])),/stock/);
});
test('checkout server rejects unquoted branding and validates per-item message limits',async()=>{
 const {cleanPersonalisation}=await import('../supabase/functions/_shared/personalisation.mjs');
 assert.deepEqual(cleanPersonalisation({recipient:'  Sam ',message:'Welcome'}),{recipient:'Sam',message:'Welcome'});
 assert.throws(()=>cleanPersonalisation({logo:'https://example.com/logo.png'}),/quotation/);
 assert.throws(()=>cleanPersonalisation({preferences:'Change contents'}),/quotation/);
 assert.throws(()=>cleanPersonalisation({message:'x'.repeat(251)}),/Invalid/);
 assert.throws(()=>cleanPersonalisation({recipient:42}),/Invalid/);
 assert.deepEqual(cleanPersonalisation(undefined),{});
});
test('every catalogue photo links to a product with contents, quantity, personalisation and parent links',()=>{
 const catalog=JSON.parse(fs.readFileSync(path.join(root,'content/catalogue.json')));
 for(const product of catalog.products){const html=fs.readFileSync(path.join(root,'products',product.slug,'index.html'),'utf8');
  for(const marker of ['product-title','data-add-quantity','data-buy-now','name="message"','name="logo"','data-product-enquiry','Back to'])assert.ok(html.includes(marker),`${product.slug}: ${marker}`);
  if(product.originalImage){assert.match(html,/Studio presentation/);assert.match(html,/Original gift artwork/);assert.ok(fs.existsSync(path.join(root,'assets',product.originalImage)));}
 }
});
test('corporate enquiry preserves logo and message fields and does not claim to send an order',()=>{
 const html=fs.readFileSync(path.join(root,'bulk-orders/index.html'),'utf8');
 for(const name of ['Logo file link','Gift message','Quantity','Budget','Delivery location'])assert.ok(html.includes(`name="${name}"`));
 assert.match(html,/Nothing has been sent yet/);assert.match(html,/data-download-brief/);
});
