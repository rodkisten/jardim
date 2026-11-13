import { youtubeVideo } from '@rodkisten/jardim-capture';
declare function GM_getValue<T>(key: string, fallback: T): T;
declare function GM_setValue(key: string, value: unknown): void;
declare function GM_listValues(): string[];
declare function GM_deleteValue(key: string): void;
declare function GM_registerMenuCommand(name: string, callback: () => void): void;
declare function GM_xmlhttpRequest(input: {
  method: string;
  url: string;
  headers: Record<string, string>;
  data: string;
  timeout: number;
  onload: (response: { status: number; responseText: string }) => void;
  onerror: () => void;
  ontimeout: () => void;
}): void;
type Capture = { id: string; title: string; url: string; observedAt: string };
const endpoint = 'https://jardim.migos.club/v1/events/batch';
let sending = false;
let retryAt = 0;
let attempts = 0;
let lastPage = '';
function queue(): Capture[] {
  return GM_listValues()
    .filter((key) => key.startsWith('jardim.event.'))
    .map((key) => GM_getValue<Capture>(key, null!))
    .filter(Boolean)
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt));
}
function status(message: string) {
  GM_setValue('jardim.status', message);
}
GM_registerMenuCommand('Jardim · conectar dispositivo', () => {
  const token = prompt('Crie um dispositivo no Jardim e cole o token de captura aqui:');
  if (token === null) return;
  if (!/^[a-f0-9]{64}$/.test(token.trim())) {
    alert('Token inválido.');
    return;
  }
  GM_setValue('jardim.token', token.trim());
  GM_setValue('jardim.enabled', true);
  retryAt = 0;
  observe();
  void flush();
});
GM_registerMenuCommand('Jardim · ativar/pausar captura', () => {
  const enabled = !GM_getValue('jardim.enabled', false);
  GM_setValue('jardim.enabled', enabled);
  alert(
    enabled
      ? 'Captura ativada apenas para vídeos abertos no YouTube.'
      : 'Captura pausada. A fila foi preservada.',
  );
  if (enabled) {
    observe();
    void flush();
  }
});
GM_registerMenuCommand('Jardim · fila e reenviar', () => {
  alert(`${queue().length} vídeo(s) na fila. ${GM_getValue('jardim.status', '')}`);
  retryAt = 0;
  void flush();
});
function observe() {
  if (!GM_getValue('jardim.enabled', false)) return;
  const video = youtubeVideo(location.href);
  if (!video) {
    lastPage = '';
    return;
  }
  // SPA navigation is observed, never the global browser history or hidden account requests.
  if (lastPage === video.id) return;
  const items = queue();
  if (items.length >= 1000) {
    status('Fila cheia; conecte para sincronizar.');
    return;
  }
  const title =
    (document.querySelector('h1')?.textContent || document.title)
      .replace(/\s*- YouTube$/, '')
      .trim()
      .slice(0, 160) || 'Vídeo do YouTube';
  const event: Capture = {
    id: crypto.randomUUID(),
    title,
    url: video.url,
    observedAt: new Date().toISOString(),
  };
  // Persist before sending. Closing the page must not lose or renumber an unacknowledged event.
  GM_setValue('jardim.event.' + event.id, event);
  lastPage = video.id;
  void flush();
}
async function flush() {
  if (sending || Date.now() < retryAt || !GM_getValue('jardim.enabled', false)) return;
  const token = GM_getValue('jardim.token', '');
  if (!token || !queue().length) return;
  sending = true;
  try {
    while (queue().length && GM_getValue('jardim.enabled', false)) {
      const batch = queue().slice(0, 25);
      const response = await new Promise<{ status: number; responseText: string }>(
        (resolve, reject) =>
          GM_xmlhttpRequest({
            method: 'POST',
            url: endpoint,
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            data: JSON.stringify({ events: batch }),
            timeout: 20000,
            onload: resolve,
            onerror: () => reject(Error('Sem conexão')),
            ontimeout: () => reject(Error('Tempo esgotado')),
          }),
      );
      if (response.status !== 200)
        throw Error(
          response.status === 401
            ? 'Reconecte o dispositivo. A fila continua salva.'
            : `Servidor: ${response.status}`,
        );
      const result = JSON.parse(response.responseText) as { acknowledged: unknown };
      const ids = new Set(batch.map((event) => event.id));
      if (
        !Array.isArray(result.acknowledged) ||
        result.acknowledged.length !== batch.length ||
        new Set(result.acknowledged).size !== batch.length ||
        result.acknowledged.some((id) => !ids.has(id))
      )
        throw Error('Confirmação inválida.');
      const accepted = new Set(result.acknowledged);
      // Each event has its own immutable key so concurrent tabs cannot overwrite each other's queue.
      for (const id of accepted) GM_deleteValue('jardim.event.' + id);
    }
    attempts = 0;
    retryAt = 0;
    status('Tudo sincronizado.');
  } catch (error) {
    attempts++;
    retryAt =
      Date.now() +
      Math.min(300000, 1000 * 2 ** Math.min(attempts, 9)) * (0.8 + Math.random() * 0.4);
    status(error instanceof Error ? error.message : 'Falha ao enviar.');
  } finally {
    sending = false;
  }
}
window.addEventListener('online', () => void flush());
document.addEventListener('yt-navigate-finish', () => setTimeout(observe, 1000));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    observe();
    void flush();
  }
});
setInterval(() => {
  observe();
  void flush();
}, 30000);
setTimeout(observe, 1500);
void flush();
