const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
test('sitemap URLs have unique metadata, canonical URLs, valid schema and local assets', () => {
 const xml=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
 const urls=[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
 assert.equal(new Set(urls).size,urls.length);
 const titles=new Set();
 for(const url of urls){
  const file=path.join(root,new URL(url).pathname,'index.html');
  const html=fs.readFileSync(file,'utf8');
  assert.ok(html.includes(`rel="canonical" href="${url}"`),url);
  assert.doesNotMatch(html, /name="robots" content="noindex/,url);
  const title=html.match(/<title>(.*?)<\/title>/s)?.[1];
  assert.ok(title && !titles.has(title),url); titles.add(title);
  assert.match(html, /name="description" content="[^"]+"/,url);
  const schemas=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)];
  assert.ok(schemas.length,url);
  for(const match of schemas) assert.ok(JSON.parse(match[1])['@context']);
  for(const match of html.matchAll(/<img\b[^>]*>/g)) {
   assert.match(match[0], /alt="[^"]*"/,url);
   const src=match[0].match(/src="([^"]+)"/)?.[1];
   if(!src || /^(https?:|data:)/.test(src)) continue;
   assert.ok(fs.existsSync(path.resolve(path.dirname(file),src)),`${url}: ${src}`);
  }
 }
});
test('private pages remain excluded from search and image payload is reduced', () => {
 const xml=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
 for(const slug of ['auth','auth/signup','account','admin','cart','wishlist','checkout','orders']){
  assert.ok(!xml.includes(`https://hamperiasolutions.com/${slug}/`));
  assert.match(fs.readFileSync(path.join(root,slug,'index.html'),'utf8'),/name="robots" content="noindex/);
 }
 const images=require('../content/image-manifest.json');
 assert.ok(images.reduce((n,i)=>n+i.after,0)<images.reduce((n,i)=>n+i.before,0)/2);
 for(const item of images) {
  const bytes=fs.readFileSync(path.join(root,'assets',item.image));
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
 }
});
