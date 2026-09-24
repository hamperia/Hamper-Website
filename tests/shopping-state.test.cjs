const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createShoppingState } = require('../js/shopping-state.js');

function storage() {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    values
  };
}

test('basket and wishlist are hidden at sign-out and restored for the same account', () => {
  const local = storage();
  const state = createShoppingState(local);
  state.activate('member-a');
  state.cart.set('catalog:gift', 2);
  state.wishlist.add('catalog:gift');
  state.save();
  state.signOut();
  assert.equal(state.cart.size, 0);
  assert.equal(state.wishlist.size, 0);
  assert.deepEqual(JSON.parse(local.getItem('hamperia_cart_v2:member-a')), [{ key: 'catalog:gift', quantity: 2 }]);
  state.activate('member-b');
  assert.equal(state.cart.size, 0);
  assert.equal(state.wishlist.size, 0);
  state.signOut();
  state.activate('member-a');
  assert.equal(state.cart.get('catalog:gift'), 2);
  assert.equal(state.wishlist.has('catalog:gift'), true);
});

test('old unscoped items migrate only for an authenticated account', () => {
  const local = storage();
  local.setItem('hamperia_cart_v1', JSON.stringify([{ key: 'catalog:gift', quantity: 3 }]));
  local.setItem('hamperia_wishlist_v1', JSON.stringify(['catalog:gift']));
  const state = createShoppingState(local);
  state.activate('member-a');
  assert.equal(state.cart.get('catalog:gift'), 3);
  assert.equal(state.wishlist.has('catalog:gift'), true);
  assert.equal(local.getItem('hamperia_cart_v1'), null);
  assert.equal(local.getItem('hamperia_wishlist_v1'), null);
});

test('signed-out visitors cannot see stale unscoped shopping data', () => {
  const local = storage();
  local.setItem('hamperia_cart_v1', JSON.stringify([{ key: 'catalog:gift', quantity: 1 }]));
  local.setItem('hamperia_wishlist_v1', JSON.stringify(['catalog:gift']));
  const state = createShoppingState(local);
  state.activate(null);
  assert.equal(state.cart.size, 0);
  assert.equal(state.wishlist.size, 0);
  assert.equal(local.getItem('hamperia_cart_v1'), null);
  assert.equal(local.getItem('hamperia_wishlist_v1'), null);
});

test('malformed and excessive quantities do not enter a saved basket', () => {
  const local = storage();
  local.setItem('hamperia_cart_v2:member-a', JSON.stringify([{ key: 'catalog:gift', quantity: 90 }, { key: 'bad', quantity: -1 }, { quantity: 1 }]));
  const state = createShoppingState(local);
  state.activate('member-a');
  assert.deepEqual([...state.cart], [['catalog:gift', 10]]);
});

test('a previously saved empty wishlist stays authoritative after sign-in', () => {
  const local = storage();
  local.setItem('hamperia_wishlist_v2:member-a', '[]');
  const state = createShoppingState(local);
  state.activate('member-a');
  assert.equal(state.hadSavedWishlist, true);
  assert.equal(state.wishlist.size, 0);
  state.signOut();
  assert.equal(state.hadSavedWishlist, false);
  state.activate('member-a');
  assert.equal(state.hadSavedWishlist, true);
});
