const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');

const payu = import('../supabase/functions/_shared/payu.mjs');
const digest = value => createHash('sha512').update(value).digest('hex');

test('PayU request hash uses the hosted-checkout parameter sequence', async () => {
  const { requestHashInput, sha512 } = await payu;
  const fields = { key: 'merchant', txnid: 'txn123', amount: '1099.00', productinfo: 'Gift order', firstname: 'Asha', email: 'asha@example.com', udf1: 'order-1' };
  const expected = 'merchant|txn123|1099.00|Gift order|Asha|asha@example.com|order-1||||||||||salt';
  assert.equal(requestHashInput(fields, 'salt'), expected);
  assert.equal(await sha512(expected), digest(expected));
});

test('PayU response hash validates and rejects changed payment details', async () => {
  const { responseHashInput, validResponse } = await payu;
  const fields = { key: 'merchant', txnid: 'txn123', amount: '1099.00', productinfo: 'Gift order', firstname: 'Asha', email: 'asha@example.com', udf1: 'order-1', status: 'success' };
  assert.equal(responseHashInput(fields, 'salt'), 'salt|success||||||||||order-1|asha@example.com|Asha|Gift order|1099.00|txn123|merchant');
  fields.hash = digest(responseHashInput(fields, 'salt'));
  assert.equal(await validResponse(fields, 'salt'), true);
  assert.equal(await validResponse({ ...fields, amount: '1099.01' }, 'salt'), false);
  assert.equal(await validResponse({ ...fields, hash: 'bad' }, 'salt'), false);
});

test('amounts stay in paise with two-decimal formatting', async () => {
  const { amountRupees, amountPaise } = await payu;
  assert.equal(amountRupees(109901), '1099.01');
  assert.equal(amountPaise('1099.01'), 109901);
  assert.equal(amountPaise('1099'), 109900);
  assert.equal(Number.isNaN(amountPaise('1099.999')), true);
});
