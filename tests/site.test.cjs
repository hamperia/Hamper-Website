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
    for (const asset of ['builder-coffee.png', 'builder-journal.png', 'builder-bottle.png', 'builder-tumbler.png', 'builder-round-box.png', 'builder-magnetic-box.png']) {
      const response = await fetch(`${base}/assets/${asset}`);
      assert.equal(response.status, 200, asset);
      assert.match(response.headers.get('content-type'), /image\/png/, asset);
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
