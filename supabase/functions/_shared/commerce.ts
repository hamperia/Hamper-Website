import { createClient } from 'npm:@supabase/supabase-js@2';

export const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
export function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } }); }
export function secret(name: string) { const value = Deno.env.get(name); if (!value) throw new Error(`${name} is not configured`); return value; }
export function admin() { return createClient(secret('SUPABASE_URL'), secret('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } }); }
export async function identity(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Sign in is required');
  const db = admin();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new Error('Sign in is required');
  const { data: profile, error: profileError } = await db.from('profiles').select('registration_completed').eq('id', data.user.id).single();
  if (profileError || !profile?.registration_completed) throw new Error('Complete your account before checkout');
  return { db, user: data.user };
}
export async function razorpay(path: string, method = 'GET', body?: unknown) {
  const credentials = btoa(`${secret('RAZORPAY_KEY_ID')}:${secret('RAZORPAY_KEY_SECRET')}`);
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, { method, headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok) throw new Error('Payment service is unavailable');
  return data;
}
export async function hmacValid(message: string, signature: string, key: string) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const bytes = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey('raw', bytes.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const decoded = Uint8Array.from(signature.match(/.{2}/g)!.map(part => Number.parseInt(part, 16)));
  return crypto.subtle.verify('HMAC', cryptoKey, decoded, bytes.encode(message));
}
