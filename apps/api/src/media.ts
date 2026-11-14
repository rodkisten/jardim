import { z, mediaTypes } from '@rodkisten/jardim-contracts';
const MAX = 12 * 1024 * 1024;
const allowed = new Set<string>(mediaTypes);
function hex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (v) => v.toString(16).padStart(2, '0')).join('');
}
export async function media(request: Request, env: Env, id: string) {
  if (!z.uuid().safeParse(id).success) return new Response('ID inválido', { status: 400 });
  if (request.method === 'PUT') {
    const type = (request.headers.get('Content-Type') || '').split(';')[0].toLowerCase();
    const duration = request.headers.has('X-Media-Duration')
      ? Number(request.headers.get('X-Media-Duration'))
      : undefined;
    if (duration !== undefined && (!Number.isFinite(duration) || duration <= 0 || duration > 86400))
      return Response.json({ error: 'Duração inválida' }, { status: 400 });
    if (!allowed.has(type))
      return Response.json({ error: 'Formato não permitido' }, { status: 415 });
    if (Number(request.headers.get('Content-Length') || 0) > MAX)
      return Response.json({ error: 'Limite de 12 MiB por arquivo' }, { status: 413 });
    const reader = request.body?.getReader();
    if (!reader) return new Response('Arquivo vazio', { status: 400 });
    let size = 0;
    const chunks: Uint8Array[] = [];
    // Both advertised and actual sizes are bounded; neither chunked uploads nor false headers bypass the limit.
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX) {
        await reader.cancel();
        return new Response('Arquivo muito grande', { status: 413 });
      }
      chunks.push(value);
    }
    if (!size) return new Response('Arquivo vazio', { status: 400 });
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const digest = hex(await crypto.subtle.digest('SHA-256', bytes));
    // Conditional put protects an immutable artifact ID when two retries arrive concurrently.
    const existing = await env.MEDIA.head(id);
    if (existing)
      return existing.customMetadata?.sha256 === digest &&
        existing.httpMetadata?.contentType === type
        ? Response.json({ id, size, type })
        : new Response('ID de arquivo já utilizado', { status: 409 });
    const stored = await env.MEDIA.put(id, bytes, {
      onlyIf: { etagDoesNotMatch: '*' },
      httpMetadata: { contentType: type },
      customMetadata: { sha256: digest, ...(duration ? { duration: String(duration) } : {}) },
    });
    if (!stored) {
      const winner = await env.MEDIA.head(id);
      return winner?.customMetadata?.sha256 === digest
        ? Response.json({ id, size, type })
        : new Response('Arquivo conflitante', { status: 409 });
    }
    return Response.json({ id, size, type }, { status: 201 });
  }
  if (request.method === 'GET' || request.method === 'HEAD') {
    const head = await env.MEDIA.head(id);
    if (!head) return new Response('Não encontrado', { status: 404 });
    const headers = new Headers({
      'Content-Type': head.httpMetadata?.contentType || 'application/octet-stream',
      'Accept-Ranges': 'bytes',
      ETag: head.httpEtag,
    });
    // Recorder WebM may omit duration. Preserve the bounded recording hint without altering original bytes.
    const duration = Number(head.customMetadata?.duration);
    if (Number.isFinite(duration) && duration > 0 && duration <= 86400)
      headers.set('X-Media-Duration', String(duration));
    // Explicit single-range handling supports Safari's media probes without buffering the original.
    const range = request.headers.get('range');
    let start = 0,
      end = head.size - 1;
    if (range) {
      const match = range.match(/^bytes=(\d*)-(\d*)$/);
      if (!match || (!match[1] && !match[2]))
        return new Response(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${head.size}` },
        });
      if (!match[1]) start = Math.max(0, head.size - Number(match[2]));
      else {
        start = Number(match[1]);
        if (match[2]) end = Math.min(end, Number(match[2]));
      }
      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start < 0 ||
        start > end ||
        start >= head.size
      )
        return new Response(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${head.size}` },
        });
      headers.set('Content-Range', `bytes ${start}-${end}/${head.size}`);
    }
    headers.set('Content-Length', String(end - start + 1));
    if (request.method === 'HEAD')
      return new Response(null, { headers, status: range ? 206 : 200 });
    const object = await env.MEDIA.get(
      id,
      range ? { range: { offset: start, length: end - start + 1 } } : undefined,
    );
    return new Response(object?.body || null, { status: range ? 206 : 200, headers });
  }
  return new Response('Método inválido', { status: 405 });
}
