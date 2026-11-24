import { ThemePicker } from "../components/ThemePicker";
import { Button, Card, CardContent } from "@rodkisten/girassol/react";
import { Devices } from "../components/Devices";
import { Link } from "@tanstack/react-router";
export function SettingsPage(){
  return <section className="space-y-4"><h1 className="text-2xl font-semibold">Configurações</h1><ThemePicker/><Card><CardContent className="space-y-3"><h2 className="font-semibold">Conta</h2><p className="text-sm text-muted-foreground">A sessão é gerenciada pelo servidor. Sair não apaga as memórias armazenadas neste dispositivo.</p><form method="post" action="/auth/logout"><Button type="submit" variant="outline">Sair da conta</Button></form></CardContent></Card><Devices/><Card><CardContent><Link to="/integrations" className="text-primary">Integrações externas</Link></CardContent></Card><Card><CardContent className="space-y-3"><h2 className="font-semibold">Dados e sincronização</h2><Link className="text-sm text-primary underline" to="/conflicts">Revisar conflitos</Link></CardContent></Card></section>;
}
