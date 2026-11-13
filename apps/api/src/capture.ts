import { z } from 'zod';
import { hash } from './auth';
import { youtubeVideo } from '@rodkisten/jardim-capture';
const Event = z
  .object({
    id: z.uuid(),
    title: z.string().trim().min(1).max(160),
    observedAt: z.iso.datetime(),
    url: z.string().max(256),
  })
  .strict();
const Batch = z.object({ events: z.array(Event).min(1).max(25) }).strict();

/** Device credentials authorize append-only YouTube capture, never reading the private diary. */
export async function ingest(request: Request, env: Env, text: string) {
  const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!token) return Response.json({ error: 'Dispositivo não autorizado' }, { status: 401 });
  const device = await env.DB.prepare(
    'SELECT id FROM capture_devices WHERE token_hash=? AND revoked_at IS NULL',
  )
    .bind(await hash(token))
    .first<{ id: string }>();
  if (!device) return Response.json({ error: 'Dispositivo revogado ou inválido' }, { status: 401 });
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }
  const parsed = Batch.safeParse(input);
  if (!parsed.success) return Response.json({ error: 'Eventos inválidos' }, { status: 400 });
  const events = parsed.data.events.map((event) => ({ ...event, video: youtubeVideo(event.url) }));
  if (events.some((event) => !event.video || Date.parse(event.observedAt) > Date.now() + 300000))
    return Response.json({ error: 'Vídeo ou instante inválido' }, { status: 400 });
  const statements: D1PreparedStatement[] = [];
  for (const event of events) {
    // A stable event UUID is also the memory/operation ID. Atomic inserts make lost receipts safe to retry.
    statements.push(
      env.DB.prepare(
        'INSERT INTO capture_events(id,device_id,source_event_id,observed_at,received_at,url) VALUES(?,?,?,?,?,?) ON CONFLICT DO NOTHING',
      ).bind(
        event.id,
        device.id,
        event.id,
        event.observedAt,
        new Date().toISOString(),
        event.video!.url,
      ),
    );
    statements.push(
      env.DB.prepare(
        'INSERT INTO memories(id,operation_id,title,body,tags,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM capture_events WHERE id=? AND device_id=?) ON CONFLICT DO NOTHING',
      ).bind(
        event.id,
        event.id,
        event.title,
        `Vídeo observado no YouTube\n${event.video!.url}`,
        JSON.stringify(['youtube', 'captura']),
        event.observedAt,
        event.id,
        device.id,
      ),
    );
  }
  await env.DB.batch(statements);
  const acknowledged: string[] = [];
  for (const event of events) {
    const receipt = await env.DB.prepare('SELECT id FROM capture_events WHERE id=? AND device_id=?')
      .bind(event.id, device.id)
      .first();
    if (receipt) acknowledged.push(event.id);
  }
  return Response.json({ acknowledged });
}

export async function devices(request: Request, env: Env, text = '') {
  if (request.method === 'GET') {
    const result = await env.DB.prepare(
      'SELECT id,name,created_at AS createdAt,revoked_at AS revokedAt FROM capture_devices ORDER BY created_at DESC',
    ).all();
    return Response.json({ devices: result.results });
  }
  if (request.method === 'POST') {
    let input: unknown;
    try {
      input = JSON.parse(text);
    } catch {
      return Response.json({ error: 'JSON inválido' }, { status: 400 });
    }
    const parsed = z
      .object({ name: z.string().trim().min(1).max(80) })
      .strict()
      .safeParse(input);
    if (!parsed.success) return Response.json({ error: 'Nome inválido' }, { status: 400 });
    const count = await env.DB.prepare(
      'SELECT count(*) AS n FROM capture_devices WHERE revoked_at IS NULL',
    ).first<{ n: number }>();
    if ((count?.n || 0) >= 20)
      return Response.json(
        { error: 'Revogue um dispositivo antes de adicionar outro.' },
        { status: 409 },
      );
    const id = crypto.randomUUID();
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
      b.toString(16).padStart(2, '0'),
    ).join('');
    await env.DB.prepare(
      'INSERT INTO capture_devices(id,token_hash,name,created_at) VALUES(?,?,?,?)',
    )
      .bind(id, await hash(token), parsed.data.name, new Date().toISOString())
      .run();
    return Response.json({ id, token }, { status: 201 });
  }
  return Response.json({ error: 'Método inválido' }, { status: 405 });
}
