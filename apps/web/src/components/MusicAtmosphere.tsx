import { useState } from 'react';
import { Button, Input } from '@rodkisten/girassol/react';
import {
  loadAtmosphere,
  clearAtmosphere,
  type AtmosphereSnapshot,
} from '../utils/music-atmosphere';
export function MusicAtmosphere({
  onApply,
}: {
  onApply: (snapshot: AtmosphereSnapshot | null) => void;
}) {
  const [lat, setLat] = useState(''),
    [lon, setLon] = useState(''),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState('');
  async function load() {
    setBusy(true);
    setStatus('');
    onApply(null);
    try {
      const snapshot = await loadAtmosphere(Number(lat), Number(lon), from, to);
      onApply(snapshot);
      setStatus(
        Object.keys(snapshot.hours).length +
          ' horas consultadas · contexto aplicado somente nesta sessão.',
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Falha na consulta.');
    } finally {
      setBusy(false);
      setConsent(false);
    }
  }
  return (
    <section className="space-y-3 border-t border-border pt-4">
      <h3 className="jardim-editorial text-xl">Atmosfera</h3>
      <p className="text-xs text-muted-foreground">
        Escolha um período UTC em que você esteve no mesmo local. Open-Meteo fornece estimativas
        históricas, não observações pessoais.
      </p>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (consent && !busy) void load();
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm">
            Latitude
            <Input
              required
              type="number"
              step="any"
              min={-90}
              max={90}
              value={lat}
              onChange={(e) => setLat(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Longitude
            <Input
              required
              type="number"
              step="any"
              min={-180}
              max={180}
              value={lon}
              onChange={(e) => setLon(e.target.value)}
            />
          </label>
          <label className="text-sm">
            De (UTC)
            <Input required type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="text-sm">
            Até (UTC)
            <Input required type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <label className="flex items-start gap-2 text-xs">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          Confirmo o local durante este período e autorizo enviar coordenadas arredondadas a 0,1
          grau e datas ao Open-Meteo. O serviço recebe também os dados normais da conexão. Nenhuma
          música ou humor é enviado.
        </label>
        <Button type="submit" disabled={!consent || busy || !lat || !lon || !from || !to}>
          {busy ? 'Consultando…' : 'Consultar e cruzar clima'}
        </Button>
      </form>
      {status && (
        <p role="status" className="text-xs">
          {status}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => {
            onApply(null);
            setStatus('Cruzamento removido.');
          }}
        >
          Remover cruzamento
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => {
            onApply(null);
            void clearAtmosphere()
              .then(() => setStatus('Cache apagado.'))
              .catch(() => setStatus('Falha ao apagar cache.'));
          }}
        >
          Apagar cache
        </Button>
      </div>
      <a
        className="text-xs text-primary"
        href="https://open-meteo.com/"
        target="_blank"
        rel="noreferrer"
      >
        Dados meteorológicos: Open-Meteo
      </a>
    </section>
  );
}
