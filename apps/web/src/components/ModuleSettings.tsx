import { OracleUsage } from './OracleUsage';
import { DashboardSettings } from './DashboardSettings';
import { useState } from 'react';
import { Switch } from './ui/switch';
import { modules, useModules, setModule, providers, setProvider, setRichCards, setOracle, setOracleAstro } from '../hooks/useModules';
export function ModuleSettings() {
  const preferences = useModules();
  const [error, setError] = useState('');
  function change(action: () => void) { try { action(); setError(''); } catch { setError('Não foi possível salvar neste dispositivo.'); } }
  return <section className="space-y-4">
    <div className="jardim-section-hero" data-tone="interior"><p className="jardim-eyebrow">Central de controle</p><h1 className="jardim-editorial text-3xl">Seu Jardim, suas regras.</h1><p className="text-sm text-muted-foreground">Personalize os módulos e a página inicial. Desativar não apaga registros.</p></div>
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4"><h2 className="jardim-editorial text-xl">Dimensões</h2>{modules.map(m => <label key={m.id} className="flex items-center justify-between gap-3"><span><span className="block text-sm font-medium">{m.label}</span><span className="block text-xs text-muted-foreground">{m.description}</span></span><Switch checked={preferences.modules[m.id]} onCheckedChange={v => change(() => setModule(m.id,v))} /></label>)}</div>
    <DashboardSettings />{preferences.oracle&&<OracleUsage />}<div className="rounded-2xl border border-border bg-card p-4 space-y-4"><h2 className="jardim-editorial text-xl">Oráculo · IA</h2><p className="text-xs text-muted-foreground">Workers AI. Cada solicitação exige consentimento. Estas preferências controlam o Oráculo, não o Lectio existente.</p><label className="flex items-center justify-between">Habilitar Oráculo<Switch checked={preferences.oracle} onCheckedChange={v=>change(()=>setOracle(v))}/></label><label className="flex items-center justify-between">Reflexões do Astro<Switch disabled={!preferences.oracle} checked={preferences.oracleAstro} onCheckedChange={v=>change(()=>setOracleAstro(v))}/></label></div>
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4"><h2 className="jardim-editorial text-xl">Rich Cards</h2><label className="flex items-center justify-between"><span>Pré-visualizações automáticas</span><Switch checked={preferences.richCards} onCheckedChange={v => change(() => setRichCards(v))} /></label>{providers.map(p => <label key={p} className="flex items-center justify-between"><span>{p}</span><Switch disabled={!preferences.richCards} checked={preferences.providers[p]} onCheckedChange={v => change(() => setProvider(p,v))} /></label>)}</div>
    {error && <p role="alert">{error}</p>}
    <p className="text-xs text-muted-foreground">Preferências deste dispositivo. Registros de humor são locais; sincronização privada ainda não disponível.</p>
  </section>;
}
