import { useInsightSettings, updateInsights } from '../hooks/useInsightSettings';
import { LayoutEditToggle } from '../components/LayoutEditToggle';
import { InsightSettingsPanel } from '../components/InsightSettingsPanel';
import { ModuleSettings } from '../components/ModuleSettings';
import { OfflineSettings } from '../components/OfflineSettings';
import { ThemePicker } from '../components/ThemePicker';
import { Button, Card, CardContent } from '@rodkisten/girassol/react';
import { Devices } from '../components/Devices';
import { Link } from '@tanstack/react-router';
export function SettingsPage() {
  const settings = useInsightSettings();
  return (
    <section className="space-y-4">
      <Card>
        <CardContent className="space-y-3">
          <h2 className="font-semibold">Layout Studio</h2>
          <p className="text-sm text-muted-foreground">
            Ative a edição compartilhada entre Home e Insights. A ordem é salva ao soltar.
          </p>
          <LayoutEditToggle />
          <div className="flex flex-wrap gap-3 text-sm">
            <Link to="/" className="text-primary">
              Home
            </Link>
            <Link to="/insights" className="text-primary">
              Insights
            </Link>
          </div>
        </CardContent>
      </Card>
      <ModuleSettings />
      <InsightSettingsPanel />
      <Card>
        <CardContent className="space-y-3">
          <h2 className="font-semibold">Sentio · Sentimentos</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.sentioAutomatic} onChange={event => updateInsights({ ...settings, sentioAutomatic: event.target.checked })} />
            Analisar automaticamente neste dispositivo
          </label>
          <p className="text-xs text-muted-foreground">Análise lexical local, sem envio de notas. Sugestões não são sentimentos confirmados.</p>
        </CardContent>
      </Card>
      <ThemePicker />
      <OfflineSettings />
      <Card>
        <CardContent className="space-y-3">
          <h2 className="font-semibold">Conta</h2>
          <p className="text-sm text-muted-foreground">
            A sessão é gerenciada pelo servidor. Sair não apaga as memórias armazenadas neste
            dispositivo.
          </p>
          <form method="post" action="/auth/logout">
            <Button type="submit" variant="outline">
              Sair da conta
            </Button>
          </form>
        </CardContent>
      </Card>
      <Devices />
      <Card>
        <CardContent>
          <Link to="/integrations" className="text-primary">
            Integrações externas
          </Link>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3">
          <h2 className="font-semibold">Dados e sincronização</h2>
          <Link to="/vault" className="block text-primary">
            Cofre e backup criptografado
          </Link>
          <Link className="text-sm text-primary underline" to="/conflicts">
            Revisar conflitos
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}
