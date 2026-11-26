import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DeviceList, DeviceToken } from '@rodkisten/jardim-contracts';
import { Button, Input, Card, CardContent } from '@rodkisten/girassol/react';
async function request(path: string, init?: RequestInit) {
  const response = await fetch(path, init);
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? 'Entre novamente para gerenciar dispositivos.'
        : 'Não foi possível concluir a operação.',
    );
  return response;
}
export function Devices() {
  const client = useQueryClient(),
    [name, setName] = useState(''),
    [token, setToken] = useState(''),
    [confirm, setConfirm] = useState<string | null>(null),
    [message, setMessage] = useState('');
  const query = useQuery({
    queryKey: ['devices'],
    queryFn: async () => DeviceList.parse(await (await request('/v1/devices')).json()).devices,
    retry: false,
  });
  const create = useMutation({
    mutationFn: async () =>
      DeviceToken.parse(
        await (
          await request('/v1/devices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.trim() }),
          })
        ).json(),
      ),
    onSuccess: (result) => {
      setToken(result.token);
      setName('');
      void client.invalidateQueries({ queryKey: ['devices'] });
    },
  });
  const revoke = useMutation({
    mutationFn: async (id: string) => {
      await request('/v1/devices/' + encodeURIComponent(id), { method: 'DELETE' });
    },
    onSuccess: () => {
      setConfirm(null);
      void client.invalidateQueries({ queryKey: ['devices'] });
    },
  });
  const busy = create.isPending || revoke.isPending;
  return (
    <Card>
      <CardContent className="space-y-3">
        <h2 className="font-semibold">Dispositivos de captura</h2>
        <a className="text-sm text-primary underline" href="/downloads/jardim-youtube.user.js">
          Instalar Jardim · YouTube
        </a>
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy && name.trim()) {
              setToken('');
              create.mutate();
            }
          }}
        >
          <Input
            aria-label="Nome do dispositivo"
            required
            maxLength={80}
            placeholder="Safari do iPhone"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" disabled={busy || !name.trim()}>
            Criar token
          </Button>
        </form>
        {token && (
          <div className="space-y-2">
            <p className="text-sm">
              Copie o token para o userscript. Ele não será exibido novamente.
            </p>
            <textarea
              readOnly
              aria-label="Token de captura"
              className="w-full rounded border border-border bg-background p-2"
              value={token}
            />
            <Button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(token);
                  setMessage('Token copiado.');
                } catch {
                  setMessage('Selecione e copie o token manualmente.');
                }
              }}
            >
              Copiar
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setToken('');
                setMessage('');
              }}
            >
              Ocultar
            </Button>
          </div>
        )}
        {message && <p role="status">{message}</p>}
        {[query.error, create.error, revoke.error].filter(Boolean).map((error, i) => (
          <p key={i} role="alert" className="text-sm">
            {error?.message}
          </p>
        ))}
        {query.isPending ? (
          <p>Carregando…</p>
        ) : (
          query.data?.map((device) => (
            <div key={device.id} className="space-y-2 border-t border-border pt-3">
              <p>{device.name}</p>
              <p className="text-xs text-muted-foreground">
                {device.revokedAt ? 'Revogado' : 'Ativo'} ·{' '}
                {new Date(device.createdAt).toLocaleDateString('pt-BR')}
              </p>
              {!device.revokedAt &&
                (confirm === device.id ? (
                  <div className="flex gap-2">
                    <Button disabled={busy} onClick={() => revoke.mutate(device.id)}>
                      Confirmar revogação
                    </Button>
                    <Button variant="ghost" onClick={() => setConfirm(null)}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" disabled={busy} onClick={() => setConfirm(device.id)}>
                    Revogar acesso
                  </Button>
                ))}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
