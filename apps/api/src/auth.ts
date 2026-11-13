const encoder = new TextEncoder();
export async function hash(value: string) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
}
// Verify an HMAC rather than comparing password strings with an early-exit equality check.
export async function equalSecret(a: string, b: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(b),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(a));
  return crypto.subtle.verify('HMAC', key, signature, encoder.encode(b));
}
export function sessionToken(request: Request) {
  return request.headers.get('cookie')?.match(/(?:^|;\s*)__Host-jardim=([a-f0-9]{64})(?:;|$)/)?.[1];
}
export const cookie = (token: string, age = 604800) =>
  `__Host-jardim=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${age}`;
