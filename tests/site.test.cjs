const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { handler } = require('../scripts/serve.cjs');

test('homepage, builder, basket, checkout and assets load through the local server', async () => {
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const route of ['/', '/hamperia/', '/cart/', '/wishlist/', '/checkout/', '/orders/']) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200, route);
      assert.match(response.headers.get('content-type'), /text\/html/, route);
      assert.match(await response.text(), /Hamperia Solutions/, route);
    }
    for (const asset of ['coffee-gift-for-hamper.webp', 'hardcover-journal-for-gift-hamper.webp', 'reusable-water-bottle-gift.webp', 'insulated-tumbler-gift.webp', 'round-gift-box-for-hamper.webp', 'magnetic-closure-gift-box.webp']) {
      const response = await fetch(`${base}/assets/${asset}`);
      assert.equal(response.status, 200, asset);
      assert.match(response.headers.get('content-type'), /image\/webp/, asset);
    }
    assert.equal((await fetch(`${base}/missing-page/`)).status, 404);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('catalogue product images and generated product routes exist', () => {
  const root = path.join(__dirname, '..');
  const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'content/catalogue.json')));
  for (const item of catalogue.products) {
    assert.equal(fs.existsSync(path.join(root, 'assets', item.image)), true, item.slug);
    assert.equal(fs.existsSync(path.join(root, 'products', item.slug, 'index.html')), true, item.slug);
  }
});

test('live payment options remain disabled while merchant setup is incomplete', () => {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../content/commerce-config.json')));
  assert.equal(config.paymentsEnabled, false);
  assert.equal(config.providers.razorpay, false);
  assert.equal(config.providers.payu, false);
});

test('dry-fruit collection lists only the three stocked boxes', () => {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'dry-fruit-hampers/index.html'), 'utf8');
  const slugs = [...html.matchAll(/data-product-slug="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(slugs, ['dry-fruit-two-jar-box', 'dry-fruit-three-jar-box', 'dry-fruit-four-jar-box']);
  assert.equal((html.match(/10 available/g) || []).length, 3);
  const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'content/catalogue.json')));
  assert.deepEqual(catalogue.products.filter(item => item.tags.includes('dry-fruit-hampers')).map(item => item.slug), slugs);
});

test('signup offers a customer account and admin has catalogue fields', () => {
  const root = path.join(__dirname, '..');
  const signup = fs.readFileSync(path.join(root, 'auth/signup/index.html'), 'utf8');
  const admin = fs.readFileSync(path.join(root, 'admin/index.html'), 'utf8');
  assert.doesNotMatch(signup, /name="account_type"|Product host|Joining as/);
  for (const field of ['name="image"', 'name="price"', 'name="stock"', 'name="contents"', 'data-catalog-tags']) assert.match(admin, new RegExp(field));
});

test('all collection pages offer at least three relevant products or labelled ideas', async () => {
  const root = path.join(__dirname, '..');
  const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'content/catalogue.json')));
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const slug of Object.keys(catalogue.collections)) {
      const response = await fetch(`${base}/${slug}/`);
      assert.equal(response.status, 200, slug);
      const html = await response.text();
      for (const match of html.matchAll(/src="\.\.\/assets\/([^"]+)"/g)) {
        assert.equal(fs.existsSync(path.join(root, 'assets', match[1])), true, `${slug}: ${match[1]}`);
      }
      const productCount = (html.match(/data-product-card/g) || []).length;
      const ideaCount = (html.match(/data-collection-example/g) || []).length;
      assert.ok(productCount + ideaCount >= 3, `${slug} has only ${productCount + ideaCount} examples`);
      if (ideaCount) assert.match(html, /Price on request/);
      if (slug === 'dry-fruit-hampers') assert.equal(ideaCount, 0);
    }
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('every complete hamper and welcome kit explains its contents', () => {
  const root = path.join(__dirname, '..');
  const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'content/catalogue.json')));
  for (const product of catalogue.products.filter(item => ['hamper', 'kit'].includes(item.category))) {
    assert.ok(product.contents.length >= 2, product.slug);
    const html = fs.readFileSync(path.join(root, 'products', product.slug, 'index.html'), 'utf8');
    assert.match(html, /What's inside/);
    for (const item of product.contents) assert.ok(html.includes(item.replaceAll('&', '&amp;')), `${product.slug}: ${item}`);
  }
});

test('catalogue rules reject incorrect tags, stock and missing contents', () => {
  const { validate } = require('../js/catalog-rules.js');
  const item = { slug: 'tea-gift-box', name: 'Tea gift box', description: 'A thoughtful assortment of tea and treats.', pricePaise: 99000, stock: 10, type: 'hamper', tags: ['gift-hampers'], contents: ['Tea', 'Biscuits'] };
  assert.equal(validate(item), null);
  assert.match(validate({ ...item, tags: ['dry-fruit-hampers'] }), /Only dry-fruit boxes/);
  assert.match(validate({ ...item, stock: -1 }), /stock quantity/);
  assert.match(validate({ ...item, contents: [] }), /List what comes inside/);
  assert.equal(validate({ ...item, type: 'dry_fruit_box', tags: ['dry-fruit-hampers'] }), null);
});
