/** Keep time and memory bounded for a complete protocol response, including its body. */
export async function fetchProtocol(
  input: RequestInfo | URL,
  init?: RequestInit,
  fetcher: typeof fetch = fetch,
  timeoutMs = 20_000,
  maxBytes = 12 * 1024 * 1024,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(input, { ...init, signal: controller.signal });
    const reader = response.body?.getReader();
    if (!reader) return response;
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      // A normal page is at most 100 validated memories. Reject an oversized response before buffering it.
      if (length > maxBytes) {
        await reader.cancel();
        throw new Error('Resposta de sincronização excede o limite permitido.');
      }
      chunks.push(value);
    }
    const body = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new Response(body, { status: response.status, headers: response.headers });
  } finally {
    clearTimeout(timeout);
  }
}
