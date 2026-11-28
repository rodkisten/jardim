import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { integrationRequest } from '../utils/integrations';
export function OracleUsage() {
  const query = useQuery({
    queryKey: ['oracle', 'usage'],
    queryFn: async () =>
      z
        .object({
          day: z.string(),
          used: z.number().int().nonnegative(),
          limit: z.number().int().positive(),
        })
        .parse(await integrationRequest('/v2/oracle/usage')),
    refetchInterval: 30000,
    retry: false,
  });
  const data = query.data;
  return (
    <section className="space-y-2 rounded-xl border border-border p-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Consumo diário</h3>
        <button type="button" className="text-xs underline" onClick={() => void query.refetch()}>
          Atualizar
        </button>
      </div>
      {query.isPending ? (
        <p className="text-sm">Consultando…</p>
      ) : query.isError ? (
        <p role="alert" className="text-sm">
          Consumo indisponível.
        </p>
      ) : (
        data && (
          <>
            <p className="text-2xl tabular-nums">
              {data.used} / {data.limit}
            </p>
            <progress
              className="w-full accent-primary"
              value={Math.min(data.used, data.limit)}
              max={data.limit}
              aria-label="Solicitações utilizadas"
            />
            <p className="text-xs text-muted-foreground">
              {Math.max(0, data.limit - data.used)} restantes · Renova à meia-noite UTC. Tentativas
              canceladas também contam.
            </p>
          </>
        )
      )}
      <p className="text-xs text-muted-foreground">
        Contagem de solicitações, não custo financeiro. Não inclui Lectio.
      </p>
    </section>
  );
}
