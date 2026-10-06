const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {page,customPage,products,colours}=require('../scripts/merchandise-templates.cjs');
const model=require('../js/merchandise-model.js');
test('mixed merchandise retains product, colour and quantity, merging only identical variants',()=>{
 const items=model.normalise([{id:'tumbler',colour:'Black',quantity:20},{id:'tshirt',colour:'Dark green',quantity:50},{id:'tumbler',colour:'Cream',quantity:10},{id:'tumbler',colour:'Black',quantity:5}],products);
 assert.equal(items.length,3);assert.equal(items[0].quantity,25);assert.equal(items[2].colour,'Cream');
 const brief=model.describe(items,products);assert.match(brief,/Tumblers — Black — quantity 25/);assert.match(brief,/T-shirts — Dark green — quantity 50/);
 assert.deepEqual(model.parse(JSON.stringify(items),products),items);
});
test('invalid shared selections are rejected and quantities are bounded',()=>{
 assert.deepEqual(model.parse('invalid',products),[]);
 assert.deepEqual(model.normalise([{id:'tumbler',colour:'Blue',quantity:2},{id:'fake',colour:'Black',quantity:2},{id:'tshirt',colour:'Black',quantity:-1},{id:'tshirt',colour:'Black',quantity:1.5}],products),[]);
 assert.equal(model.normalise([{id:'tshirt',colour:'Black',quantity:100000},{id:'tshirt',colour:'Black',quantity:2}],products)[0].quantity,100000);
});
test('catalogue and custom form are separate and use the confirmed colour range',()=>{
 assert.deepEqual(colours,['Dark green','Black','Cream']);
 assert.doesNotMatch(page(),/merch-shirt|id="merch-request-form"/);
 assert.match(customPage(),/id="merch-request-form"/);
 assert.doesNotMatch(customPage(),/merch-shirt|T-shirt preview/);
 for(const product of products)assert.ok(fs.existsSync(path.join(__dirname,'../assets',product.image)),product.image);
 const html=fs.readFileSync(path.join(__dirname,'../corporate-merchandise/custom/index.html'),'utf8');
 assert.match(html,/merchandise-model\.js/);assert.match(html,/noindex,follow/);assert.match(html,/Nothing has been sent yet/);
});
