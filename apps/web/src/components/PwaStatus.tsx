import { hasUpdateBlockers } from '../utils/update-guard';
import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { Button } from '@rodkisten/girassol/react';
export function PwaStatus() {
  const [offline, setOffline] = useState(!navigator.onLine),
    [ready, setReady] = useState(false),
    [update, setUpdate] = useState(false),
    [error, setError] = useState(false);
  const [apply, setApply] = useState<((reload?: boolean) => Promise<void>) | null>(null);
  useEffect(() => {
    const online = () => setOffline(!navigator.onLine);
    window.addEventListener('online', online);
    window.addEventListener('offline', online);
    if ('serviceWorker' in navigator) {
      const fn = registerSW({
        immediate: true,
        onOfflineReady() {
          setReady(true);
        },
        onNeedRefresh() {
          setUpdate(true);
        },
        onRegisterError() {
          setError(true);
        },
      });
      setApply(() => fn);
    }
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', online);
    };
  }, []);
  if (!offline && !ready && !update && !error) return null;
  return (
    <aside
      role="status"
      className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-2 text-xs"
    >
      <span>
        {offline
          ? 'Offline · alterações locais'
          : update
            ? 'Nova versão disponível'
            : error
              ? 'Não foi possível preparar acesso offline'
              : 'Jardim disponível offline'}
      </span>
      {update ? (
        <Button
          size="sm"
          onClick={() => {
            if (hasUpdateBlockers()) {
              window.alert('Aguarde o rascunho ser salvo antes de atualizar.');
              return;
            }
            if (window.confirm('Atualizar agora? Seus rascunhos persistidos serão preservados.'))
              void apply?.(true);
          }}
        >
          Atualizar
        </Button>
      ) : (
        !offline && (
          <button
            onClick={() => {
              setReady(false);
              setError(false);
            }}
          >
            Fechar
          </button>
        )
      )}
    </aside>
  );
}
