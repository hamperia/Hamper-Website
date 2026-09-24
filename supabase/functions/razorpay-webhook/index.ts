import { admin, hmacValid, json, secret } from '../_shared/commerce.ts';

Deno.serve(async req => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const raw = await req.text();
  const signature = req.headers.get('x-razorpay-signature') || '';
  if (!await hmacValid(raw, signature, secret('RAZORPAY_WEBHOOK_SECRET'))) return json({ error: 'Invalid signature' }, 401);
  try {
    const eventId = req.headers.get('x-razorpay-event-id');
    if (!eventId || eventId.length > 200) return json({ error: 'Missing event ID' }, 400);
    const event = JSON.parse(raw);
    const db = admin();
    const { data: prior } = await db.from('shop_webhook_events').select('processed_at').eq('event_id', eventId).maybeSingle();
    if (prior?.processed_at) return json({ ok: true });
    if (!prior) {
      const { error: insertError } = await db.from('shop_webhook_events').insert({ event_id: eventId, event_type: String(event.event || '') });
      if (insertError) throw insertError;
    }
    if (event.event === 'payment.captured') {
      const payment = event.payload?.payment?.entity;
      if (!payment?.id || !payment.order_id || payment.status !== 'captured') throw new Error('Invalid captured payment payload');
      const { data: order, error } = await db.from('shop_orders').select('id,total_paise,status,payment_provider').eq('razorpay_order_id', payment.order_id).maybeSingle();
      if (error || !order || order.payment_provider !== 'razorpay' || order.total_paise !== payment.amount || payment.currency !== 'INR') throw new Error('Payment does not match an order');
      if (order.status === 'payment_pending') {
        const { error: updateError } = await db.from('shop_orders').update({ status: 'paid', razorpay_payment_id: payment.id, paid_at: new Date().toISOString() }).eq('id', order.id).eq('status', 'payment_pending');
        if (updateError) throw updateError;
      }
    }
    const { error: finishError } = await db.from('shop_webhook_events').update({ processed_at: new Date().toISOString() }).eq('event_id', eventId);
    if (finishError) throw finishError;
    return json({ ok: true });
  } catch { return json({ error: 'Webhook could not be processed' }, 500); }
});
