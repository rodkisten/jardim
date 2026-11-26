import { isPreview } from '../utils/preview';
import { Link } from '@tanstack/react-router';
import { RefreshCw } from 'lucide-react';
import { Button, cn } from '@rodkisten/girassol/react';
import { useSync } from '../hooks/useSync';
export function SyncStatus() {
  const { status, pending, conflicts, busy, syncNow } = useSync();
  if (isPreview)
    return (
      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="size-2 rounded-full bg-primary" />
        Preview · memórias neste dispositivo
      </div>
    );
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span role="status">
        {status}
        {pending > 0 ? ' · ' + pending + ' pendente(s)' : ''}
      </span>
      {conflicts > 0 && (
        <Link className="text-primary underline" to="/conflicts">
          {conflicts} conflito(s)
        </Link>
      )}
      <Button
        className="ml-auto"
        variant="ghost"
        size="icon"
        disabled={busy}
        aria-label="Sincronizar agora"
        onClick={syncNow}
      >
        <RefreshCw className={cn('size-4', busy && 'animate-spin')} />
      </Button>
    </div>
  );
}
