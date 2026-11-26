import { z } from '@rodkisten/jardim-contracts';
import { hash } from './auth';
const Event = z
  .object({
    version: z.literal(1),
    id: z.uuid(),
    source: z.enum(['orb', 'shortcut', 'photointel']),
    kind: z.enum(['link', 'github', 'photo', 'music', 'video']),
    title: z.string().trim().min(1).max(160),
    observedAt: z.iso.datetime(),
    url: z.string().max(2048).optional(),
  })
  .strict();
export async function ingestInbox(request: Request, env: Env, text: string) {
  const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const device = await env.DB.prepare(
    'SELECT id FROM capture_devices WHERE token_hash=? AND revoked_at IS NULL',
  )
    .bind(await hash(token))
    .first<{ id: string }>();
  if (!device) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = Event.safeParse(input);
  if (!parsed.success) return Response.json({ error: 'Invalid event' }, { status: 400 });
  const e = parsed.data;
  let url: string | null = null;
  if (e.url) {
    try {
      const u = new URL(e.url);
      if (u.protocol !== 'https:' || u.username || u.password) throw Error();
      u.search = '';
      u.hash = '';
      url = u.href;
    } catch {
      return Response.json({ error: 'Invalid URL' }, { status: 400 });
    }
  }
  if (Date.parse(e.observedAt) > Date.now() + 300000)
    return Response.json({ error: 'Invalid time' }, { status: 400 });
  await env.DB.prepare(
    'INSERT INTO automation_inbox(id,device_id,source,kind,title,url,observed_at,received_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING',
  )
    .bind(e.id, device.id, e.source, e.kind, e.title, url, e.observedAt, new Date().toISOString())
    .run();
  const receipt = await env.DB.prepare('SELECT id FROM automation_inbox WHERE id=? AND device_id=?')
    .bind(e.id, device.id)
    .first();
  return receipt
    ? Response.json({ acknowledged: [e.id] })
    : Response.json({ error: 'Conflict' }, { status: 409 });
}
export async function listInbox(env: Env) {
  const rows = await env.DB.prepare(
    "SELECT id,source,kind,title,url,observed_at AS observedAt,status FROM automation_inbox WHERE status='pending' ORDER BY received_at DESC LIMIT 100",
  ).all();
  return Response.json({ items: rows.results });
}

export async function decideInbox(env: Env, id: string, text: string) {
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = z
    .object({ decision: z.enum(['approved', 'dismissed']) })
    .strict()
    .safeParse(input);
  if (!parsed.success) return Response.json({ error: 'Invalid decision' }, { status: 400 });
  const decision = parsed.data.decision;
  if (decision === 'approved') {
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO memories(id,operation_id,title,body,tags,created_at) SELECT id,id,title,COALESCE(url,title),json_array('captura',kind),observed_at FROM automation_inbox WHERE id=? AND status='pending' ON CONFLICT DO NOTHING",
      ).bind(id),
      env.DB.prepare(
        "UPDATE automation_inbox SET status='approved' WHERE id=? AND status='pending' AND EXISTS(SELECT 1 FROM memories WHERE id=?)",
      ).bind(id, id),
    ]);
  } else
    await env.DB.prepare(
      "UPDATE automation_inbox SET status='dismissed' WHERE id=? AND status='pending'",
    )
      .bind(id)
      .run();
  const row = await env.DB.prepare('SELECT status FROM automation_inbox WHERE id=?')
    .bind(id)
    .first<{ status: string }>();
  return !row
    ? Response.json({ error: 'Not found' }, { status: 404 })
    : row.status !== decision
      ? Response.json({ error: 'Decision conflict' }, { status: 409 })
      : Response.json({ id, status: row.status });
}
