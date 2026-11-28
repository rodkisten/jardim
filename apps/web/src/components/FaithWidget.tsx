import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Cross } from 'lucide-react';
import { getFaith } from '../utils/faith-cache';
export function FaithWidget({ date }: { date: string }) {
  const query = useQuery({
    queryKey: ['faith', date],
    queryFn: ({ signal }) => getFaith(date, signal),
    staleTime: 3600000,
  });
  return (
    <Link
      to="/faith"
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
    >
      <Cross className="size-6 text-primary" />
      <div>
        <h2 className="jardim-editorial text-xl">Liturgia diária</h2>
        <p className="text-xs text-muted-foreground">
          {query.isPending
            ? 'Carregando…'
            : query.isError
              ? 'Liturgia indisponível. Abrir Santuário.'
              : query.data?.readings.status === 'available'
                ? 'Leituras do dia disponíveis'
                : 'Abrir Santuário'}
        </p>
      </div>
    </Link>
  );
}
