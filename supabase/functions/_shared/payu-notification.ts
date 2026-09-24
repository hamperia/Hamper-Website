import { admin, secret } from './commerce.ts';
import { amountPaise, sha512, validResponse } from './payu.mjs';

export async function processPayuNotification(fields: Record<string, string>) {
  if (!fields.txnid || !fields.hash || fields.key !== secret('PAYU_KEY')) throw new Error('Invalid PayU response');
  if (fields.additionalCharges || fields.additional_charges || fields.splitInfo) throw new Error('Unsupported PayU charges');
  if (!await validResponse(fields, secret('PAYU_SALT'))) throw new Error('PayU response hash did not match');
  const db = admin();
  const { data: order, error } = await db.from('shop_orders')
    .select('id,status,total_paise,payu_txn_id,payment_provider')
    .eq('payu_txn_id', fields.txnid).maybeSingle();
  if (error || !order || order.payment_provider !== 'payu' || fields.udf1 !== order.id || amountPaise(fields.amount) !== order.total_paise) throw new Error('PayU order did not match');
  const mode = secret('PAYU_MODE');
  if (!['test', 'live'].includes(mode)) throw new Error('PayU mode is not configured');
  const key = secret('PAYU_KEY');
  const command = 'verify_payment';
  const endpoint = mode === 'live' ? 'https://info.payu.in/merchant/postservice.php?form=2' : 'https://test.payu.in/merchant/postservice?form=2';
  const hash = await sha512(`${key}|${command}|${fields.txnid}|${secret('PAYU_SALT')}`);
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ key, command, var1: fields.txnid, hash }) });
  if (!response.ok) throw new Error('PayU payment verification is unavailable');
  const result = await response.json();
  const payment = result.transaction_details?.[fields.txnid];
  const paid = String(result.status) === '1' && fields.status === 'success' && payment?.status === 'success' && payment?.unmappedstatus === 'captured' && payment?.txnid === fields.txnid && amountPaise(payment?.transaction_amount ?? payment?.amt) === order.total_paise && Boolean(payment?.mihpayid && payment.mihpayid !== 'Not Found');
  if (paid && !['paid', 'fulfilled'].includes(order.status)) {
    const { error: updateError } = await db.from('shop_orders').update({ status: 'paid', payu_payment_id: String(payment.mihpayid), paid_at: new Date().toISOString() }).eq('id', order.id).in('status', ['payment_pending', 'payment_failed']);
    if (updateError) throw new Error('Verified payment could not be saved');
  }
  return { paid: paid || ['paid', 'fulfilled'].includes(order.status), orderId: order.id };
}
