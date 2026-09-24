(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.hamperiaShoppingState = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const guestCart = 'hamperia_cart_guest_v2';
  const guestWishlist = 'hamperia_wishlist_guest_v2';
  const legacyCart = 'hamperia_cart_v1';
  const legacyWishlist = 'hamperia_wishlist_v1';
  const cartKey = id => id ? `hamperia_cart_v2:${id}` : guestCart;
  const wishlistKey = id => id ? `hamperia_wishlist_v2:${id}` : guestWishlist;
  const read = (storage, key) => {
    try { const value = JSON.parse(storage.getItem(key)); return Array.isArray(value) ? value : []; }
    catch { return []; }
  };
  const validCart = item => item && typeof item.key === 'string' && item.key.length <= 120 && Number.isInteger(item.quantity) && item.quantity > 0;
  const validWish = key => typeof key === 'string' && key.length <= 120;

  function createShoppingState(storage) {
    const cart = new Map();
    const wishlist = new Set();
    let userId = null;
    let active = false;
    let hadSavedWishlist = false;

    function save() {
      if (!active) return;
      storage.setItem(cartKey(userId), JSON.stringify([...cart].map(([key, quantity]) => ({ key, quantity }))));
      storage.setItem(wishlistKey(userId), JSON.stringify([...wishlist]));
    }

    function mergeCart(items) {
      for (const item of items.filter(validCart)) cart.set(item.key, Math.min(10, (cart.get(item.key) || 0) + item.quantity));
    }

    function activate(nextUserId) {
      const next = nextUserId || null;
      if (active && next === userId) return;
      save();
      userId = next;
      active = true;
      cart.clear();
      wishlist.clear();
      hadSavedWishlist = Boolean(userId && storage.getItem(wishlistKey(userId)) !== null);
      if (!userId) {
        for (const key of [guestCart, guestWishlist, legacyCart, legacyWishlist]) storage.removeItem(key);
        save();
        return;
      }
      mergeCart(read(storage, cartKey(userId)));
      read(storage, wishlistKey(userId)).filter(validWish).forEach(key => wishlist.add(key));
      mergeCart(read(storage, guestCart));
      mergeCart(read(storage, legacyCart));
      read(storage, guestWishlist).concat(read(storage, legacyWishlist)).filter(validWish).forEach(key => wishlist.add(key));
      for (const key of [guestCart, guestWishlist, legacyCart, legacyWishlist]) storage.removeItem(key);
      save();
    }

    function signOut() {
      save();
      for (const key of [guestCart, guestWishlist, legacyCart, legacyWishlist]) storage.removeItem(key);
      cart.clear();
      wishlist.clear();
      userId = null;
      active = true;
      hadSavedWishlist = false;
      save();
    }

    return { cart, wishlist, activate, save, signOut, get userId() { return userId; }, get hadSavedWishlist() { return hadSavedWishlist; } };
  }

  return { createShoppingState, guestCart, guestWishlist, legacyCart, legacyWishlist };
});
