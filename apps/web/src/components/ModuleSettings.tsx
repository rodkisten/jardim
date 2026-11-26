import { useState } from 'react';
import { Switch } from './ui/switch';
import { modules, widgets, useModules, setModule, setWidget } from '../hooks/useModules';
export function ModuleSettings() {
  const preferences = useModules();
  const [error, setError] = useState('');
  function change(action: () => void) { try { action(); setError(''); } catch { setError('Não foi possível salvar neste dispositivo.'); } }
  return <section className="space-y-4">
    <div className="jardim-section-hero" data-tone="interior"><p className="jardim-eyebrow">Central de controle</p><h1 className="jardim-editorial text-3xl">Seu Jardim, suas regras.</h1><p className="text-sm text-muted-foreground">Personalize os módulos e a página inicial. Desativar não apaga registros.</p></div>
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4"><h2 className="jardim-editorial text-xl">Dimensões</h2>{modules.map(m => <label key={m.id} className="flex items-center justify-between gap-3"><span><span className="block text-sm font-medium">{m.label}</span><span className="block text-xs text-muted-foreground">{m.description}</span></span><Switch checked={preferences.modules[m.id]} onCheckedChange={v => change(() => setModule(m.id,v))} /></label>)}</div>
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4"><h2 className="jardim-editorial text-xl">Widgets da home</h2>{widgets.map(w => <label key={w.id} className="flex items-center justify-between gap-3"><span className="text-sm">{w.label}</span><Switch checked={preferences.widgets[w.id]} onCheckedChange={v => change(() => setWidget(w.id,v))} /></label>)}</div>
    {error && <p role="alert">{error}</p>}
    <p className="text-xs text-muted-foreground">Preferências deste dispositivo. Rich Cards, humor e controles de sincronização privada serão adicionados quando estiverem disponíveis.</p>
  </section>;
}
