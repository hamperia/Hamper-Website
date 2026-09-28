const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {matches}=require('../js/catalog-filter.js');
test('discovery search matches all words, ignores case and respects budgets',()=>{
 const item={text:'Premium Diwali hamper almonds candle',price:2499};
 assert.ok(matches(item,' CANDLE premium ',2500));
 assert.equal(matches(item,'candle',1500),false);
 assert.equal(matches(item,'bottle',0),false);
 assert.ok(matches(item,'',0));
});
test('admin-hidden products never reappear when filters change',()=>{
 assert.equal(matches({text:'candle',price:99,unavailable:true},'',0),false);
 assert.equal(matches({text:'candle',price:99,unavailable:true},'candle',1000),false);
});
test('search is excluded from indexing and product listings precede longer guides',()=>{
 const search=fs.readFileSync('search/index.html','utf8');assert.match(search,/noindex,follow/);assert.match(search,/data-product-budget/);
 const collection=fs.readFileSync('dry-fruit-hampers/index.html','utf8');assert.ok(collection.indexOf('data-collection-slug')<collection.indexOf('class="wrap collection-story"'));
 assert.doesNotMatch(fs.readFileSync('sitemap.xml','utf8'),/\/search\//);
});
