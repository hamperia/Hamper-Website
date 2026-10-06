const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {matchesArticle,estimateBudget}=require('../js/journal.js');
test('journal filters combine topic and every search term and handle empty searches',()=>{
 assert.equal(matchesArticle('Corporate Diwali gifts','Corporate gifting',' DIWALI gifts ','all'),true);
 assert.equal(matchesArticle('Corporate Diwali gifts','Corporate gifting','diwali','Make a hamper'),false);
 assert.equal(matchesArticle('Corporate Diwali gifts','Corporate gifting','diwali chocolate','all'),false);
 assert.equal(matchesArticle('Corporate Diwali gifts','Corporate gifting','  ','all'),true);
});
test('budget estimate rejects invalid inputs and calculates a gift-only subtotal',()=>{
 assert.equal(estimateBudget('25','1499'),37475);
 for(const pair of [['','100'],['2',''],['-1','100'],['1.5','100'],['1','Infinity'],['100001','100'],['1','1000001']]) assert.equal(estimateBudget(...pair),null);
});
test('article content and navigation are available without JavaScript, with valid jump targets',()=>{
 const root=path.resolve(__dirname,'..');
 const posts=require('../content/catalogue.json').posts;
 for(const post of posts){
  const html=fs.readFileSync(path.join(root,'blog',post.slug,'index.html'),'utf8');
  for(const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(html.includes(`id="${match[1]}"`),`${post.slug}: ${match[1]}`);
  assert.ok(html.includes('data-journal-checklist hidden'),post.slug);
  assert.ok(html.includes('aria-label="In this guide"'),post.slug);
  assert.ok(html.includes('journal-more'),post.slug);
  assert.ok(html.includes(post.sections[0].paragraphs[0].slice(0,40)),post.slug);
 }
});
