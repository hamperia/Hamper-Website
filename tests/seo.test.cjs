const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
test('category guidance uses catalogue prices and product metadata identifies the contents', () => {
 const {categoryGuide}=require('../scripts/category-guide.cjs');
 const {productMetadata}=require('../scripts/seo.cjs');
 const example={slug:'test-box',name:'Example box',price:777,contents:['Notebook','Pen'],description:'A desk gift.'};
 const guide=categoryGuide({slug:'test-collection',title:'Test gifts'},[example],9900);
 assert.ok(guide.includes('₹777'));
 assert.ok(guide.includes('₹99'));
 assert.ok(guide.includes('../products/test-box/'));
 assert.ok(productMetadata(example)[1].includes('notebook, pen'));
 const empty=categoryGuide({slug:'wellness-hampers',title:'Wellness'},[],9900);
 assert.ok(empty.includes('itemised quotation'));
 assert.ok(!empty.includes('Infinity'));
});
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
test('blog index and every article contain substantial, navigable guidance', () => {
 const catalogue=JSON.parse(fs.readFileSync(path.join(root,'content/catalogue.json'),'utf8'));
 const posts=catalogue.posts;
 const index=fs.readFileSync(path.join(root,'blog/index.html'),'utf8');
 assert.equal(posts.length,10);
 assert.match(index,/Browse blog topics/);
 assert.match(index,/min read/);
 for(const post of posts){
  const file=path.join(root,'blog',post.slug,'index.html');
  const html=fs.readFileSync(file,'utf8');
  const text=[post.title,post.summary,...(post.takeaways||[]),...post.sections.flatMap(section=>[section.heading,...(section.paragraphs||[section[1]])])].join(' ');
  assert.ok(text.trim().split(/\s+/).length>=300,`${post.slug} should offer a substantive article`);
  assert.ok(post.sections.length>=4,`${post.slug} needs useful sections`);
  assert.ok(index.includes(`./${post.slug}/`),`${post.slug} should be discoverable from the blog index`);
  assert.ok(html.includes(`${post.minutes||5} min read`),`${post.slug} should show reading time`);
  assert.match(html,/<nav class="article-breadcrumb"/,`${post.slug} should link visitors back to the site`);
  for(const related of post.related) assert.ok(fs.existsSync(path.join(root,related,'index.html')),`${post.slug}: missing related route ${related}`);
 }
 const keywordArticle=posts.find(post=>post.slug==='diwali-gifting-guide');
 assert.ok(keywordArticle.title.toLowerCase().includes('diwali gifting'));
 assert.ok(keywordArticle.related.includes('diwali-gifts'));
 const corporateArticle=posts.find(post=>post.slug==='corporate-gifting-planning-checklist');
 assert.ok(corporateArticle.title.toLowerCase().includes('corporate gifting'));
 assert.ok(corporateArticle.related.includes('corporate-gifting'));
});
