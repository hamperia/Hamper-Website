import { cors, identity, json, razorpay, secret } from '../_shared/commerce.ts';
import { amountRupees, requestHashInput, sha512 } from '../_shared/payu.mjs';

type CartItem = { key: string; quantity: number };
const shippingPaise = 9900;

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    // The browser sends identifiers only. Prices always come from database records.
    const { db, user } = await identity(req);
    if (!user.email) return json({ error: 'An email address is required for checkout' }, 400);
    const input = await req.json();
    const items: CartItem[] = input.items;
    const address = input.address;
    const provider = input.provider;
    if (!['razorpay', 'payu'].includes(provider)) return json({ error: 'Choose a payment provider' }, 400);
    if (!Array.isArray(items) || !items.length || items.length > 30) return json({ error: 'Invalid basket' }, 400);
    if (!address || typeof address !== 'object') return json({ error: 'Delivery address is required' }, 400);
    for (const field of ['full_name', 'phone', 'line1', 'city', 'state', 'pincode']) {
      if (typeof address[field] !== 'string' || !address[field].trim() || address[field].length > 160) return json({ error: 'Complete the delivery address' }, 400);
    }
    if (!/^\d{10}$/.test(address.phone) || !/^\d{6}$/.test(address.pincode)) return json({ error: 'Enter a valid phone number and PIN code' }, 400);
    const giftNote = typeof address.gift_note === 'string' ? address.gift_note.slice(0, 250) : '';
    const cleanedAddress = Object.fromEntries(['full_name', 'phone', 'line1', 'line2', 'city', 'state', 'pincode'].map(key => [key, String(address[key] || '').trim()]));
    const unique = new Set<string>();
    const lines: { product_key: string; name: string; quantity: number; unit_price_paise: number }[] = [];
    for (const item of items) {
      if (!item || typeof item.key !== 'string' || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10 || unique.has(item.key)) return json({ error: 'Invalid basket' }, 400);
      unique.add(item.key);
      if (item.key.startsWith('catalog:')) {
        const slug = item.key.slice(8);
        const { data, error } = await db.from('catalog_products').select('name,price_paise,stock_quantity').eq('slug', slug).eq('active', true).maybeSingle();
        if (error || !data) return json({ error: 'A product in your basket is unavailable' }, 409);
        if (data.stock_quantity === null || data.stock_quantity < item.quantity) return json({ error: `${data.name} does not have enough confirmed stock` }, 409);
        lines.push({ product_key: item.key, name: data.name, quantity: item.quantity, unit_price_paise: data.price_paise });
      } else if (item.key.startsWith('maker:')) {
        const id = item.key.slice(6);
        if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'Invalid product' }, 400);
        const { data, error } = await db.from('products').select('name,price').eq('id', id).eq('status', 'approved').maybeSingle();
        if (error || !data) return json({ error: 'A product in your basket is unavailable' }, 409);
        lines.push({ product_key: item.key, name: data.name, quantity: item.quantity, unit_price_paise: Math.round(Number(data.price) * 100) });
      } else return json({ error: 'Invalid product' }, 400);
    }
    const subtotal = lines.reduce((total, line) => total + line.unit_price_paise * line.quantity, 0);
    const total = subtotal + shippingPaise;
    if (!Number.isSafeInteger(total) || total < shippingPaise + 100 || total > 1000000000) return json({ error: 'Invalid order total' }, 400);
    const orderId = crypto.randomUUID();
    let gatewayOrder: { id: string } | undefined;
    let payuFields: Record<string, string> | undefined;
    let payuUrl: string | undefined;
    if (provider === 'razorpay') {
      gatewayOrder = await razorpay('orders', 'POST', { amount: total, currency: 'INR', receipt: orderId, notes: { shop_order_id: orderId } });
      if (!gatewayOrder?.id) throw new Error('Payment service did not create an order');
    } else {
      const mode = secret('PAYU_MODE');
      if (!['test', 'live'].includes(mode)) throw new Error('PayU mode is not configured');
      const callback = `${secret('SUPABASE_URL')}/functions/v1/payu-return`;
      payuUrl = mode === 'live' ? 'https://secure.payu.in/_payment' : 'https://test.payu.in/_payment';
      payuFields = {
        key: secret('PAYU_KEY'), txnid: orderId.replaceAll('-', '').slice(0, 24), amount: amountRupees(total),
        productinfo: 'Hamperia gift order', firstname: cleanedAddress.full_name.split(/\s+/)[0].slice(0, 20),
        email: user.email, phone: cleanedAddress.phone, udf1: orderId, surl: callback, furl: callback
      };
      payuFields.hash = await sha512(requestHashInput(payuFields, secret('PAYU_SALT')));
    }
    const { error: orderError } = await db.from('shop_orders').insert({ id: orderId, user_id: user.id, subtotal_paise: subtotal, shipping_paise: shippingPaise, total_paise: total, delivery_address: cleanedAddress, gift_note: giftNote, payment_provider: provider, razorpay_order_id: gatewayOrder?.id || null, payu_txn_id: payuFields?.txnid || null });
    if (orderError) throw new Error('Unable to save the order');
    const { error: lineError } = await db.from('shop_order_items').insert(lines.map(line => ({ order_id: orderId, ...line })));
    if (lineError) { await db.from('shop_orders').delete().eq('id', orderId); throw new Error('Unable to save the order items'); }
    return provider === 'razorpay'
      ? json({ provider, order_id: orderId, razorpay_order_id: gatewayOrder?.id, amount_paise: total, key_id: secret('RAZORPAY_KEY_ID') })
      : json({ provider, order_id: orderId, amount_paise: total, action: payuUrl, fields: payuFields });
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Checkout failed' }, 400); }
});
