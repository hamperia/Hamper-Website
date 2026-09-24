const encoder = new TextEncoder();

export async function sha512(value) {
  const digest = await crypto.subtle.digest('SHA-512', encoder.encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export function amountRupees(paise) {
  if (!Number.isSafeInteger(paise) || paise <= 0) throw new Error('Invalid amount');
  return `${Math.floor(paise / 100)}.${String(paise % 100).padStart(2, '0')}`;
}

export function amountPaise(value) {
  const match = String(value ?? '').match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return NaN;
  const paise = Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0'));
  return Number.isSafeInteger(paise) ? paise : NaN;
}

export function requestHashInput(fields, salt) {
  return [fields.key, fields.txnid, fields.amount, fields.productinfo, fields.firstname, fields.email,
    fields.udf1 || '', fields.udf2 || '', fields.udf3 || '', fields.udf4 || '', fields.udf5 || '',
    '', '', '', '', '', salt].join('|');
}

export function responseHashInput(fields, salt) {
  const values = [salt, fields.status, '', '', '', '', '',
    fields.udf5 || '', fields.udf4 || '', fields.udf3 || '', fields.udf2 || '', fields.udf1 || '',
    fields.email, fields.firstname, fields.productinfo, fields.amount, fields.txnid, fields.key];
  const extra = fields.additionalCharges || fields.additional_charges;
  if (extra) values.unshift(extra);
  return values.join('|');
}

export async function validResponse(fields, salt) {
  if (!/^[a-f0-9]{128}$/i.test(fields.hash || '') || fields.splitInfo) return false;
  const expected = await sha512(responseHashInput(fields, salt));
  const received = fields.hash.toLowerCase();
  let mismatch = 0;
  for (let index = 0; index < expected.length; index++) mismatch |= expected.charCodeAt(index) ^ received.charCodeAt(index);
  return mismatch === 0;
}
