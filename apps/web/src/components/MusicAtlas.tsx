import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button, Input } from '@rodkisten/girassol/react';
import { atlasDB, savePeriod, type AtlasPeriod } from '../utils/music-atlas';
export function MusicAtlas({
  enabled,
  onEnabled,
}: {
  enabled: boolean;
  onEnabled: (value: boolean) => void;
}) {
  const periods = useLiveQuery(() => atlasDB.periods.orderBy('from').toArray(), []);
  const [name, setName] = useState(''),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [zone, setZone] = useState(''),
    [lat, setLat] = useState(''),
    [lon, setLon] = useState(''),
    [editing, setEditing] = useState(''),
    [status, setStatus] = useState(''),
    [busy, setBusy] = useState(false);
  function edit(p: AtlasPeriod) {
    setEditing(p.id);
    setName(p.name);
    setFrom(p.from.slice(0, 16));
    setTo(p.to.slice(0, 16));
    setZone(p.timezone);
    setLat(p.latitude === undefined ? '' : String(p.latitude));
    setLon(p.longitude === undefined ? '' : String(p.longitude));
  }
  function reset() {
    setEditing('');
    setName('');
    setFrom('');
    setTo('');
    setZone('');
    setLat('');
    setLon('');
  }
  async function save() {
    setBusy(true);
    try {
      await savePeriod({
        id: editing || crypto.randomUUID(),
        name: name.trim(),
        from: from + ':00Z',
        to: to + ':00Z',
        timezone: zone.trim(),
        latitude: lat ? Number(lat) : undefined,
        longitude: lon ? Number(lon) : undefined,
      });
      reset();
      setStatus('Período salvo localmente.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Falha ao salvar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-3 border-t border-border pt-4">
      <h3 className="jardim-editorial text-xl">Atlas · Lugares e períodos</h3>
      <p className="text-xs text-muted-foreground">
        Histórico informado por você. Nenhum rastreamento ou consulta externa. Os limites são UTC,
        início inclusivo e fim exclusivo.
      </p>
      <label className="flex gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={(e) => onEnabled(e.target.checked)} />
        Aplicar fusos históricos nesta sessão
      </label>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Input
          required
          maxLength={100}
          aria-label="Lugar"
          placeholder="Cidade ou lugar"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm">
            Início UTC
            <Input
              required
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Fim UTC
            <Input
              required
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
        <Input
          required
          aria-label="Fuso IANA"
          placeholder="America/Sao_Paulo"
          value={zone}
          onChange={(e) => setZone(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            aria-label="Latitude opcional"
            placeholder="Latitude (opcional)"
            type="number"
            step="any"
            min={-90}
            max={90}
            value={lat}
            onChange={(e) => setLat(e.target.value)}
          />
          <Input
            aria-label="Longitude opcional"
            placeholder="Longitude (opcional)"
            type="number"
            step="any"
            min={-180}
            max={180}
            value={lon}
            onChange={(e) => setLon(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={busy}>
          {editing ? 'Atualizar' : 'Adicionar período'}
        </Button>
        {editing && (
          <Button type="button" variant="ghost" onClick={reset}>
            Cancelar edição
          </Button>
        )}
      </form>
      {status && (
        <p role="status" className="text-xs">
          {status}
        </p>
      )}
      {periods?.map((p) => (
        <article key={p.id} className="rounded-lg border border-border p-3 space-y-1">
          <strong className="text-sm">{p.name}</strong>
          <p className="text-xs text-muted-foreground">
            {p.from.slice(0, 16)}Z até {p.to.slice(0, 16)}Z · {p.timezone}
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={() => edit(p)}>
            Editar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              void atlasDB.periods.delete(p.id).catch(() => setStatus('Falha ao excluir.'));
            }}
          >
            Excluir
          </Button>
        </article>
      ))}
    </section>
  );
}
