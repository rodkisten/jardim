import { DeviceList, DeviceToken } from '@rodkisten/jardim-contracts';
import { createSignal } from 'solid-js';
type Device = { id: string; name: string; createdAt: string; revokedAt: string | null };
export function Devices() {
  const [items, setItems] = createSignal<Device[]>([]);
  const [token, setToken] = createSignal('');
  const [message, setMessage] = createSignal('');
  const [busy, setBusy] = createSignal(false);
  async function load() {
    try {
      const res = await fetch('/v1/devices');
      if (!res.ok) throw Error('Entre novamente para gerenciar dispositivos.');
      setItems(DeviceList.parse(await res.json()).devices);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao carregar.');
    }
  }
  async function create(event: SubmitEvent) {
    event.preventDefault();
    if (busy()) return;
    setBusy(true);
    setMessage('');
    setToken('');
    const form = event.currentTarget as HTMLFormElement;
    try {
      const res = await fetch('/v1/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: String(new FormData(form).get('name')) }),
      });
      if (!res.ok)
        throw Error(
          'Falha ao criar dispositivo. Entre novamente ou revogue um dispositivo antigo.',
        );
      const result = DeviceToken.parse(await res.json());
      setToken(result.token);
      form.reset();
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao conectar.');
    } finally {
      setBusy(false);
    }
  }
  async function revoke(id: string) {
    if (busy()) return;
    setBusy(true);
    setMessage('');
    try {
      const res = await fetch(`/v1/devices/${id}`, { method: 'DELETE' });
      if (!res.ok) throw Error('Não foi possível revogar.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao revogar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <details
      class="composer"
      onToggle={(e) => {
        if (e.currentTarget.open) void load();
      }}
    >
      <summary>Dispositivos e captura do YouTube</summary>
      <p>
        Instale o capturador no Tampermonkey. A captura começa quando você conectar o dispositivo e
        pode ser pausada pelo menu do userscript.
      </p>
      <a href="/downloads/jardim-youtube.user.js">Instalar Jardim · YouTube</a>
      <form onSubmit={create}>
        <label for="device-name">Nome do dispositivo</label>
        <input
          id="device-name"
          name="name"
          required
          maxlength={80}
          placeholder="Safari do iPhone"
        />
        <button disabled={busy()} class="primary">
          Criar token de captura
        </button>
      </form>
      {token() ? (
        <div role="status">
          <p>
            Copie o token agora e cole no menu “Jardim · conectar dispositivo” do userscript. Ele
            permite somente enviar vídeos observados.
          </p>
          <textarea readonly aria-label="Token de captura" value={token()} />
          <button class="subtle" onClick={() => setToken('')}>
            Ocultar token
          </button>
        </div>
      ) : null}
      {message() ? <p role="alert">{message()}</p> : null}
      <ul>
        {items().map((device) => (
          <li>
            {device.name} ·{' '}
            {device.revokedAt ? (
              'Revogado'
            ) : (
              <button disabled={busy()} onClick={() => void revoke(device.id)}>
                Revogar acesso
              </button>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
