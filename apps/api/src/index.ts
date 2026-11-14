import {
  integrationStatus,
  spotifyStart,
  spotifyCallback,
  syncSpotify,
  disconnectSpotify,
  searchTmdb,
} from './integrations';
import { weather } from './weather';
import { sealCapsule, listCapsules, readCapsule, capsuleCard } from './capsules';
import { media } from './media';
import { mutate, revisionPage, history } from './revisions';
import { ingest, devices } from './capture';
import { Push } from '@rodkisten/jardim-contracts';
import { findReceipts, findSession } from '@rodkisten/jardim-database';
import { cookie, equalSecret, hash, sessionToken } from './auth';
import { loginPage } from './login';
import { assets } from './assets.generated';
const json = (data: unknown, status = 200) => Response.json(data, { status });
async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url),
    path = url.pathname;
  if (path === '/health') return json({ ok: true, service: 'jardim' });
  if (!env.JARDIM_PASSWORD) return json({ error: 'Serviço não configurado' }, 503);
  if (path === '/v2/spotify/callback' && request.method === 'GET') return spotifyCallback(env, url);
  // GM_xmlhttpRequest uses an explicit scoped token and does not rely on the web session cookie.
  if (path === '/v1/events/batch' && request.method === 'POST') {
    const text = await limitedBody(request, 65536);
    return text === null ? json({ error: 'Lote muito grande' }, 413) : ingest(request, env, text);
  }
  // Same-origin writes protect the password session against cross-site form submissions.
  if (!['GET', 'HEAD'].includes(request.method) && request.headers.get('origin') !== url.origin)
    return json({ error: 'Origem inválida' }, 403);
  if (path === '/auth/login' && request.method === 'POST') {
    if (Number(request.headers.get('content-length') || 0) > 2048)
      return json({ error: 'Pedido muito grande' }, 413);
    const ip = await hash(request.headers.get('CF-Connecting-IP') || 'local');
    const now = Date.now();
    await env.DB.prepare(
      'INSERT INTO login_attempts(ip_hash, attempts, window_start) VALUES(?,1,?) ON CONFLICT(ip_hash) DO UPDATE SET attempts=CASE WHEN window_start < ? THEN 1 ELSE attempts+1 END, window_start=CASE WHEN window_start < ? THEN excluded.window_start ELSE window_start END',
    )
      .bind(ip, now, now - 900000, now - 900000)
      .run();
    const attempt = await env.DB.prepare('SELECT attempts FROM login_attempts WHERE ip_hash=?')
      .bind(ip)
      .first<{ attempts: number }>();
    if ((attempt?.attempts || 0) > 10)
      return new Response('Muitas tentativas. Aguarde 15 minutos.', {
        status: 429,
        headers: { 'Retry-After': '900' },
      });
    const text = await limitedBody(request, 2048);
    if (text === null) return json({ error: 'Pedido muito grande' }, 413);
    const password = new URLSearchParams(text).get('password') || '';
    if (!(await equalSecret(password, env.JARDIM_PASSWORD)))
      return new Response(loginPage(true), {
        status: 401,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
      b.toString(16).padStart(2, '0'),
    ).join('');
    await env.DB.batch([
      env.DB.prepare('INSERT INTO sessions(token_hash,expires_at) VALUES(?,?)').bind(
        await hash(token),
        now + 604800000,
      ),
      env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now),
    ]);
    return new Response(null, {
      status: 303,
      headers: { Location: '/', 'Set-Cookie': cookie(token) },
    });
  }
  // The installer contains no account data or credentials and must remain available for userscript updates.
  if (
    [
      '/downloads/jardim-youtube.user.js',
      '/sw.js',
      '/manifest.webmanifest',
      '/icon.svg',
      '/theme.js',
      '/theme.css',
    ].includes(path) &&
    request.method === 'GET'
  ) {
    const asset = assets[path];
    return asset
      ? new Response(asset.body, { headers: { 'Content-Type': asset.type } })
      : new Response('Não encontrado', { status: 404 });
  }
  const token = sessionToken(request);
  const session = token ? await findSession(env.DB, await hash(token), Date.now()) : null;
  if (!session)
    return path.startsWith('/v1/') || path.startsWith('/v2/')
      ? json({ error: 'Autenticação necessária' }, 401)
      : new Response(loginPage(), {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
  if (path === '/auth/logout' && request.method === 'POST') {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?')
      .bind(await hash(token!))
      .run();
    return new Response(null, {
      status: 303,
      headers: { Location: '/', 'Set-Cookie': cookie('', 0) },
    });
  }
  if (path === '/v2/integrations' && request.method === 'GET') return integrationStatus(env);
  if (path === '/v2/spotify/start' && request.method === 'POST') return spotifyStart(env);
  if (path === '/v2/spotify/sync' && request.method === 'POST') return syncSpotify(env);
  if (path === '/v2/spotify' && request.method === 'DELETE') return disconnectSpotify(env);
  if (path === '/v2/tmdb/search' && request.method === 'GET') return searchTmdb(env, url);
  if (['/v2/weather', '/v2/weather/search'].includes(path) && request.method === 'GET')
    return weather(url);
  if (path === '/v2/capsules') {
    if (request.method === 'GET') return listCapsules(env);
    if (request.method === 'POST') {
      const text = await limitedBody(request, 4 * 1024 * 1024);
      return text === null ? json({ error: 'Cápsula muito grande' }, 413) : sealCapsule(env, text);
    }
  }
  const card = path.match(/^\/v2\/capsules\/([a-f0-9-]{36})\/card\.svg$/);
  if (card && request.method === 'GET')
    return capsuleCard(env, card[1], url.searchParams.get('format') || 'og');
  const capsule = path.match(/^\/v2\/capsules\/([a-f0-9-]{36})$/);
  if (capsule && request.method === 'GET') return readCapsule(env, capsule[1]);
  const artifact = path.match(/^\/v2\/media\/([a-f0-9-]{36})$/);
  if (artifact) return media(request, env, artifact[1]);
  if (path === '/v2/mutations' && request.method === 'POST') {
    const text = await limitedBody(request, 131072);
    return text === null ? json({ error: 'Alteração muito grande' }, 413) : mutate(env, text);
  }
  if (path === '/v2/sync/pull' && request.method === 'GET') {
    const cursor = Number(url.searchParams.get('cursor') || 0);
    if (!Number.isSafeInteger(cursor) || cursor < 0) return json({ error: 'Cursor inválido' }, 400);
    return revisionPage(env, cursor);
  }
  const revisions = path.match(/^\/v2\/memories\/([a-f0-9-]{36})\/revisions$/);
  if (revisions && request.method === 'GET') return history(env, revisions[1]);
  if (path === '/v1/devices') {
    const text = request.method === 'POST' ? await limitedBody(request, 2048) : '';
    return text === null
      ? json({ error: 'Pedido muito grande' }, 413)
      : devices(request, env, text);
  }
  const revoke = path.match(/^\/v1\/devices\/([a-f0-9-]{36})$/);
  if (revoke && request.method === 'DELETE') {
    await env.DB.prepare('UPDATE capture_devices SET revoked_at=? WHERE id=?')
      .bind(new Date().toISOString(), revoke[1])
      .run();
    return json({ ok: true });
  }
  if (path === '/v1/sync/push' && request.method === 'POST') {
    const text = await limitedBody(request, 1048576);
    if (text === null) return json({ error: 'Lote muito grande' }, 413);
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return json({ error: 'JSON inválido' }, 400);
    }
    const parsed = Push.safeParse(body);
    if (!parsed.success) return json({ error: 'Lote inválido' }, 400);
    const statements = parsed.data.operations.map(({ operationId, memory: m }) =>
      env.DB.prepare(
        'INSERT INTO memories(id,operation_id,title,body,tags,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT DO NOTHING',
      ).bind(m.id, operationId, m.title, m.body, JSON.stringify(m.tags), m.createdAt),
    );
    // Insert-only records preserve the first accepted memory; retries cannot overwrite it.
    await env.DB.batch(statements);
    // ORM queries share the versioned schema; native batch writes retain D1's atomic retry semantics.
    const accepted = await findReceipts(
      env.DB,
      parsed.data.operations.map((op) => op.memory.id),
    );
    const receipts = new Map(accepted.map((row) => [row.id, row.operationId]));
    const acknowledged = parsed.data.operations
      .filter((op) => receipts.get(op.memory.id) === op.operationId)
      .map((op) => op.operationId);
    return json({ acknowledged });
  }
  if (
    ['/v1/memories', '/v1/sync/pull', '/v1/sync/bootstrap'].includes(path) &&
    request.method === 'GET'
  ) {
    // Bootstrap always starts at zero; keep /v1/memories for already deployed clients.
    const cursor = path === '/v1/sync/bootstrap' ? 0 : Number(url.searchParams.get('cursor') || 0);
    if (!Number.isSafeInteger(cursor) || cursor < 0) return json({ error: 'Cursor inválido' }, 400);
    const rows = await env.DB.prepare(
      'SELECT rowid AS sequence,* FROM memories WHERE rowid>? ORDER BY rowid LIMIT 100',
    )
      .bind(cursor)
      .all<{
        sequence: number;
        id: string;
        title: string;
        body: string;
        tags: string;
        created_at: string;
      }>();
    return json({
      memories: rows.results.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        tags: JSON.parse(r.tags),
        createdAt: r.created_at,
      })),
      cursor: rows.results.at(-1)?.sequence || cursor,
      hasMore: rows.results.length === 100,
    });
  }
  if (path.startsWith('/v1/') || path.startsWith('/v2/'))
    return json({ error: 'Rota não encontrada' }, 404);
  if (request.method !== 'GET' && request.method !== 'HEAD')
    return json({ error: 'Método inválido' }, 405);
  const asset = assets[path] || (path.includes('.') ? null : assets['/index.html']);
  return asset
    ? new Response(request.method === 'HEAD' ? null : asset.body, {
        headers: {
          'Content-Type': asset.type,
          ...(asset === assets['/index.html'] ? { 'X-Jardim-Shell': '1' } : {}),
        },
      })
    : new Response('Não encontrado', { status: 404 });
}
export async function limitedBody(request: Request, limit: number) {
  const reader = request.body?.getReader();
  if (!reader) return '';
  let length = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const joined = new Uint8Array(length);
  let offset = 0;
  for (const c of chunks) {
    joined.set(c, offset);
    offset += c.length;
  }
  return new TextDecoder().decode(joined);
}
export default {
  async fetch(request: Request, env: Env) {
    let response: Response;
    try {
      response = await handle(request, env);
    } catch {
      console.error(
        JSON.stringify({ event: 'request_failed', path: new URL(request.url).pathname }),
      );
      response = json({ error: 'Não foi possível concluir. Tente novamente.' }, 500);
    }
    const result = new Response(response.body, response);
    result.headers.set('Cache-Control', 'no-store');
    result.headers.set('X-Content-Type-Options', 'nosniff');
    result.headers.set('Referrer-Policy', 'same-origin');
    result.headers.set('X-Frame-Options', 'DENY');
    result.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    );
    return result;
  },
} satisfies ExportedHandler<Env>;
