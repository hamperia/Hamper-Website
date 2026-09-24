import { processPayuNotification } from '../_shared/payu-notification.ts';

Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  try {
    const form = await req.formData();
    const fields = Object.fromEntries([...form].filter(([, value]) => typeof value === 'string')) as Record<string, string>;
    const { paid, orderId } = await processPayuNotification(fields);
    const target = new URL('https://hamperiasolutions.com/orders/');
    target.searchParams.set('payment', paid ? 'success' : 'review');
    target.searchParams.set('order', orderId);
    return Response.redirect(target, 303);
  } catch {
    return Response.redirect('https://hamperiasolutions.com/orders/?payment=review', 303);
  }
});
