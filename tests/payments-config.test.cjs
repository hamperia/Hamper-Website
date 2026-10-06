const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isPaymentProviderEnabled } = require('../supabase/functions/_shared/payments.mjs');

function env(entries = {}) {
  return new Map(Object.entries(entries));
}

test('payment provider remains disabled unless global and provider flags are explicitly enabled', () => {
  assert.equal(isPaymentProviderEnabled('razorpay', env()), false);
  assert.equal(isPaymentProviderEnabled('razorpay', env({ PAYMENTS_ENABLED: 'true' })), false);
  assert.equal(isPaymentProviderEnabled('razorpay', env({ PAYMENTS_ENABLED: 'true', RAZORPAY_ENABLED: 'false' })), false);
  assert.equal(isPaymentProviderEnabled('razorpay', env({ PAYMENTS_ENABLED: 'true', RAZORPAY_ENABLED: 'true' })), true);
});

test('enabling Razorpay does not enable PayU and unknown providers are rejected', () => {
  const settings = env({ PAYMENTS_ENABLED: 'true', RAZORPAY_ENABLED: 'true', PAYU_ENABLED: 'false' });
  assert.equal(isPaymentProviderEnabled('razorpay', settings), true);
  assert.equal(isPaymentProviderEnabled('payu', settings), false);
  assert.equal(isPaymentProviderEnabled('cash', settings), false);
});
