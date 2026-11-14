import { renderCapsuleCard, cardFormats, type CardFormat } from '@rodkisten/jardim-cards';
import { Capsule } from '@rodkisten/jardim-contracts';
import { hash } from './auth';
export async function sealCapsule(env: Env, text: string) {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }
  const parsed = Capsule.safeParse(value);
  if (!parsed.success) return Response.json({ error: 'Cápsula inválida' }, { status: 400 });
  const capsule = parsed.data,
    payload = JSON.stringify(capsule),
    digest = await hash(payload);
  // A sealed version is immutable. Revisions get a new UUID; retries keep the exact UUID and hash.
  await env.DB.prepare(
    'INSERT INTO capsules(id,month,title,payload,payload_hash,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT DO NOTHING',
  )
    .bind(capsule.id, capsule.month, capsule.title, payload, digest, new Date().toISOString())
    .run();
  const stored = await env.DB.prepare('SELECT payload_hash FROM capsules WHERE id=?')
    .bind(capsule.id)
    .first<{ payload_hash: string }>();
  return stored?.payload_hash === digest
    ? Response.json({ id: capsule.id, payloadHash: digest })
    : Response.json({ error: 'Cápsula já selada; crie outra versão.' }, { status: 409 });
}
export async function listCapsules(env: Env) {
  const rows = await env.DB.prepare(
    "SELECT id,month,title,created_at AS createdAt,json_array_length(payload,'$.memories') AS count FROM capsules ORDER BY created_at DESC LIMIT 100",
  ).all();
  return Response.json({ capsules: rows.results });
}
export async function readCapsule(env: Env, id: string) {
  const row = await env.DB.prepare(
    'SELECT payload,created_at AS createdAt FROM capsules WHERE id=?',
  )
    .bind(id)
    .first<{ payload: string; createdAt: string }>();
  return row
    ? Response.json({ capsule: Capsule.parse(JSON.parse(row.payload)), createdAt: row.createdAt })
    : Response.json({ error: 'Cápsula não encontrada' }, { status: 404 });
}

export async function capsuleCard(env: Env, id: string, format: string) {
  if (!Object.hasOwn(cardFormats, format)) return new Response('Formato inválido', { status: 400 });
  const row = await env.DB.prepare('SELECT payload FROM capsules WHERE id=?')
    .bind(id)
    .first<{ payload: string }>();
  return row
    ? new Response(
        renderCapsuleCard(Capsule.parse(JSON.parse(row.payload)), format as CardFormat),
        { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } },
      )
    : new Response('Não encontrado', { status: 404 });
}
