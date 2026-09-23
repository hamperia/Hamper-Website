import { cors, hmacValid, identity, json, razorpay, secret } from '../_shared/commerce.ts';

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const { db, user } = await identity(req);
    const { order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    if (!/^[0-9a-f-]{36}$/i.test(order_id || '') || !/^pay_[\w-]+$/.test(razorpay_payment_id || '')) return json({ error: 'Invalid payment' }, 400);
    const { data: order, error } = await db.from('shop_orders').select('id,user_id,total_paise,status,razorpay_order_id').eq('id', order_id).eq('user_id', user.id).single();
    if (error || !order) return json({ error: 'Order not found' }, 404);
    if (order.status === 'paid') return json({ paid: true, order_id: order.id });
    const signed = `${order.razorpay_order_id}|${razorpay_payment_id}`;
    if (!await hmacValid(signed, razorpay_signature || '', secret('RAZORPAY_KEY_SECRET'))) return json({ error: 'Payment signature did not match' }, 400);
    const payment = await razorpay(`payments/${encodeURIComponent(razorpay_payment_id)}`);
    if (payment.order_id !== order.razorpay_order_id || payment.amount !== order.total_paise || payment.currency !== 'INR' || payment.status !== 'captured') return json({ paid: false, status: payment.status });
    const { error: updateError } = await db.from('shop_orders').update({ status: 'paid', razorpay_payment_id, paid_at: new Date().toISOString() }).eq('id', order.id).eq('status', 'payment_pending');
    if (updateError) throw new Error('Payment was received but order status could not be updated');
    return json({ paid: true, order_id: order.id });
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Payment verification failed' }, 400); }
});
