import { importSpotify } from './spotify-history';

const MAX_ENTRY = 64 * 1024 * 1024;
const MAX_TOTAL = 2 * 1024 * 1024 * 1024;
const read = async (file: Blob, start: number, length: number) => {
  if (start < 0 || length < 0 || start + length > file.size) throw Error('ZIP truncado.');
  return new DataView(await file.slice(start, start + length).arrayBuffer());
};

export async function importSpotifyArchive(file: File, progress: (message: string) => void, signal?: AbortSignal) {
  const tailStart = Math.max(0, file.size - 65557);
  const tail = await read(file, tailStart, file.size - tailStart);
  let end = tail.byteLength - 22;
  while (end >= 0 && (tail.getUint32(end, true) !== 0x06054b50 || end + 22 + tail.getUint16(end + 20, true) !== tail.byteLength)) end--;
  if (end < 0 || tail.getUint16(end + 4, true) || tail.getUint16(end + 6, true)) throw Error('ZIP inválido ou multidisco.');
  const count = tail.getUint16(end + 10, true);
  let cursor = tail.getUint32(end + 16, true);
  const centralEnd = cursor + tail.getUint32(end + 12, true);
  if (count === 65535 || centralEnd > tailStart + end) throw Error('ZIP64 não suportado.');
  let total = 0, added = 0, duplicates = 0, skipped = 0, matched = 0;
  for (let index = 0; index < count; index++) {
    signal?.throwIfAborted();
    const header = await read(file, cursor, 46);
    if (header.getUint32(0, true) !== 0x02014b50) throw Error('Diretório ZIP inválido.');
    const flags = header.getUint16(8, true), method = header.getUint16(10, true);
    const compressed = header.getUint32(20, true), size = header.getUint32(24, true);
    const nameLength = header.getUint16(28, true), offset = header.getUint32(42, true);
    const name = new TextDecoder().decode(await file.slice(cursor + 46, cursor + 46 + nameLength).arrayBuffer());
    cursor += 46 + nameLength + header.getUint16(30, true) + header.getUint16(32, true);
    if (cursor > centralEnd) throw Error('Diretório ZIP truncado.');
    if (!/(?:^|\/)(?:Streaming_History_Audio|StreamingHistory(?:_music)?)[^/]*\.json$/i.test(name)) continue;
    matched++;
    total += size;
    if (size > MAX_ENTRY || compressed > MAX_ENTRY || total > MAX_TOTAL || flags & 1 || ![0, 8].includes(method)) throw Error('Entrada ZIP excede os limites ou usa formato não suportado.');
    const local = await read(file, offset, 30);
    if (local.getUint32(0, true) !== 0x04034b50) throw Error('Entrada ZIP inválida.');
    const start = offset + 30 + local.getUint16(26, true) + local.getUint16(28, true);
    if (start + compressed > centralEnd) throw Error('Entrada ZIP truncada.');
    let stream = file.slice(start, start + compressed).stream();
    if (method === 8) stream = stream.pipeThrough(new DecompressionStream('deflate-raw'));
    const reader = stream.getReader();
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let length = 0, json = '';
    try {
      while (true) {
        signal?.throwIfAborted();
        const chunk = await reader.read();
        if (chunk.done) break;
        length += chunk.value.byteLength;
        if (length > size || length > MAX_ENTRY) throw Error('Tamanho descompactado inválido.');
        json += decoder.decode(chunk.value, { stream: true });
      }
      json += decoder.decode();
    } finally {
      await reader.cancel();
      reader.releaseLock();
    }
    if (length !== size) throw Error('Entrada ZIP incompleta.');
    const rows: unknown = JSON.parse(json);
    if (!Array.isArray(rows)) throw Error('Histórico JSON inválido.');
    for (let i = 0; i < rows.length; i += 500) {
      signal?.throwIfAborted();
      const result = await importSpotify(rows.slice(i, i + 500));
      added += result.added;
      duplicates += result.duplicates;
      skipped += result.skipped;
      progress(`Arquivo ${index + 1}/${count} · ${Math.min(i + 500, rows.length)}/${rows.length} · ${added} novas escutas`);
    }
  }
  if (!matched) throw Error('Nenhum histórico de áudio Spotify encontrado no ZIP.');
  return { added, duplicates, skipped };
}
