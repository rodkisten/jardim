/** Bound third-party responses and their full download lifetime. Never log tokens or private payloads. */
export async function externalJson(
  url: string,
  init: RequestInit = {},
  fetcher: typeof fetch = fetch,
) {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetcher(url, { ...init, signal: controller.signal });
    if (!response.ok) throw Error(`Serviço externo indisponível (${response.status}).`);
    const reader = response.body?.getReader();
    if (!reader) throw Error('Resposta vazia.');
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 512 * 1024) {
        await reader.cancel();
        throw Error('Resposta externa muito grande.');
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } finally {
    clearTimeout(timer);
  }
}
