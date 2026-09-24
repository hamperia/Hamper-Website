const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function builderHarness() {
  const values = new Map();
  const storage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
  const nodes = Object.fromEntries(['options', 'visual', 'summary', 'available', 'enquiry'].map(key => [key, { innerHTML: '', setAttribute() {}, classList: { toggle() {} }, before() {}, addEventListener(type, listener) { this[type] = listener; } }]));
  const buttons = ['coffee', 'journal', 'bottle', 'tumbler', 'magnetic-box'].map(id => ({ dataset: { builderStep: id === 'magnetic-box' ? 'base' : 'contents', builderId: id }, setAttribute() {}, classList: { toggle() {} } }));
  let click;
  const root = {
    querySelector: selector => nodes[selector.match(/data-builder-(\w+)/)?.[1]],
    querySelectorAll: () => buttons,
    addEventListener: (type, listener) => { if (type === 'click') click = listener; }
  };
  let prompted = 0;
  const hamperia = { state: { user: null }, ready: Promise.resolve(), sessionListeners: [], beforeSignOutListeners: [], promptSignIn: () => { prompted++; } };
  const document = { currentScript: { src: 'http://localhost/js/hamper-builder.js' }, querySelector: () => root, createElement: () => ({ className: '', role: '', textContent: '' }) };
  const context = { document, window: { hamperia }, localStorage: storage, URL, Set, Map, Object, JSON, encodeURIComponent };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/hamper-builder.js'), 'utf8'), context);
  const choose = (step, id) => click({ target: { closest: selector => selector.includes('[data-builder-step]') ? { dataset: { builderStep: step, builderId: id } } : null } });
  return { values, nodes, hamperia, choose, get prompted() { return prompted; } };
}

test('builder requires sign-in and restores saved account choices', async () => {
  const app = builderHarness();
  await app.hamperia.ready;
  app.choose('contents', 'coffee');
  assert.equal(app.prompted, 1);
  assert.equal(app.values.has('hamperia_builder_v2:member-a'), false);
  await app.hamperia.sessionListeners[0]({ user: { id: 'member-a' } });
  app.choose('base', 'magnetic-box');
  app.choose('contents', 'coffee');
  app.choose('contents', 'journal');
  app.choose('contents', 'bottle');
  app.choose('contents', 'tumbler');
  const saved = JSON.parse(app.values.get('hamperia_builder_v2:member-a'));
  assert.equal(saved.base, 'magnetic-box');
  assert.deepEqual(saved.contents, ['coffee', 'journal', 'bottle', 'tumbler']);
  assert.match(app.nodes.visual.innerHTML, /builder-coffee\.png/);
  assert.match(app.nodes.visual.innerHTML, /builder-journal\.png/);
  assert.match(app.nodes.visual.innerHTML, /builder-bottle\.png/);
  assert.match(app.nodes.visual.innerHTML, /builder-tumbler\.png/);
  app.hamperia.beforeSignOutListeners[0]();
  assert.doesNotMatch(app.nodes.visual.innerHTML, /builder-coffee\.png/);
  await app.hamperia.sessionListeners[0]({ user: { id: 'member-b' } });
  assert.doesNotMatch(app.nodes.visual.innerHTML, /builder-coffee\.png/);
  await app.hamperia.sessionListeners[0]({ user: { id: 'member-a' } });
  assert.match(app.nodes.visual.innerHTML, /builder-coffee\.png/);
});

test('builder shows multiple box types with matching photos', () => {
  const app = builderHarness();
  assert.match(app.nodes.options.innerHTML, /Round gift box/);
  assert.match(app.nodes.options.innerHTML, /builder-round-box\.png/);
  assert.match(app.nodes.options.innerHTML, /Magnetic gift box/);
  assert.match(app.nodes.options.innerHTML, /builder-magnetic-box\.png/);
});
