import { json } from '../_shared/commerce.ts';
import { processPayuNotification } from '../_shared/payu-notification.ts';

Deno.serve(async req => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const form = await req.formData();
    const fields = Object.fromEntries([...form].filter(([, value]) => typeof value === 'string')) as Record<string, string>;
    await processPayuNotification(fields);
    return json({ ok: true });
  } catch { return json({ error: 'PayU notification could not be verified' }, 400); }
});
