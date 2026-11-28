import { externalJson } from './external';
export async function discovery(url: URL): Promise<Response> {
  const query = (url.searchParams.get('q') ?? '').trim();
  const cities = url.pathname === '/v2/discovery/cities';
  if (query.length < (cities ? 3 : 2) || query.length > 100)
    return Response.json({ error: 'Consulta inválida' }, { status: 400 });
  const upstream = cities
    ? new URL('https://geocoding-api.open-meteo.com/v1/search')
    : new URL('https://openlibrary.org/search.json');
  upstream.search = new URLSearchParams(
    cities
      ? { name: query, count: '8', language: 'pt', format: 'json' }
      : { q: query, limit: '12', fields: 'key,title,author_name,first_publish_year,cover_i' },
  ).toString();
  try {
    return Response.json(
      await externalJson(upstream.toString(), {
        redirect: 'error',
        headers: { Accept: 'application/json' },
      }),
    );
  } catch {
    return Response.json({ error: 'Provider indisponível' }, { status: 502 });
  }
}
